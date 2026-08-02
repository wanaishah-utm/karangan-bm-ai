// Builds and downloads a Microsoft Word (.docx) version of a saved report,
// using the `docx` library to create the document and `file-saver` to save it.
//
// This runs in the BROWSER (it's called from a "use client" component on a
// button click), so Packer.toBlob + saveAs work directly.
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ExternalHyperlink,
} from "docx";
import { saveAs } from "file-saver";

import type { SavedReport, SectionKey } from "@/types";
import { SECTION_LABELS } from "@/types";

// The fixed display order of the six 5W1H sections.
const SECTION_ORDER: SectionKey[] = [
  "siapa",
  "apa",
  "bila",
  "di_mana",
  "mengapa",
  "bagaimana",
];

// Font sizes in docx are measured in HALF-points, so 20 = 10pt (our "small").
const SMALL = 20;

// Format an ISO date string into a friendly Malay date (guarding bad values).
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ms-MY", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

// Turn a report name into a safe filename by removing characters that are
// illegal in Windows/macOS filenames (\ / : * ? " < > |) and tidying spaces.
function slugifyFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]/g, "") // drop illegal filename characters
    .replace(/\s+/g, "-") // spaces -> dashes
    .replace(/-+/g, "-"); // collapse repeated dashes
  return cleaned === "" ? "laporan" : cleaned;
}

export async function exportToDocx(report: SavedReport): Promise<void> {
  // We collect every paragraph of the document into this array in order.
  const children: Paragraph[] = [];

  // --- Title + meta ---
  children.push(new Paragraph({ text: report.name, heading: HeadingLevel.HEADING_1 }));
  children.push(
    new Paragraph({ children: [new TextRun({ text: `Tajuk: ${report.topic}` })] }),
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Tarikh: ${formatDate(report.createdAt)}` })],
    }),
  );
  children.push(new Paragraph({ text: "" })); // blank spacer

  // --- Sections ---
  for (const key of SECTION_ORDER) {
    const cards = report.sections[key] ?? [];
    if (cards.length === 0) continue; // skip empty sections

    children.push(
      new Paragraph({ text: SECTION_LABELS[key], heading: HeadingLevel.HEADING_2 }),
    );

    cards.forEach((card, index) => {
      // The fact itself, numbered manually so each section restarts at 1.
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${index + 1}. ${card.fact}`, bold: true })],
        }),
      );
      // Statistic — smaller, italic sub-paragraph.
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Statistik: ${card.statistic}`,
              italics: true,
              size: SMALL,
            }),
          ],
        }),
      );
      // Current case — smaller, italic sub-paragraph.
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Isu semasa: ${card.currentCase}`,
              italics: true,
              size: SMALL,
            }),
          ],
        }),
      );
      // Source line, with the source name as a real clickable hyperlink.
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Sumber: ", italics: true, size: SMALL }),
            new ExternalHyperlink({
              link: card.url,
              children: [
                new TextRun({
                  text: `${card.source} (${card.year ?? "Tiada tahun"})`,
                  style: "Hyperlink", // docx's built-in blue underlined link style
                  size: SMALL,
                }),
              ],
            }),
          ],
        }),
      );
      children.push(new Paragraph({ text: "" })); // spacer between facts
    });
  }

  // --- Verification note ---
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Sila sahkan maklumat dengan sumber asal sebelum digunakan.",
          italics: true,
        }),
      ],
    }),
  );

  // Assemble the document with a single section holding all our paragraphs.
  const doc = new Document({ sections: [{ children }] });

  // Convert to a Blob (browser-friendly) and trigger the download.
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slugifyFilename(report.name)}.docx`);
}
