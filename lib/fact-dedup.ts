// Helpers for removing duplicate / near-duplicate fact cards.
//
// The AI sometimes pads a list by repeating the same fact (verbatim or lightly
// reworded). These pure functions catch that. They're used on BOTH ends:
//   - the API route de-dupes each response (see app/api/research/route.ts), and
//   - the client de-dupes "Muat lagi" results against what's already shown.
import type { FactCard } from "@/types";

// Reduce a fact to a comparable form: lowercase, punctuation stripped,
// whitespace collapsed. Two facts that "say the same thing" tend to match here.
export function normalizeFact(fact: string): string {
  return fact
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // strip punctuation (any language)
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

// The set of words in a normalised fact.
function wordSet(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter(Boolean));
}

// How much two facts overlap by words: shared words ÷ the smaller word count.
// 1 means the smaller fact's words are all inside the larger one.
function tokenSimilarity(normA: string, normB: string): number {
  const a = wordSet(normA);
  const b = wordSet(normB);
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

// Two cards are "near duplicates" when they cite the SAME url AND their facts
// are highly similar — one contains the other, or they share most of their words.
function isNearDuplicate(a: FactCard, b: FactCard, normA: string, normB: string): boolean {
  if (!a.url || !b.url || a.url !== b.url) return false;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  return tokenSimilarity(normA, normB) >= 0.8;
}

// De-duplicate a single batch of cards, keeping the first of any duplicate set.
// Returns the kept cards plus how many were dropped (handy for logging).
export function dedupeCards(cards: FactCard[]): {
  kept: FactCard[];
  dropped: number;
} {
  const kept: FactCard[] = [];
  const seen = new Set<string>(); // normalised facts we've already kept
  let dropped = 0;

  for (const card of cards) {
    const norm = normalizeFact(card.fact);
    // Exact match after normalising → duplicate.
    if (seen.has(norm)) {
      dropped += 1;
      continue;
    }
    // Same-source, highly-similar wording → near-duplicate.
    if (kept.some((k) => isNearDuplicate(k, card, normalizeFact(k.fact), norm))) {
      dropped += 1;
      continue;
    }
    kept.push(card);
    seen.add(norm);
  }

  return { kept, dropped };
}

// Keep only the `incoming` cards that don't duplicate anything in `existing`
// (nor each other). Used by "Muat lagi" so nothing repeats even if the model
// ignores the existingFacts hint.
export function dedupeAgainst(
  existing: FactCard[],
  incoming: FactCard[],
): FactCard[] {
  const seen = new Set(existing.map((c) => normalizeFact(c.fact)));
  const result: FactCard[] = [];

  for (const card of incoming) {
    const norm = normalizeFact(card.fact);
    if (seen.has(norm)) continue; // already shown

    const clashesExisting = existing.some((k) =>
      isNearDuplicate(k, card, normalizeFact(k.fact), norm),
    );
    if (clashesExisting) continue;

    const clashesIncoming = result.some((k) =>
      isNearDuplicate(k, card, normalizeFact(k.fact), norm),
    );
    if (clashesIncoming) continue;

    result.push(card);
    seen.add(norm);
  }

  return result;
}
