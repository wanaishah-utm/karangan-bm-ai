// Zod schemas that validate whatever the AI hands back to us.
//
// Why validate? The AI returns free-form text that we *parse* as JSON. We must
// never trust that blindly — a missing field or a bad URL could crash the UI.
// Zod checks each card's shape at runtime and lets us drop the bad ones.
//
// We validate PER SECTION because the API is called once per 5W1H section
// (see app/api/research/route.ts), so each response is just an array of cards.
import { z } from "zod";

// The shape of a single fact card exactly as the AI should return it.
// NOTE: this matches FactCard from "@/types" MINUS the `id` — the id is added
// by our server after validation, not by the AI.
export const factCardSchema = z.object({
  fact: z.string(), // the fact, in Bahasa Melayu
  statistic: z.string(), // a real figure, or "Tiada statistik rasmi ditemui"
  currentCase: z.string(), // a recent issue/case, in Bahasa Melayu
  source: z.string(), // e.g. "SPRM", "WHO" — kept in its original form
  url: z.url(), // must be a valid URL (zod v4 top-level url validator)
  year: z.number().nullable(), // publication year, or null if unknown
});

// One section's worth of cards is simply an array of the above.
export const sectionCardsSchema = z.array(factCardSchema);

// Handy TypeScript types inferred straight from the schemas.
export type AiFactCard = z.infer<typeof factCardSchema>;
export type AiSectionCards = z.infer<typeof sectionCardsSchema>;
