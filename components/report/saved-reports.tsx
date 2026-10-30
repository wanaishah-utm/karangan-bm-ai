"use client";

// The "Simpanan" page: every saved report as its own card, newest first.
// Clicking a card's title area opens the report. Each card has a pen button to
// rename it in place and a trash button that deletes it after a confirmation.
// A row of coloured dots shows which 5W1H aspects the report covers.
import { useState } from "react";
import { ArrowRight, FolderOpen, Pencil, Quote, Trash2 } from "lucide-react";

import type { SavedReport, SectionKey } from "@/types";
import { SECTION_LABELS } from "@/types";
import { ASPECT_COLORS } from "@/lib/aspect-colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SECTION_ORDER: SectionKey[] = [
  "siapa",
  "apa",
  "bila",
  "di_mana",
  "mengapa",
  "bagaimana",
];

// A short Malay date, e.g. "30 Okt 2026".
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium" }).format(date);
}

interface SavedReportsProps {
  reports: SavedReport[]; // newest first
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onHome: () => void;
}

export function SavedReports({
  reports,
  onOpen,
  onRename,
  onDelete,
  onHome,
}: SavedReportsProps) {
  // The report waiting for "Padam" to be confirmed (null = dialog closed).
  const [pendingDelete, setPendingDelete] = useState<SavedReport | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
          <FolderOpen className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
            Simpanan
          </h1>
          <p className="text-sm text-muted-foreground">
            {reports.length === 0
              ? "Laporan yang anda jana akan disimpan di sini."
              : `${reports.length} laporan disimpan`}
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 px-6 py-12 text-center dark:border-amber-400/30 dark:bg-amber-400/5">
          <p className="font-heading font-bold">Belum ada laporan disimpan.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Taip tajuk karangan, tandakan fakta yang sesuai, kemudian tekan Jana
            Laporan.
          </p>
          <Button onClick={onHome} className="rounded-full font-heading font-bold">
            Ke Laman Utama
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <SavedReportCard
              key={report.id}
              report={report}
              onOpen={() => onOpen(report.id)}
              onRename={(name) => onRename(report.id, name)}
              onDelete={() => setPendingDelete(report)}
            />
          ))}
        </ul>
      )}

      {/* "Padam laporan?" confirmation. */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Padam laporan?</DialogTitle>
            <DialogDescription>
              &ldquo;{pendingDelete?.name}&rdquo; akan dipadam secara kekal.
              Tindakan ini tidak boleh dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              <Trash2 aria-hidden />
              Padam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SavedReportCard({
  report,
  onOpen,
  onRename,
  onDelete,
}: {
  report: SavedReport;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  // Inline name editing (the pen button).
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(report.name);

  function startEditing() {
    setDraft(report.name);
    setEditing(true);
  }
  // Save on Enter / blur; ignore blank or unchanged names.
  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== "" && trimmed !== report.name) onRename(trimmed);
  }

  const aspects = SECTION_ORDER.filter((k) => (report.sections[k]?.length ?? 0) > 0);
  const factCount = SECTION_ORDER.reduce(
    (sum, k) => sum + (report.sections[k]?.length ?? 0),
    0,
  );
  const hasPeribahasa = (report.peribahasa?.length ?? 0) > 0;

  return (
    <li className="flex flex-col rounded-2xl border border-amber-100 bg-card p-5 shadow-sm transition-shadow hover:shadow-md dark:border-border">
      {/* Which aspects the report covers. */}
      <div className="flex items-center gap-1.5" aria-label={`Aspek: ${aspects.map((k) => SECTION_LABELS[k]).join(", ")}`}>
        {aspects.map((k) => (
          <span
            key={k}
            title={SECTION_LABELS[k]}
            className="size-2.5 rounded-full"
            style={{ backgroundColor: ASPECT_COLORS[k] }}
          />
        ))}
        {hasPeribahasa && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
            <Quote className="size-3" aria-hidden />
            Peribahasa
          </span>
        )}
      </div>

      {editing ? (
        <Input
          autoFocus
          value={draft}
          aria-label="Nama laporan"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(report.name);
              setEditing(false);
            }
          }}
          className="mt-3 h-9 font-heading font-bold"
        />
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="group/open mt-3 flex flex-col items-start gap-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="line-clamp-2 font-heading text-lg leading-snug font-bold text-foreground transition-colors group-hover/open:text-amber-700 dark:group-hover/open:text-amber-300">
            {report.name}
          </span>
          <span className="text-sm text-muted-foreground">Tajuk: {report.topic}</span>
        </button>
      )}

      {/* Pushes the footer to the bottom so cards in a row line up. */}
      <div className="min-h-5 flex-1" aria-hidden />

      <div className="flex items-center justify-between gap-2 border-t border-amber-100 pt-3 dark:border-border">
        <span className="text-xs text-muted-foreground">
          {factCount} fakta · {formatDate(report.createdAt)}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Sunting nama ${report.name}`}
            title="Sunting nama"
            onClick={startEditing}
            className="text-muted-foreground hover:bg-amber-100 hover:text-amber-900 dark:hover:bg-amber-400/15 dark:hover:text-amber-200"
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Padam ${report.name}`}
            title="Padam laporan"
            onClick={onDelete}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Buka ${report.name}`}
            title="Buka laporan"
            onClick={onOpen}
            className="text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-400/15"
          >
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  );
}
