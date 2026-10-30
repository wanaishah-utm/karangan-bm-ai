"use client";

// Shows one saved report: its name (with a pen icon to rename it inline), its
// topic + date, then every 5W1H aspect that has facts. Each aspect is a coloured
// title bar (blue Siapa, purple Apa, …, the same colours as the results screen)
// with that aspect's facts stacked underneath as tinted boxes, each carrying a
// small "Sumber" line at its bottom-right.
//
// The actions — Cetak / DOCX / Salin / Kongsi / Padam — sit in one centred row
// at the bottom of the report card.
// Padam offers a choice: delete the WHOLE report, or pick individual facts to
// delete (a selection mode with checkboxes on every fact).
import { useState } from "react";
import type { CSSProperties } from "react";
import { Check, ExternalLink, Pencil, Trash2, X } from "lucide-react";

import type { SavedReport, SectionKey } from "@/types";
import { SECTION_LABELS } from "@/types";
import { ASPECT_COLORS, aspectTint } from "@/lib/aspect-colors";
import { ASPECT_ICONS } from "@/lib/aspect-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportButtons } from "@/components/report/export-buttons";
import { ScopeChip } from "@/components/research/scope-chip";
import { PeribahasaSection } from "@/components/report/peribahasa-section";
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
  onDelete?: (id: string) => void;
  // Delete just some facts from the report (by card id).
  onDeleteCards?: (id: string, cardIds: string[]) => void;
  // Change other report fields (the peribahasa suggestions and their toggle).
  onUpdate?: (id: string, patch: Partial<SavedReport>) => void;
}

