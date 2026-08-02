// POST /api/research
// Server-side route handler. It talks to OpenAI (with web search) to research
// ONE 5W1H section of a topic, validates the result, and returns clean cards.
//
// This runs ONLY on the server, so the OPENAI_API_KEY never reaches the browser.
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import type { FactCard } from "@/types";
import { factCardSchema } from "@/lib/ai/schema";
import { buildSectionPrompt } from "@/lib/ai/prompt";

// AI research can take a while (web search + generation), so allow up to 60s.
export const maxDuration = 60;

// The model name lives in ONE place so it's easy to change later.
const MODEL = "gpt-4.1-mini";

// How many cards to request if the caller doesn't say.
const DEFAULT_COUNT = 8;

// --- Best-effort in-memory rate limit --------------------------------------
// Allows at most RATE_LIMIT requests per IP within RATE_WINDOW_MS. This is
// intentionally simple: it lives in memory, so it resets when the server
// restarts and is NOT shared across multiple server instances (e.g. serverless).
// It's a light guard against accidental spamming, not a security feature.
const RATE_LIMIT = 20; // max requests
const RATE_WINDOW_MS = 60_000; // per 60 seconds
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Keep only the timestamps still inside the time window.
  const recent = (requestLog.get(ip) ?? []).filter(
    (time) => now - time < RATE_WINDOW_MS,
  );
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

// Validate the incoming request body. All the six 5W1H keys are allowed.
const bodySchema = z.object({
  topic: z.string().min(1, "Tajuk tidak boleh kosong."),
  section: z.enum(["siapa", "apa", "bila", "di_mana", "mengapa", "bagaimana"]),
  count: z.number().int().positive().max(20).optional(),
  existingFacts: z.array(z.string()).optional(),
});

// Pull a clean JSON array out of the model's text output. The model is told to
// return raw JSON, but this guards against stray code fences or prose.
function extractJsonArray(text: string): string {
  let t = text.trim();

  // Strip a ```json ... ``` (or plain ``` ... ```) code fence if present.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();

  // If there's leading/trailing prose, keep only the outermost [ ... ].
  if (!t.startsWith("[")) {
    const start = t.indexOf("[");
    const end = t.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      t = t.slice(start, end + 1);
    }
  }
  return t;
}

export async function POST(request: Request) {
  // 0) Best-effort rate limit. The client IP comes from the x-forwarded-for
  //    header (set by hosting proxies like Vercel); fall back to "unknown".
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Sila cuba semula sebentar lagi." },
      { status: 429 },
    );
  }

  // 1) Read + validate the request body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Permintaan tidak sah: badan JSON tidak dapat dibaca." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Permintaan tidak sah. Sila semak tajuk dan bahagian." },
      { status: 400 },
    );
  }

  const { topic, section } = parsed.data;
  const count = parsed.data.count ?? DEFAULT_COUNT;
  const existingFacts = parsed.data.existingFacts ?? [];

  // 2) Ask the AI (with web search) for this section's cards.
  try {
    // `new OpenAI()` automatically reads OPENAI_API_KEY from the environment.
    const client = new OpenAI();
    const prompt = buildSectionPrompt(topic, section, count, existingFacts);

    const response = await client.responses.create({
      model: MODEL,
      // Turn on the built-in web search tool so the model can look things up.
      tools: [{ type: "web_search" }],
      input: prompt,
    });

    // `output_text` is a convenience getter that joins all text output.
    const text = response.output_text ?? "";

    // 3) Parse the text as a JSON array.
    let rawArray: unknown;
    try {
      rawArray = JSON.parse(extractJsonArray(text));
    } catch {
      return NextResponse.json(
        { error: "AI memulangkan format yang tidak dapat diproses. Sila cuba lagi." },
        { status: 502 },
      );
    }

    if (!Array.isArray(rawArray)) {
      return NextResponse.json(
        { error: "AI tidak memulangkan senarai fakta. Sila cuba lagi." },
        { status: 502 },
      );
    }

    // 4) Validate each card. Drop the bad ones instead of failing everything,
    //    and stamp a unique id onto each good one.
    const cards: FactCard[] = [];
    for (const item of rawArray) {
      const result = factCardSchema.safeParse(item);
      if (result.success) {
        cards.push({ id: crypto.randomUUID(), ...result.data });
      }
      // If a card fails validation we simply skip it.
    }

    return NextResponse.json({ cards });
  } catch (error) {
    // Never leak internal details (or the API key) to the client — log on the
    // server only, and send a friendly Bahasa Melayu message back.
    console.error("[/api/research] Ralat:", error);
    return NextResponse.json(
      { error: "Ralat semasa menghubungi perkhidmatan AI. Sila cuba sebentar lagi." },
      { status: 500 },
    );
  }
}
