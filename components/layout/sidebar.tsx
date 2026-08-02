"use client";

// The left-hand sidebar. Shows the app name, saved reports and search history
// (each clickable), backup/restore controls, and the theme toggle.
//
// The inner content lives in `SidebarBody` so it can be reused in TWO places:
//   1. the desktop <aside> (this file's `Sidebar`), and
//   2. the mobile slide-in overlay (see mobile-sidebar.tsx).
import { useRef } from "react";
import { FileText, History, Download, Upload } from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";

import type { SavedReport } from "@/types";
import { exportAllData, importAllData } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface SidebarProps {
  reports: SavedReport[]; // saved reports, newest first
  history: string[]; // past search topics, newest first
  onOpenReport: (id: string) => void; // open a saved report
  onPickHistory: (topic: string) => void; // re-run a past search
  onDataChanged: () => void; // called after a restore, so lists refresh
}

// The shared inner content of the sidebar. `className` lets callers tweak layout
// (e.g. the mobile overlay makes it fill the dialog height).
export function SidebarBody({
  reports,
  history,
  onOpenReport,
  onPickHistory,
  onDataChanged,
  className,
}: SidebarProps & { className?: string }) {
  // A hidden <input type="file"> we trigger from the "Pulih data" button.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // "Sandaran data": download everything (reports + history) as one .json file.
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

  // "Pulih data": read the chosen .json file and restore it into storage.
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
        <h1 className="font-heading text-base font-semibold">
          Karangan BM AI Assistant
        </h1>
      </div>

      {/* Scrollable middle content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 p-4">
          {/* Saved reports */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4" aria-hidden />
              <span>Laporan Tersimpan</span>
            </div>

            {reports.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada laporan disimpan.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {reports.map((report) => (
                  <li key={report.id}>
                    <button
                      type="button"
                      onClick={() => onOpenReport(report.id)}
                      className="w-full rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="block truncate text-sm font-medium">
                        {report.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {report.topic}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Search history */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="size-4" aria-hidden />
              <span>Sejarah Carian</span>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada carian.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {history.map((topic) => (
                  <li key={topic}>
                    <button
                      type="button"
                      onClick={() => onPickHistory(topic)}
                      className="w-full truncate rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {topic}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer: backup/restore + theme toggle */}
      <div className="flex flex-col gap-3 border-t p-4">
        {/* Backup / restore data */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleBackup}
          >
            <Download aria-hidden />
            Sandaran data
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload aria-hidden />
            Pulih data
          </Button>
          {/* Hidden picker, opened by the "Pulih data" button above. */}
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
export function Sidebar(props: SidebarProps) {
  return (
    <aside className="no-print hidden w-[260px] shrink-0 border-r md:block">
      <SidebarBody {...props} />
    </aside>
  );
}
