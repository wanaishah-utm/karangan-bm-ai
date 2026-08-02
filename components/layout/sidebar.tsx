"use client";

// The left-hand sidebar. Shows the 5W1H aspects, saved reports and search
// history (each clickable), backup/restore controls, and the theme toggle.
//
// Each section is a COLLAPSIBLE disclosure: the title is a button that toggles
// its list open/closed (aria-expanded + aria-controls for accessibility).
//
// The inner content lives in `SidebarBody` so it can be reused in TWO places:
//   1. the desktop <aside> (this file's `Sidebar`), and
//   2. the mobile slide-in overlay (see mobile-sidebar.tsx).
import { useId, useRef, useState } from "react";
import {
  ChevronRight,
  ListChecks,
  FileText,
  History,
  Download,
  Upload,
} from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";

import type { SavedReport, SectionKey } from "@/types";
import { SECTION_LABELS } from "@/types";
import { exportAllData, importAllData } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

// The six 5W1H aspects, in their fixed order.
const SECTION_ORDER: SectionKey[] = [
  "siapa",
  "apa",
  "bila",
  "di_mana",
  "mengapa",
  "bagaimana",
];

// Shared styling for every clickable sidebar item.
//  - ITEM_BASE: layout + a comfortable ~36px tap target + smooth transition.
//  - ITEM_HOVER: a subtle GRAY box on hover/focus (muted token → works in both
//    light and dark mode). Used for non-active items.
//  - ITEM_ACTIVE: the emerald box for the currently selected aspect, so the
//    active state stays distinct from a plain hover.
//  - ITEM_TEXT: slides the label slightly right on hover/focus.
const ITEM_BASE =
  "group flex min-h-9 w-full items-center rounded-md px-2 py-1.5 text-left outline-none transition-colors duration-150 ease-out";
const ITEM_HOVER =
  "hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring";
const ITEM_ACTIVE = "bg-primary text-primary-foreground";
const ITEM_TEXT =
  "block transition-transform duration-150 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1";

// A collapsible sidebar section: a clickable title (with a rotating chevron)
// that shows/hides its list.
function SidebarSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType; // a lucide icon component
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const listId = useId(); // stable id linking the button to its list

  return (
    <div className="flex flex-col gap-2">
      {/* Title stays a real heading; the button inside is the disclosure toggle. */}
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
          // Title turns emerald on hover / keyboard focus.
          className="flex w-full items-center gap-2 text-base font-semibold outline-none transition-colors duration-150 ease-out hover:text-primary focus-visible:text-primary"
        >
          <Icon className="size-4" aria-hidden />
          <span className="flex-1 text-left">{title}</span>
          {/* Points right when closed, rotates down (90°) when open. */}
          <ChevronRight
            aria-hidden
            className={cn(
              "size-4 transition-transform duration-200 ease-out",
              open && "rotate-90",
            )}
          />
        </button>
      </h2>

      {/* Kept in the DOM but hidden when closed, so aria-controls always resolves. */}
      <div id={listId} className={open ? "block" : "hidden"}>
        {children}
      </div>
    </div>
  );
}

interface SidebarProps {
  reports: SavedReport[]; // saved reports, newest first
  history: string[]; // past search topics, newest first
  activeAspect: SectionKey; // which 5W1H aspect is currently shown
  onSelectAspect: (key: SectionKey) => void; // show a given aspect
  onOpenReport: (id: string) => void; // open a saved report
  onPickHistory: (topic: string) => void; // re-run a past search
  onDataChanged: () => void; // called after a restore, so lists refresh
}

