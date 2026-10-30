// Browser-side helper for calling our own /api/research route.
//
// Components should use this instead of calling fetch() directly — it keeps the
// request/response shape in one place and throws a readable Bahasa Melayu error
// when something goes wrong.
import type { FactCard, Peribahasa, ScopeFilter, SectionKey } from "@/types";

export async function fetchSection(
  topic: string,
  section: SectionKey,
  count: number,
  existingFacts: string[],
  scope: ScopeFilter = "semua", // "dalam" / "luar" restrict the search
): Promise<FactCard[]> {
  let res: Response;
  try {
    res = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, section, count, existingFacts, scope }),
    });
  } catch {
    // The fetch itself failed (e.g. no network).
    throw new Error("Tiada sambungan internet atau pelayan tidak dapat dihubungi.");
  }

  if (!res.ok) {
    // Try to read the BM error message our API sends; fall back to a generic one.
    let message = "Ralat semasa memuatkan bahagian ini. Sila cuba lagi.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }

  // A short list — or even an empty one — is a VALID result, not an error: the
  // AI may simply have found fewer distinct, verifiable facts. Callers should
  // treat an empty array as "no facts found", not as a failure to toast about.
  const data = (await res.json()) as { cards?: FactCard[] };
  return data.cards ?? [];
}

// Ask /api/peribahasa for peribahasa that suit a report's facts. Throws a
// readable Bahasa Melayu error on failure; an empty list means none were found.
export async function fetchPeribahasa(
  topic: string,
  facts: string[],
): Promise<Peribahasa[]> {
  let res: Response;
  try {
    res = await fetch("/api/peribahasa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, facts }),
    });
  } catch {
    throw new Error("Tiada sambungan internet atau pelayan tidak dapat dihubungi.");
  }

  if (!res.ok) {
    let message = "Ralat semasa menjana cadangan peribahasa. Sila cuba lagi.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { peribahasa?: Peribahasa[] };
  return data.peribahasa ?? [];
}
