// POST /api/peribahasa
// Server-side route handler. Given a report's topic and the facts the teacher
// selected, it asks OpenAI (with web search, to check the wording against
// sources like PRPM DBP) for peribahasa that suit those facts, validates the
// result, and returns clean suggestions.
//
// This runs ONLY on the server, so the OPENAI_API_KEY never reaches the browser.
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import type { Peribahasa } from "@/types";
import { peribahasaSchema } from "@/lib/ai/schema";
import { buildPeribahasaPrompt } from "@/lib/ai/prompt";
import { clientIp, extractJsonArray, isRateLimited } from "@/lib/ai/route-helpers";

// Web search + generation can take a while, so allow up to 60s.
export const maxDuration = 60;

// Same model as /api/research.
const MODEL = "gpt-4.1-mini";

// How many peribahasa to ask for.
const COUNT = 5;

// A report can hold many facts; the first 30 (each trimmed) are plenty of
// context and keep the prompt small.
const MAX_FACTS = 30;
const MAX_FACT_LENGTH = 600;

const bodySchema = z.object({
  topic: z.string().min(1, "Tajuk tidak boleh kosong."),
  facts: z.array(z.string()).min(1),
});

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
      { error: "Permintaan tidak sah. Laporan perlu mempunyai sekurang-kurangnya satu fakta." },
      { status: 400 },
    );
  }

  const topic = parsed.data.topic;
  const facts = parsed.data.facts
    .slice(0, MAX_FACTS)
    .map((f) => f.slice(0, MAX_FACT_LENGTH));

  // 2) Ask the AI (with web search) for suggestions.
  try {
    // `new OpenAI()` automatically reads OPENAI_API_KEY from the environment.
    const client = new OpenAI();
    const response = await client.responses.create({
      model: MODEL,
      tools: [{ type: "web_search" }],
      // Must search at least once, so the wording and meaning get checked
      // against real sources instead of coming from memory alone.
      tool_choice: "required",
      input: buildPeribahasaPrompt(topic, facts, COUNT),
    });
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
        { error: "AI tidak memulangkan senarai peribahasa. Sila cuba lagi." },
        { status: 502 },
      );
    }

    // 4) Validate each item, drop bad ones and repeats of the same saying, and
    //    stamp a unique id onto each good one.
    const seen = new Set<string>();
    const peribahasa: Peribahasa[] = [];
    for (const item of rawArray) {
      const result = peribahasaSchema.safeParse(item);
      if (!result.success) continue;
      const key = result.data.peribahasa.toLowerCase().replace(/[^\p{L}\s]/gu, "").trim();
      if (seen.has(key)) continue;
      seen.add(key);
      peribahasa.push({ id: crypto.randomUUID(), ...result.data });
    }

    return NextResponse.json({ peribahasa: peribahasa.slice(0, COUNT) });
  } catch (error) {
    // Never leak internal details (or the API key) to the client — log on the
    // server only, and send a friendly Bahasa Melayu message back.
    console.error("[/api/peribahasa] Ralat:", error);
    return NextResponse.json(
      { error: "Ralat semasa menghubungi perkhidmatan AI. Sila cuba sebentar lagi." },
      { status: 500 },
    );
  }
}
