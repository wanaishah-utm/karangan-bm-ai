// Builds and downloads a Microsoft Word (.docx) version of a saved report,
// using the `docx` library to create the document and `file-saver` to save it.
//
// The report is rendered as a 5-column table (Aspek / Fakta / Statistik /
// Contoh Kes Terkini / Sumber) on a LANDSCAPE page, with an emerald header row
// and a hero header at the top — matching the on-screen and printed design.
//
// This runs in the BROWSER (called from a "use client" component on click), so
// Packer.toBlob + saveAs work directly.
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ExternalHyperlink,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  PageOrientation,
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

// Colours as hex strings (docx wants hex without the leading '#').
const EMERALD = "059669"; // our emerald primary
const WHITE = "FFFFFF";

// A thin black border used on every table edge.
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "000000" } as const;
const TABLE_BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
  insideHorizontal: BORDER,
  insideVertical: BORDER,
};

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

// A plain body cell containing one line of text.
function textCell(text: string): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.TOP,
    children: [new Paragraph({ children: [new TextRun({ text })] })],
  });
}

export async function exportToDocx(report: SavedReport): Promise<void> {
  // Everything on the page, in order (paragraphs + the table).
  const children: (Paragraph | Table)[] = [];

  // --- Hero header (mirrors the website hero) ---
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "BM AI Assistant", bold: true, size: 44 })],
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Jana ", bold: true, size: 40 }),
        // The "Karangan" badge: white text on an emerald run background.
        new TextRun({
          text: " Karangan ",
          bold: true,
          size: 40,
          color: WHITE,
          shading: { type: ShadingType.CLEAR, color: "auto", fill: EMERALD },
        }),
      ],
    }),
  );
  children.push(new Paragraph({ text: "" })); // spacer

  // --- Report name / topic / date ---
  children.push(
    new Paragraph({ text: report.name, heading: HeadingLevel.HEADING_1 }),
  );
  children.push(
    new Paragraph({ children: [new TextRun({ text: `Tajuk: ${report.topic}` })] }),
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Tarikh: ${formatDate(report.createdAt)}` })],
    }),
  );
  children.push(new Paragraph({ text: "" })); // spacer

  // --- Build the table rows ---
  // Header row: emerald background, white bold text. tableHeader:true repeats it
  // at the top of each page.
  const headerRow = new TableRow({
    tableHeader: true,
    children: ["Aspek", "Fakta", "Statistik", "Contoh Kes Terkini", "Sumber"].map(
      (label) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, color: "auto", fill: EMERALD },
          children: [
            new Paragraph({
              children: [new TextRun({ text: label, bold: true, color: WHITE })],
            }),
          ],
        }),
    ),
  });

  const rows: TableRow[] = [headerRow];

  for (const key of SECTION_ORDER) {
    const cards = report.sections[key] ?? [];
    if (cards.length === 0) continue; // skip empty sections

    cards.forEach((card, i) => {
      const cells: TableCell[] = [];

      // The Aspek label appears once per section, spanning that section's rows.
      if (i === 0) {
        cells.push(
          new TableCell({
            rowSpan: cards.length,
            verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                children: [new TextRun({ text: SECTION_LABELS[key], bold: true })],
              }),
            ],
          }),
        );
      }

      cells.push(textCell(card.fact));
      cells.push(textCell(card.statistic));
      cells.push(textCell(card.currentCase));

      // Source cell: a working hyperlink on the source name, plus the year.
      cells.push(
        new TableCell({
          verticalAlign: VerticalAlign.TOP,
          children: [
            new Paragraph({
              children: [
                new ExternalHyperlink({
                  link: card.url,
                  children: [
                    new TextRun({ text: card.source, style: "Hyperlink" }),
                  ],
                }),
                new TextRun({ text: ` (${card.year ?? "Tiada tahun"})` }),
              ],
            }),
          ],
        }),
      );

      rows.push(new TableRow({ children: cells }));
    });
  }

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    // Column width hints (in twips) tuned for a landscape A4 page.
    columnWidths: [1500, 4800, 3400, 3400, 2400],
    rows,
  });
  children.push(table);

  // --- Verification note ---
  children.push(new Paragraph({ text: "" }));
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

  // Assemble the document — a single LANDSCAPE section holding everything.
  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE } },
        },
        children,
      },
    ],
  });

  // Convert to a Blob (browser-friendly) and trigger the download.
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slugifyFilename(report.name)}.docx`);
}
