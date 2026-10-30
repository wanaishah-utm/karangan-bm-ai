// Turns a saved report into one plain-text string.
//
// This is the SHARED text format used by the "Salin" (copy to clipboard)
// feature. It's written to look tidy when pasted into WhatsApp or email —
// no markdown, just spacing and simple labels.
import type { SavedReport, SectionKey } from "@/types";
import { SCOPE_LABELS, SECTION_LABELS } from "@/types";

// The fixed display order of the six 5W1H sections.
const SECTION_ORDER: SectionKey[] = [
  "siapa",
  "apa",
  "bila",
  "di_mana",
  "mengapa",
  "bagaimana",
];

// Format an ISO date string into a friendly Malay date (guarding bad values).
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ms-MY", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export function buildReportText(report: SavedReport): string {
  // We build the text line-by-line, then join with newlines at the end.
  const lines: string[] = [];

  // Header block
  lines.push(report.name);
  lines.push(`Tajuk: ${report.topic}`);
  lines.push(`Tarikh: ${formatDate(report.createdAt)}`);
  lines.push(""); // blank line before the sections

  // Each non-empty section, in order.
  for (const key of SECTION_ORDER) {
    const cards = report.sections[key] ?? [];
    if (cards.length === 0) continue; // skip empty sections

    lines.push(SECTION_LABELS[key].toUpperCase()); // e.g. "MENGAPA"

    cards.forEach((card, index) => {
      lines.push(`${index + 1}. ${card.fact}`);
      if (card.scope) lines.push(`   Skop: ${SCOPE_LABELS[card.scope]}`);
      lines.push(
        `   Sumber: ${card.source} (${card.year ?? "Tiada tahun"}) - ${card.url}`,
      );
      lines.push(""); // blank line between facts
    });
  }

  // Suggested peribahasa — only when the teacher left them ticked for export.
  const peribahasa = report.peribahasa ?? [];
  if (peribahasa.length > 0 && (report.printPeribahasa ?? true)) {
    lines.push("CADANGAN PERIBAHASA");
    peribahasa.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.peribahasa}`);
      lines.push(`   Maksud: ${item.maksud}`);
      lines.push(`   Contoh: ${item.contoh}`);
      lines.push("");
    });
  }

  // Closing reminder
  lines.push("Sila sahkan maklumat dengan sumber asal sebelum digunakan.");

  return lines.join("\n");
}
