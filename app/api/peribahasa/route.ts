// POST /api/peribahasa
// Server-side route handler. Given a report's topic and the facts the teacher
// selected, it returns up to 5 peribahasa that suit those facts — every one a
// real entry in PRPM DBP (see lib/ai/prpm.ts), shown in PRPM's wording with
// PRPM's official meaning. Made-up or translated "peribahasa" (e.g.
// "Membakar jambatan") never get through.
//
// How:
//   1. In parallel, the AI suggests candidate peribahasa, and topic words for
//      searching PRPM by meaning (e.g. "dadah", "mencegah").
//   2. In parallel, each candidate is checked against PRPM (unlisted ones are
//      dropped), and each topic word is searched in PRPM.
//   3. From that pool of real entries, the AI picks the ones whose OFFICIAL
//      meaning suits the essay (preferring well-known sayings) and writes the
//      example sentences in DBP's exact wording.
//
// This runs ONLY on the server, so the OPENAI_API_KEY never reaches the browser.
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import type { Peribahasa } from "@/types";
import { peribahasaPickSchema, peribahasaSchema } from "@/lib/ai/schema";
import {
  buildPeribahasaPickPrompt,
  buildPeribahasaPrompt,
  buildPeribahasaThemePrompt,
} from "@/lib/ai/prompt";
import { clientIp, extractJsonArray, isRateLimited } from "@/lib/ai/route-helpers";
import { checkPeribahasa, searchByTheme, type PrpmEntry, type PrpmResult } from "@/lib/ai/prpm";

// Two quick AI calls plus PRPM lookups; allow up to 60s.
export const maxDuration = 60;

// Same model as /api/research.
const MODEL = "gpt-4.1-mini";

// Candidates to ask the AI for (PRPM rejects some), and how many to return.
const CANDIDATES = 8;
const COUNT = 5;
// The most entries handed to the final pick.
const MAX_POOL = 30;
// PRPM lookups run a few at a time (to be gentle on DBP's server), and give up
// after this long so the whole request stays well within 60s.
const CHECK_CONCURRENCY = 5;
const THEME_CONCURRENCY = 3;
const PRPM_BUDGET_MS = 15_000;

// A report can hold many facts; the first 30 (each trimmed) are plenty of
// context and keep the prompt small.
const MAX_FACTS = 30;
const MAX_FACT_LENGTH = 600;

const bodySchema = z.object({
  topic: z.string().min(1, "Tajuk tidak boleh kosong."),
  facts: z.array(z.string()).min(1),
});

// Run `task` over `items`, `concurrency` at a time, until done or out of time.
// Items not reached in time keep `fallback`.
async function mapWithBudget<T, R>(
  items: T[],
  concurrency: number,
  fallback: R,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = items.map(() => fallback);
  const deadline = Date.now() + PRPM_BUDGET_MS;
  let next = 0;
  async function worker() {
    while (next < items.length && Date.now() < deadline) {
      const i = next++;
      results[i] = await task(items[i]);
    }
  }
  await Promise.race([
    Promise.all(Array.from({ length: concurrency }, worker)),
    new Promise((resolve) => setTimeout(resolve, PRPM_BUDGET_MS)),
  ]);
  return results;
}