export function ReportView({
  report,
  onRename,
  onDelete,
  onDeleteCards,
  onUpdate,
}: ReportViewProps) {
  // Inline name editing.
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(report.name);
  // The "Padam" choice dialog (all vs. selection).
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Selection mode for deleting individual facts, and which facts are picked.
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

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

  // --- delete-selection mode ---
  function startSelecting() {
    setConfirmOpen(false);
    setPicked(new Set());
    setSelecting(true);
  }
  function cancelSelecting() {
    setSelecting(false);
    setPicked(new Set());
  }
  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function deletePicked() {
    if (picked.size === 0) return;
    onDeleteCards?.(report.id, [...picked]);
    cancelSelecting();
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
    <div className="report-card flex flex-col gap-6 rounded-[28px] border border-amber-100 bg-card p-6 sm:p-10 dark:border-border">
      {/* PRINT-ONLY app name in the top-right corner of the first page. Later
          pages get the same label from the @page margin box in globals.css. */}
      <div className="print-only print-brand">Karangan BM AI Assistant</div>

      {/* Editable name + meta line */}
      <div className="flex flex-col gap-1 border-b pb-5">
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
          // The name + a pen icon right beside it; the pen (or the name itself)
          // switches to inline editing.
          <div className="flex items-center gap-1.5">
            <h2
              className="cursor-text font-heading text-2xl font-extrabold tracking-tight hover:opacity-80 sm:text-3xl"
              title="Klik untuk menyunting nama"
              onClick={startEditing}
            >
              {report.name}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sunting nama laporan"
              title="Sunting nama"
              onClick={startEditing}
              className="no-print text-muted-foreground hover:text-foreground"
            >
              <Pencil aria-hidden />
            </Button>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Tajuk: {report.topic} · Tarikh: {formattedDate}
        </p>
      </div>

      {/* Selection-mode hint, so it's clear the fact boxes are now tickable. */}
      {selecting && (
        <p className="no-print rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          Pilih fakta yang hendak dipadam, kemudian tekan{" "}
          <span className="font-semibold">Padam dipilih</span>.
        </p>
      )}

      {/* ---- The facts, grouped by aspect ---- */}
      <div className="report-sections flex flex-col gap-6">
        {filledSections.map((key) => {
          const color = ASPECT_COLORS[key];
          const Icon = ASPECT_ICONS[key];
          const count = report.sections[key].length;
          return (
            <section key={key} className="report-aspect flex flex-col gap-2">
              {/* Coloured aspect title bar. The colour is also exposed as a CSS
                  variable so the print stylesheet can keep it on paper. */}
              <h3
                className="report-aspect-head flex items-center gap-2 rounded-xl px-5 py-3 font-heading text-base font-bold text-white"
                style={
                  {
                    backgroundColor: color,
                    "--aspect-color": color,
                  } as CSSProperties
                }
              >
                <Icon className="size-4" aria-hidden />
                {SECTION_LABELS[key]}
                <span className="ml-auto rounded-full bg-black/15 px-3 py-0.5 text-xs font-semibold">
                  {count} Fakta
                </span>
              </h3>

              {/* That aspect's facts, stacked. */}
              <ul className="flex flex-col gap-3">
                {report.sections[key].map((card) => {
                  const isPicked = picked.has(card.id);
                  return (
                    <li
                      key={card.id}
                      // In selection mode the whole box is the checkbox.
                      {...(selecting
                        ? {
                            role: "checkbox",
                            "aria-checked": isPicked,
                            "aria-label": `Pilih untuk dipadam: ${card.fact}`,
                            tabIndex: 0,
                            onClick: () => togglePick(card.id),
                            onKeyDown: (e: React.KeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                togglePick(card.id);
                              }
                            },
                          }
                        : {})}
                      className={[
                        "report-fact rounded-2xl px-5 py-4 outline-none transition-shadow",
                        selecting
                          ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          : "",
                      ].join(" ")}
                      style={{
                        backgroundColor: aspectTint(color, 8),
                        border: `1.5px solid ${
                          isPicked ? "var(--destructive)" : aspectTint(color, 30)
                        }`,
                        boxShadow: isPicked
                          ? "0 0 0 2px var(--destructive)"
                          : undefined,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {selecting && (
                          <span
                            aria-hidden
                            className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-[1.5px] text-white transition-colors"
                            style={{
                              backgroundColor: isPicked
                                ? "var(--destructive)"
                                : "transparent",
                              borderColor: isPicked
                                ? "var(--destructive)"
                                : aspectTint(color, 45),
                            }}
                          >
                            {isPicked && <Check className="size-3.5" />}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="leading-relaxed font-medium text-foreground">
                            {card.fact}
                          </p>
                          {/* Bottom row: Dalam/Luar negara label on the left
                              (when the fact has one — older reports don't),
                              small source line on the right. */}
                          <div
                            className="report-fact-meta mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
                            style={{ borderColor: aspectTint(color, 18) }}
                          >
                          {card.scope ? <ScopeChip scope={card.scope} /> : <span />}
                          <p className="ml-auto text-right text-xs text-muted-foreground">
                            Sumber:{" "}
                            <a
                              href={card.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Sumber: ${card.source} (buka dalam tab baharu)`}
                              // Following the link must not tick the box.
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-sm font-medium text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                              style={{ textDecorationColor: color }}
                            >
                              {card.source}
                              <ExternalLink className="size-3" aria-hidden />
                            </a>{" "}
                            · {card.year ?? "Tiada tahun"}
                          </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* AI-suggested peribahasa for these facts (hidden while picking facts
          to delete, so the selection mode stays focused). */}
      {!selecting && onUpdate && (
        <PeribahasaSection
          report={report}
          onUpdate={(patch) => onUpdate(report.id, patch)}
        />
      )}

      {/* Reminder to double-check facts before use */}
      <p className="text-center text-xs text-muted-foreground italic">
        Sila sahkan maklumat dengan sumber asal sebelum digunakan.
      </p>

      {/* Bottom action row, under a divider. Normally: Cetak / DOCX / Salin /
          Kongsi, then Padam. In selection mode it becomes the delete controls. */}
      <div className="no-print border-t" aria-hidden />
      {selecting ? (
        <div className="no-print flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={picked.size === 0}
            onClick={deletePicked}
          >
            <Trash2 />
            Padam dipilih{picked.size > 0 ? ` (${picked.size})` : ""}
          </Button>
          <Button variant="outline" size="sm" onClick={cancelSelecting}>
            <X />
            Batal
          </Button>
        </div>
      ) : (
        <ExportButtons report={report}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 />
            Padam
          </Button>
        </ExportButtons>
      )}

      {/* "Padam" choice dialog: delete everything, or pick facts to delete. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        {/* No default X close (which has an English label) — the "Batal" button
            below is our clearly-labelled Bahasa Melayu cancel control. */}
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Padam apa?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">Padam semua</span>{" "}
              memadam keseluruhan &ldquo;{report.name}&rdquo; — tindakan ini tidak
              boleh dibatalkan.{" "}
              <span className="font-medium text-foreground">Padam pilihan</span>{" "}
              membolehkan anda memilih fakta tertentu untuk dipadam.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
            <Button variant="outline" onClick={startSelecting}>
              Padam pilihan
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                onDelete?.(report.id);
              }}
            >
              Padam semua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
