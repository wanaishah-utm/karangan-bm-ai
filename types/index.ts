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
  scope?: FactScope;     // "dalam" = about Malaysia, "luar" = other countries /
                         // global. Optional: reports saved before this existed lack it.
}

// Where a fact is set: in Malaysia ("dalam negara") or abroad/global ("luar negara").
export type FactScope = "dalam" | "luar";
// The results filter: everything, or one scope only.
export type ScopeFilter = "semua" | FactScope;

// BM display labels for each scope — results cards, report and exports read from here.
export const SCOPE_LABELS: Record<FactScope, string> = {
  dalam: "Dalam negara",
  luar: "Luar negara",
};

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
  // AI-suggested peribahasa that suit the facts above (generated on request
  // from the report page). Absent until the teacher asks for them.
  peribahasa?: Peribahasa[];
  // Whether the peribahasa go into Cetak / DOCX / Salin / Kongsi. Treated as
  // true when unset, so freshly generated suggestions are included.
  printPeribahasa?: boolean;
}

// One suggested peribahasa for a report.
export interface Peribahasa {
  id: string;
  peribahasa: string; // the saying itself, e.g. "Bagai aur dengan tebing"
  maksud: string;     // its standard meaning, in BM
  contoh: string;     // an example sentence using it, tied to the report's facts
  // Where PRPM DBP lists it, e.g. "Kamus Istimewa Peribahasa Melayu". Absent
  // on suggestions saved before this check existed.
  sumber?: string;
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
