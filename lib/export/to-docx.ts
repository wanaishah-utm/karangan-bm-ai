// Builds and downloads a Microsoft Word (.docx) version of a saved report,
// using the `docx` library to create the document and `file-saver` to save it.
//
// The layout mirrors the PRINTED report (see the print styles in globals.css):
//   • "Karangan BM AI Assistant" small and grey in the top-right corner of
//     every page (the page header)
//   • the report name, a "Tajuk · Tarikh" line and a rule beneath them
//   • for each 5W1H aspect, a coloured title bar (white text, "N Fakta" at the
//     right), then that aspect's facts as white boxes with a grey outline, each
//     ending in a "Sumber: name (url) · year" line at the bottom-right
//   • "Cadangan Peribahasa" in a gold bar, when the teacher ticked it for export
//   • the "Sila sahkan…" reminder at the end
// No Dalam/Luar negara labels, no big "Jana Karangan" heading — same as print.
//
// This runs in the BROWSER (called from a "use client" component on click), so
// Packer.toBlob + saveAs work directly.
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Header,
  Packer,
  Paragraph,
  ShadingType,
  TabStopType,
  TextRun,
  convertMillimetersToTwip,
} from "docx";
import { saveAs } from "file-saver";

import type { SavedReport, SectionKey } from "@/types";
import { SECTION_LABELS } from "@/types";
import { ASPECT_COLORS, BRAND_GOLD, BRAND_INK } from "@/lib/aspect-colors";

// The fixed display order of the six 5W1H sections.
const SECTION_ORDER: SectionKey[] = [
  "siapa",
  "apa",
  "bila",
  "di_mana",
  "mengapa",
  "bagaimana",
];

const WHITE = "FFFFFF";
const GREY = "666666";
const OUTLINE = "999999"; // the fact boxes' outline, as on paper

// A4 portrait with the print stylesheet's 1.2cm margins.
const PAGE_WIDTH = convertMillimetersToTwip(210);
const PAGE_HEIGHT = convertMillimetersToTwip(297);
const MARGIN = convertMillimetersToTwip(12);
const TEXT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
// Boxes and bars sit slightly in from the margins so their borders show.
const INSET = 120;