// One AI call that should return a JSON array; [] if it doesn't.
async function askForArray(client: OpenAI, input: string): Promise<unknown[]> {
  const response = await client.responses.create({ model: MODEL, input });
  try {
    const parsed = JSON.parse(extractJsonArray(response.output_text ?? ""));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// A key for spotting the same saying twice.
function sayingKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\s]/gu, "").replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  // 0) Best-effort rate limit (see lib/ai/route-helpers.ts).
  if (isRateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Sila cuba semula sebentar lagi." },
      { status: 429 },
    );
  }

  // Read + validate the request body.
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

  try {
    // `new OpenAI()` automatically reads OPENAI_API_KEY from the environment.
    const client = new OpenAI();

    // 1) Candidate peribahasa + topic words, in parallel.
    const [rawCandidates, rawThemes] = await Promise.all([
      askForArray(client, buildPeribahasaPrompt(topic, facts, CANDIDATES)),
      askForArray(client, buildPeribahasaThemePrompt(topic, facts)),
    ]);
    const candidates = rawCandidates.flatMap((item) => {
      const result = peribahasaSchema.safeParse(item);
      return result.success ? [result.data] : [];
    });
    const themes = [
      ...new Set(
        rawThemes.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase()),
      ),
    ]
      .filter(Boolean)
      .slice(0, 6);

    // 2) Check the candidates and search the themes in PRPM, in parallel.
    const [checks, themeResults] = await Promise.all([
      mapWithBudget<string, PrpmResult>(
        candidates.map((c) => c.peribahasa),
        CHECK_CONCURRENCY,
        { status: "unavailable" },
        checkPeribahasa,
      ),
      mapWithBudget<string, PrpmEntry[] | null>(themes, THEME_CONCURRENCY, null, (t) =>
        searchByTheme(t),
      ),
    ]);

    // PRPM couldn't be reached at all: say so, rather than claiming that no
    // suitable peribahasa exist.
    const prpmAnswered =
      checks.some((c) => c.status !== "unavailable") || themeResults.some((r) => r !== null);
    if (!prpmAnswered) {
      return NextResponse.json(
        { error: "PRPM DBP tidak dapat dihubungi untuk menyemak peribahasa. Sila cuba lagi sebentar lagi." },
        { status: 503 },
      );
    }

    // The pool: confirmed candidates first (they were chosen for this topic),
    // then theme matches — every one a real PRPM entry, each saying once.
    const seen = new Set<string>();
    const pool: (Peribahasa & { fallbackContoh?: string })[] = [];
    const add = (item: Omit<Peribahasa, "id"> & { fallbackContoh?: string }) => {
      const key = sayingKey(item.peribahasa);
      if (!key || seen.has(key) || pool.length >= MAX_POOL) return;
      seen.add(key);
      pool.push({ id: crypto.randomUUID(), ...item });
    };
    candidates.forEach((candidate, i) => {
      const check = checks[i];
      if (check.status === "found" || check.status === "idiom") {
        add({
          peribahasa: check.peribahasa,
          maksud: check.status === "found" && check.maksud ? check.maksud : candidate.maksud,
          contoh: candidate.contoh,
          sumber: check.sumber,
          fallbackContoh: candidate.contoh,
        });
      } else if (check.status === "not_found") {
        console.log(`[/api/peribahasa] Tiada dalam PRPM, digugurkan: "${candidate.peribahasa}"`);
      }
    });
    for (const entries of themeResults) {
      for (const e of entries ?? []) add({ ...e, contoh: "" });
    }
    if (pool.length === 0) return NextResponse.json({ peribahasa: [] });

    // 3) The AI picks the best by official meaning and writes the examples.
    const picks = await askForArray(
      client,
      buildPeribahasaPickPrompt(topic, facts, pool, COUNT),
    ).catch(() => []);
    const chosen: Peribahasa[] = [];
    const used = new Set<number>();
    // One saying per official meaning (DBP often lists several sayings under
    // the very same meaning, e.g. "Nasi sudah menjadi bubur" and "Apa boleh
    // buat, sakit menimpa sesal terlambat").
    const meanings = new Set<string>();
    for (const raw of picks) {
      const pick = peribahasaPickSchema.safeParse(raw);
      if (!pick.success) continue;
      const item = pool[pick.data.index];
      if (!item || used.has(pick.data.index)) continue;
      const meaning = sayingKey(item.maksud);
      if (meaning && meanings.has(meaning)) continue;
      used.add(pick.data.index);
      if (meaning) meanings.add(meaning);
      chosen.push({
        id: item.id,
        peribahasa: item.peribahasa,
        maksud: item.maksud,
        contoh: pick.data.contoh,
        sumber: item.sumber,
      });
      if (chosen.length === COUNT) break;
    }

    // If the pick failed outright, fall back to the confirmed candidates
    // (real PRPM entries chosen for this topic, with the AI's own examples).
    if (chosen.length === 0 && picks.length === 0) {
      return NextResponse.json({
        peribahasa: pool
          .filter((p) => p.fallbackContoh)
          .slice(0, COUNT)
          .map(({ fallbackContoh, ...p }) => ({ ...p, contoh: fallbackContoh ?? p.contoh })),
      });
    }
    return NextResponse.json({ peribahasa: chosen });
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
