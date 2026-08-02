// The six 5W1H section keys — used as object keys throughout the app
export type SectionKey = "siapa" | "apa" | "bila" | "di_mana" | "mengapa" | "bagaimana";

// One research finding card (FR3)
export interface FactCard {
  id: string;            // unique id so React and checkboxes can track it
  fact: string;          // the fact, in BM
  statistic: string;     // real number, or "Tiada statistik rasmi ditemui"
  currentCase: string;   // recent issue or case, in BM
  source: string;        // e.g. "SPRM"
  url: string;           // link to verify
  year: number | null;   // publication year (null if unknown)
}

// The full AI research result for one topic
export interface ResearchResult {
  topic: string;
  generatedAt: string;   // ISO date string
  sections: Record<SectionKey, FactCard[]>;
}

// A report saved in localStorage (FR6–FR8)
export interface SavedReport {
  id: string;
  name: string;          // teacher can rename this
  topic: string;
  createdAt: string;
  sections: Record<SectionKey, FactCard[]>; // ONLY the selected facts
}

// BM display labels for each section — UI reads from here
export const SECTION_LABELS: Record<SectionKey, string> = {
  siapa: "Siapa",
  apa: "Apa",
  bila: "Bila",
  di_mana: "Di mana",
  mengapa: "Mengapa",
  bagaimana: "Bagaimana",
};
