"use client";

// Shows one saved report: an editable name, its topic + date, then every 5W1H
// section (in order) that has cards, listed as clean numbered facts. Includes
// rename / duplicate / delete actions (delete asks for confirmation first).
import { useState } from "react";
import { Pencil, Copy, Trash2 } from "lucide-react";

import type { SavedReport, SectionKey } from "@/types";
import { SECTION_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportButtons } from "@/components/report/export-buttons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The fixed display order of the six 5W1H sections.
const SECTION_ORDER: SectionKey[] = [
  "siapa",
  "apa",
  "bila",
  "di_mana",
  "mengapa",
  "bagaimana",
];

interface ReportViewProps {
  report: SavedReport;
  onRename?: (id: string, name: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ReportView({
  report,
  onRename,
  onDuplicate,
  onDelete,
}: ReportViewProps) {
  // Inline name editing.
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(report.name);
  // Delete confirmation dialog open/closed.
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Enter edit mode with the current name pre-filled.
  function startEditing() {
    setDraftName(report.name);
    setEditing(true);
  }

  // Save the edited name (on Enter or blur). Ignore blank / unchanged names.
  function commitName() {
    setEditing(false);
    const trimmed = draftName.trim();
    if (trimmed === "" || trimmed === report.name) {
      setDraftName(report.name); // revert
      return;
    }
    onRename?.(report.id, trimmed);
  }

  // Format the ISO createdAt into a friendly Malay date, guarding bad values.
  const created = new Date(report.createdAt);
  const formattedDate = Number.isNaN(created.getTime())
    ? report.createdAt
    : new Intl.DateTimeFormat("ms-MY", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(created);

  // Only the sections that actually contain cards.
  const filledSections = SECTION_ORDER.filter(
    (key) => (report.sections[key]?.length ?? 0) > 0,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Editable name + meta line */}
      <div className="flex flex-col gap-1">
        {editing ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setDraftName(report.name);
                setEditing(false);
              }
            }}
            className="h-10 max-w-md text-lg font-semibold"
          />
        ) : (
          <h2
            className="cursor-text font-heading text-2xl font-semibold hover:opacity-80"
            title="Klik untuk menyunting nama"
            onClick={startEditing}
          >
            {report.name}
          </h2>
        )}
        <p className="text-sm text-muted-foreground">
          Tajuk: {report.topic} · Dicipta pada {formattedDate}
        </p>
      </div>

      {/* Action row (hidden when printing) */}
      <div className="no-print flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={startEditing}>
          <Pencil />
          Namakan semula
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDuplicate?.(report.id)}
        >
          <Copy />
          Salin
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 />
          Padam
        </Button>
      </div>

      {/* The 5W1H sections (empty ones are skipped entirely) */}
      <div className="flex flex-col gap-6">
        {filledSections.map((key) => (
          <section key={key} className="flex flex-col gap-3">
            <h3 className="font-heading text-lg font-semibold">
              {SECTION_LABELS[key]}
            </h3>
            <ol className="flex list-decimal flex-col gap-4 pl-5">
              {report.sections[key].map((card) => (
                <li key={card.id} className="pl-1">
                  <p className="font-medium">{card.fact}</p>
                  <p className="text-sm">{card.statistic}</p>
                  <p className="text-sm text-muted-foreground">{card.currentCase}</p>
                  <p className="text-xs text-muted-foreground">
                    Sumber:{" "}
                    <a
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {card.source}
                    </a>{" "}
                    ({card.year ?? "Tiada tahun"})
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      {/* Export controls: print / PDF / DOCX / copy (hidden when printing) */}
      <ExportButtons report={report} />

      {/* Reminder to double-check facts before use */}
      <p className="text-xs text-muted-foreground">
        Sila sahkan maklumat dengan sumber asal sebelum digunakan.
      </p>

      {/* Delete confirmation dialog (controlled by `confirmOpen`) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        {/* No default X close (which has an English label) — the "Batal" button
            below is our clearly-labelled Bahasa Melayu cancel control. */}
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Padam laporan?</DialogTitle>
            <DialogDescription>
              Adakah anda pasti mahu memadam &ldquo;{report.name}&rdquo;? Tindakan
              ini tidak boleh dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                onDelete?.(report.id);
              }}
            >
              Padam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