// docx wants hex colours without the leading '#'.
function hex(color: string): string {
  return color.replace("#", "").toUpperCase();
}

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
  const children: Paragraph[] = [];

  // --- Report name, topic/date line, and a rule beneath them ---
  children.push(
    new Paragraph({
      children: [new TextRun({ text: report.name, bold: true, size: 40 })],
      spacing: { after: 60 },
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Tajuk: ${report.topic} · Tarikh: ${formatDate(report.createdAt)}`,
          color: GREY,
          size: 20,
        }),
      ],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 10 },
      },
      spacing: { after: 240 },
    }),
  );

  // --- One coloured block per aspect ---
  for (const key of SECTION_ORDER) {
    const cards = report.sections[key] ?? [];
    if (cards.length === 0) continue; // skip empty aspects

    const color = hex(ASPECT_COLORS[key]);

    // The coloured title bar: the aspect name, and "N Fakta" pushed to the
    // right edge by a right-aligned tab stop.
    children.push(
      new Paragraph({
        shading: { type: ShadingType.CLEAR, color: "auto", fill: color },
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color, space: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 4 },
          left: { style: BorderStyle.SINGLE, size: 6, color, space: 6 },
          right: { style: BorderStyle.SINGLE, size: 6, color, space: 6 },
        },
        tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH - INSET }],
        spacing: { before: 280, after: 120 },
        indent: { left: INSET, right: INSET },
        keepNext: true, // never strand a title at the bottom of a page
        children: [
          new TextRun({ text: SECTION_LABELS[key], bold: true, color: WHITE, size: 24 }),
          new TextRun({ text: `\t${cards.length} Fakta`, bold: true, color: WHITE, size: 16 }),
        ],
      }),
    );

    // Each fact: a white box with a grey outline — the fact text, a thin
    // divider, then the source line. Two paragraphs with different borders
    // draw as one box with a line across it.
    const edge = { style: BorderStyle.SINGLE, size: 6, color: OUTLINE, space: 8 };
    for (const card of cards) {
      children.push(
        new Paragraph({
          border: { top: edge, left: edge, right: edge },
          indent: { left: INSET, right: INSET },
          spacing: { before: 160 },
          keepNext: true, // keep the fact with its source line
          keepLines: true,
          children: [new TextRun({ text: card.fact, size: 21 })],
        }),
      );
      children.push(
        new Paragraph({
          border: { top: edge, left: edge, right: edge, bottom: edge },
          indent: { left: INSET, right: INSET },
          alignment: AlignmentType.RIGHT, // source sits bottom-right, like on paper
          spacing: { after: 40 },
          keepLines: true,
          children: [
            new TextRun({ text: "Sumber: ", size: 16, color: GREY }),
            new ExternalHyperlink({
              link: card.url,
              children: [new TextRun({ text: card.source, size: 16, style: "Hyperlink" })],
            }),
            new TextRun({ text: ` (${card.url})`, size: 13, color: GREY }),
            new TextRun({
              text: ` · ${card.year ?? "Tiada tahun"}`,
              size: 16,
              color: GREY,
            }),
          ],
        }),
      );
    }
  }

  // --- Suggested peribahasa (only when ticked for export) ---
  // A gold bar with dark-brown text, then one outlined box per saying.
  const peribahasa = report.peribahasa ?? [];
  if (peribahasa.length > 0 && (report.printPeribahasa ?? true)) {
    const gold = hex(BRAND_GOLD);
    children.push(
      new Paragraph({
        shading: { type: ShadingType.CLEAR, color: "auto", fill: gold },
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: gold, space: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: gold, space: 4 },
          left: { style: BorderStyle.SINGLE, size: 6, color: gold, space: 6 },
          right: { style: BorderStyle.SINGLE, size: 6, color: gold, space: 6 },
        },
        tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH - INSET }],
        spacing: { before: 280, after: 120 },
        indent: { left: INSET, right: INSET },
        keepNext: true,
        children: [
          new TextRun({ text: "Cadangan Peribahasa", bold: true, color: hex(BRAND_INK), size: 24 }),
          new TextRun({
            text: `\t${peribahasa.length} Peribahasa`,
            bold: true,
            color: hex(BRAND_INK),
            size: 16,
          }),
        ],
      }),
    );

    const edge = { style: BorderStyle.SINGLE, size: 6, color: OUTLINE, space: 8 };
    for (const item of peribahasa) {
      // Saying (top of the box), meaning, then example (bottom of the box).
      children.push(
        new Paragraph({
          border: { top: edge, left: edge, right: edge },
          indent: { left: INSET, right: INSET },
          spacing: { before: 160 },
          keepNext: true,
          children: [new TextRun({ text: `“${item.peribahasa}”`, bold: true, size: 22 })],
        }),
      );
      children.push(
        new Paragraph({
          border: { left: edge, right: edge },
          indent: { left: INSET, right: INSET },
          keepNext: true,
          children: [
            new TextRun({ text: "Maksud: ", bold: true, size: 20 }),
            new TextRun({ text: item.maksud, size: 20 }),
          ],
        }),
      );
      children.push(
        new Paragraph({
          border: { left: edge, right: edge, bottom: edge },
          indent: { left: INSET, right: INSET },
          spacing: { after: 40 },
          children: [
            new TextRun({ text: "Contoh: ", bold: true, size: 20 }),
            new TextRun({ text: item.contoh, italics: true, size: 20, color: GREY }),
          ],
        }),
      );
    }
  }

  // --- Verification note ---
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360 },
      children: [
        new TextRun({
          text: "Sila sahkan maklumat dengan sumber asal sebelum digunakan.",
          italics: true,
          color: GREY,
          size: 18,
        }),
      ],
    }),
  );

  const doc = new Document({
    // A sans-serif like the printout (its Rubik/Poppins web fonts aren't
    // installed with Word, but Calibri comes with every copy of Office).
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: {
              top: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
              right: MARGIN,
              header: convertMillimetersToTwip(5),
            },
          },
        },
        // The app name, small and grey in the top-right corner of every page.
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "Karangan BM AI Assistant",
                    bold: true,
                    size: 16,
                    color: GREY,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  // Convert to a Blob (browser-friendly) and trigger the download.
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slugifyFilename(report.name)}.docx`);
}