// The shared inner content of the sidebar. `className` lets callers tweak layout
// (e.g. the mobile overlay makes it fill the dialog height).
export function SidebarBody({
  reports,
  history,
  activeAspect,
  onSelectAspect,
  onOpenReport,
  onPickHistory,
  onDataChanged,
  className,
}: SidebarProps & { className?: string }) {
  // A hidden <input type="file"> we trigger from the "Restore Data" button.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // "Backup Data": download everything (reports + history) as one .json file.
  function handleBackup() {
    try {
      const json = exportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      saveAs(blob, `karangan-sandaran-${stamp}.json`);
      toast.success("Sandaran data berjaya dimuat turun.");
    } catch {
      toast.error("Gagal membuat sandaran data.");
    }
  }

  // "Restore Data": read the chosen .json file and restore it into storage.
  async function handleRestore(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset so the same file can be picked again later
    if (!file) return;

    try {
      const text = await file.text();
      const ok = importAllData(text);
      if (ok) {
        onDataChanged(); // tell the parent to refresh reports + history
        toast.success("Data berjaya dipulihkan.");
      } else {
        toast.error("Fail sandaran tidak sah.");
      }
    } catch {
      toast.error("Gagal membaca fail sandaran.");
    }
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      {/* Header: the app name */}
      <div className="border-b p-4">
        <h1 className="font-heading text-base font-semibold">BM AI Assistant</h1>
      </div>

      {/* Scrollable middle content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 p-4">
          {/* Aspek (5W1H) — open by default since it's the main navigation. */}
          <SidebarSection title="Aspek" icon={ListChecks} defaultOpen>
            <ul className="flex flex-col gap-0.5">
              {SECTION_ORDER.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onSelectAspect(key)}
                    // Mark the active aspect for assistive tech.
                    aria-current={activeAspect === key ? "true" : undefined}
                    className={cn(
                      ITEM_BASE,
                      "text-sm",
                      // Active aspect = emerald; others = gray hover.
                      activeAspect === key ? ITEM_ACTIVE : ITEM_HOVER,
                    )}
                  >
                    <span className={ITEM_TEXT}>{SECTION_LABELS[key]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </SidebarSection>

          {/* Saved reports — closed by default. */}
          <SidebarSection title="Laporan Tersimpan" icon={FileText}>
            {reports.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada laporan disimpan.
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {reports.map((report) => (
                  <li key={report.id}>
                    <button
                      type="button"
                      onClick={() => onOpenReport(report.id)}
                      className={cn(ITEM_BASE, ITEM_HOVER)}
                    >
                      <span className={ITEM_TEXT}>
                        <span className="block truncate text-sm font-medium">
                          {report.name}
                        </span>
                        <span className="block truncate text-xs opacity-80">
                          {report.topic}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SidebarSection>

          {/* Search history — closed by default. */}
          <SidebarSection title="Sejarah Carian" icon={History}>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada carian.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {history.map((topic) => (
                  <li key={topic}>
                    <button
                      type="button"
                      onClick={() => onPickHistory(topic)}
                      className={cn(ITEM_BASE, ITEM_HOVER, "text-sm")}
                    >
                      <span className={cn(ITEM_TEXT, "truncate")}>{topic}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SidebarSection>
        </div>
      </ScrollArea>

      {/* Footer: backup/restore + theme toggle */}
      <div className="flex flex-col gap-3 border-t p-4">
        {/* Backup / restore data (English labels by request) */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            aria-label="Backup Data"
            onClick={handleBackup}
          >
            <Download aria-hidden />
            Backup Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            aria-label="Restore Data"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload aria-hidden />
            Restore Data
          </Button>
          {/* Hidden picker, opened by the "Restore Data" button above. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleRestore}
          />
        </div>

        {/* Light/dark toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Mod paparan</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

// The DESKTOP sidebar: a fixed-width column, hidden on mobile and when printing.
// `sticky top-0 h-dvh` pins it to the full viewport height so it never scrolls
// away; `self-start` stops the flex row from stretching it. SidebarBody scrolls
// its lists internally (see its ScrollArea) while the footer stays pinned.
export function Sidebar(props: SidebarProps) {
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-[260px] shrink-0 self-start border-r md:block">
      <SidebarBody {...props} />
    </aside>
  );
}
