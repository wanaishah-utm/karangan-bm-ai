// POST /api/research
// Server-side route handler. It talks to OpenAI (with web search) to research
// ONE 5W1H section of a topic, validates the result, and returns clean cards.
//
// This runs ONLY on the server, so the OPENAI_API_KEY never reaches the browser.
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import type { FactCard, FactScope } from "@/types";
import { factCardSchema } from "@/lib/ai/schema";
import { buildSectionPrompt } from "@/lib/ai/prompt";
import { dedupeCards } from "@/lib/fact-dedup";
import { clientIp, extractJsonArray, isRateLimited } from "@/lib/ai/route-helpers";

// AI research can take a while (web search + generation), so allow up to 60s.
export const maxDuration = 60;

// The model name lives in ONE place so it's easy to change later.
const MODEL = "gpt-4.1-mini";

// How many cards to request if the caller doesn't say.
const DEFAULT_COUNT = 8;

// Validate the incoming request body. All the six 5W1H keys are allowed.
const bodySchema = z.object({
  topic: z.string().min(1, "Tajuk tidak boleh kosong."),
  section: z.enum(["siapa", "apa", "bila", "di_mana", "mengapa", "bagaimana"]),
  count: z.number().int().positive().max(20).optional(),
  existingFacts: z.array(z.string()).optional(),
  // Results filter: "dalam" / "luar" restrict the search; "semua" = no filter.
  scope: z.enum(["semua", "dalam", "luar"]).optional(),
});

// Turn the AI's scope tag into "dalam" / "luar". If it's missing or unclear,
// fall back to the link: Malaysian (.my) sites count as dalam negara.
function resolveScope(aiScope: string | undefined, url: string): FactScope {
  const tag = (aiScope ?? "").toLowerCase();
  if (tag.includes("dalam")) return "dalam";
  if (tag.includes("luar")) return "luar";
  try {
    return new URL(url).hostname.endsWith(".my") ? "dalam" : "luar";
  } catch {
    return "luar";
  }
}

export async function POST(request: Request) {
  // 0) Best-effort rate limit (see lib/ai/route-helpers.ts).
  if (isRateLimited(clientIp(request))) {
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
  const scope = parsed.data.scope ?? "semua";

  // 2) Ask the AI (with web search) for this section's cards.
  try {
    // `new OpenAI()` automatically reads OPENAI_API_KEY from the environment.
    const client = new OpenAI();
    const prompt = buildSectionPrompt(topic, section, count, existingFacts, scope);

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
        const { scope: aiScope, ...rest } = result.data;
        const cardScope = resolveScope(aiScope, rest.url);
        // With a filter on, drop any card the AI placed in the wrong scope.
        if (scope !== "semua" && cardScope !== scope) continue;
        cards.push({ id: crypto.randomUUID(), ...rest, scope: cardScope });
      }
      // If a card fails validation we simply skip it.
    }

    // 5) Remove duplicate / near-duplicate facts (the model sometimes pads the
    //    list by repeating a fact). Returning fewer, distinct cards is fine.
    const { kept, dropped } = dedupeCards(cards);
    if (dropped > 0) {
      console.log(
        `[/api/research] ${section}: membuang ${dropped} kad pendua (${kept.length} kekal).`,
      );
    }

    return NextResponse.json({ cards: kept });
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
