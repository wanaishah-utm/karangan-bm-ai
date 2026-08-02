// Browser-side helper for calling our own /api/research route.
//
// Components should use this instead of calling fetch() directly — it keeps the
// request/response shape in one place and throws a readable Bahasa Melayu error
// when something goes wrong.
import type { FactCard, SectionKey } from "@/types";

export async function fetchSection(
  topic: string,
  section: SectionKey,
  count: number,
  existingFacts: string[],
): Promise<FactCard[]> {
  let res: Response;
  try {
    res = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, section, count, existingFacts }),
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

  const data = (await res.json()) as { cards?: FactCard[] };
  return data.cards ?? [];
}
