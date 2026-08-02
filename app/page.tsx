"use client";

// This is the app's home page and the "brain" that owns all the state:
//   topic       – what's typed in the search box
//   result      – the research result to show (null until we start generating)
//   selectedIds – which fact cards the teacher has ticked
//   loading     – whether a full generation is in progress
//
// Generation is now REAL: it calls /api/research once per 5W1H section, all six
// in parallel, and drops each section's cards into `result` as they arrive so
// the page fills in progressively.
import { useRef, useState } from "react";
import { FileOutput, ArrowLeft, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import type { ResearchResult, SavedReport, SectionKey } from "@/types";
import { SECTION_LABELS } from "@/types";
import { fetchSection } from "@/lib/research-client";
import { useReports } from "@/hooks/use-reports";
import { useSearchHistory } from "@/hooks/use-search-history";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { SearchBar } from "@/components/search/search-bar";
import { QuickTopics } from "@/components/search/quick-topics";
import { Section } from "@/components/research/section";
import { ProgressSteps, RESEARCH_STEPS } from "@/components/research/progress-steps";
import { ReportView } from "@/components/report/report-view";
import { Button } from "@/components/ui/button";

// The six sections always appear in this fixed order.
const SECTION_ORDER: SectionKey[] = [
  "siapa",
  "apa",
  "bila",
  "di_mana",
  "mengapa",
  "bagaimana",
];

// How many cards to fetch per section (both first load and "Muat lagi").
const CARDS_PER_SECTION = 8;

// Small helpers to build "one value per section" objects.
function emptySections(): ResearchResult["sections"] {
  return { siapa: [], apa: [], bila: [], di_mana: [], mengapa: [], bagaimana: [] };
}
function allSectionsFlag(value: boolean): Record<SectionKey, boolean> {
  return {
    siapa: value,
    apa: value,
    bila: value,
    di_mana: value,
    mengapa: value,
    bagaimana: value,
  };
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  // True when EVERY section failed — we show a full error state (not just toasts).
  const [researchFailed, setResearchFailed] = useState(false);

  // A synchronous "in flight" flag. Unlike state, a ref updates immediately, so
  // it reliably blocks a fast double-click on "Jana" from firing two runs.
  const researchInFlight = useRef(false);

  // Saved reports + search history, backed by localStorage (see the hooks).
  const { reports, save, rename, duplicate, remove, refresh: refreshReports } =
    useReports();
  const {
    history,
    add: addToHistory,
    refresh: refreshHistory,
  } = useSearchHistory();

  // Which screen the main area shows: the search UI, or a saved report.
  const [view, setView] = useState<"search" | "report">("search");
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  // Look the active report up from state so rename/duplicate reflect instantly.
  const activeReport = reports.find((r) => r.id === activeReportId) ?? null;

  // How many sections have finished (used to drive the progress steps).
  const [completedCount, setCompletedCount] = useState(0);
  // Per-section flags: first-load skeletons, and "Muat lagi" spinners.
  const [sectionLoading, setSectionLoading] = useState<Record<SectionKey, boolean>>(
    allSectionsFlag(false),
  );
  const [loadingMore, setLoadingMore] = useState<Record<SectionKey, boolean>>(
    allSectionsFlag(false),
  );

  // ProgressSteps expects a step index; map finished-section count onto it.
  const currentStep = Math.min(completedCount, RESEARCH_STEPS.length - 1);

  // REAL generate: fetch all six sections in parallel and fill them in as they
  // resolve. `overrideTopic` lets a quick-topic pill generate immediately.
  async function handleGenerate(overrideTopic?: string) {
    // Safety guard: only treat overrideTopic as the topic when it's really a
    // string. This stops a stray click event (MouseEvent) from being used here.
    const raw = typeof overrideTopic === "string" ? overrideTopic : topic;
    const activeTopic = raw.trim();
    if (activeTopic === "") return; // nothing to search for

    // Guard: if a run is already happening, ignore extra clicks.
    if (researchInFlight.current) return;
    researchInFlight.current = true;

    // Reset everything for a fresh run.
    setView("search"); // make sure the search UI is visible
    setResearchFailed(false); // clear any previous error state
    addToHistory(activeTopic); // record the search (deduped, newest first)
    setTopic(activeTopic);
    setLoading(true);
    setSelectedIds(new Set());
    setCompletedCount(0);
    setLoadingMore(allSectionsFlag(false));
    setSectionLoading(allSectionsFlag(true)); // every section starts loading
    // Start with an empty result so sections render (as skeletons) right away.
    setResult({
      topic: activeTopic,
      generatedAt: new Date().toISOString(),
      sections: emptySections(),
    });

    // Count how many sections fail so we can detect a total failure.
    let failureCount = 0;

    try {
      // Fire all six requests together; allSettled so one failure won't stop the rest.
      await Promise.allSettled(
        SECTION_ORDER.map(async (key) => {
          try {
            const cards = await fetchSection(activeTopic, key, CARDS_PER_SECTION, []);
            // Add this section's cards to the result as soon as they arrive.
            setResult((prev) =>
              prev
                ? { ...prev, sections: { ...prev.sections, [key]: cards } }
                : prev,
            );
          } catch (error) {
            failureCount += 1;
            const message =
              error instanceof Error ? error.message : "Ralat tidak diketahui.";
            toast.error(`Bahagian "${SECTION_LABELS[key]}" gagal: ${message}`);
          } finally {
            // Mark this section done whether it succeeded or failed.
            setSectionLoading((prev) => ({ ...prev, [key]: false }));
            setCompletedCount((c) => c + 1);
          }
        }),
      );

      // If ALL sections failed, show a full error state with a retry button.
      if (failureCount === SECTION_ORDER.length) {
        setResearchFailed(true);
        setResult(null);
      }
    } finally {
      setLoading(false);
      researchInFlight.current = false; // allow the next run
    }
  }

  // "Muat lagi": fetch 8 MORE cards for one section, telling the AI what we
  // already have so it doesn't repeat itself, then append the new cards.
  async function handleLoadMore(key: SectionKey) {
    if (!result || loadingMore[key]) return;

    setLoadingMore((prev) => ({ ...prev, [key]: true }));
    try {
      const existingFacts = result.sections[key].map((card) => card.fact);
      const more = await fetchSection(
        result.topic,
        key,
        CARDS_PER_SECTION,
        existingFacts,
      );
      setResult((prev) =>
        prev
          ? {
              ...prev,
              sections: { ...prev.sections, [key]: [...prev.sections[key], ...more] },
            }
          : prev,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ralat tidak diketahui.";
      toast.error(`Gagal memuat lebih banyak: ${message}`);
    } finally {
      setLoadingMore((prev) => ({ ...prev, [key]: false }));
    }
  }

  // Add or remove a card id from the selected set (immutably).
  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // "Jana laporan": build a SavedReport from ONLY the selected cards, grouped
  // by section, save it, and switch to the report view.
  function handleSaveReport() {
    if (!result) return;

    // Collect the ticked cards, keeping them grouped by their section.
    const sections = emptySections();
    let selectedTotal = 0;
    for (const key of SECTION_ORDER) {
      const chosen = result.sections[key].filter((card) => selectedIds.has(card.id));
      sections[key] = chosen;
      selectedTotal += chosen.length;
    }

    // Nothing ticked → warn instead of saving an empty report.
    if (selectedTotal === 0) {
      toast.warning("Sila pilih sekurang-kurangnya satu fakta sebelum menjana laporan.");
      return;
    }

    const report: SavedReport = {
      id: crypto.randomUUID(),
      name: `Laporan: ${result.topic}`,
      topic: result.topic,
      createdAt: new Date().toISOString(),
      sections,
    };

    save(report); // persists to localStorage + updates the sidebar list
    toast.success("Laporan berjaya disimpan.");
    setActiveReportId(report.id);
    setView("report");
  }

  // --- sidebar handlers ---
  // Open a saved report from the sidebar list.
  function handleOpenReport(id: string) {
    setActiveReportId(id);
    setView("report");
  }
  // Click a past search topic → fill the box and re-run the search.
  function handlePickHistory(pickedTopic: string) {
    setTopic(pickedTopic);
    handleGenerate(pickedTopic);
  }

  // --- report view handlers ---
  function handleDuplicateReport(id: string) {
    const copy = duplicate(id);
    if (copy) {
      setActiveReportId(copy.id); // show the fresh copy
      toast.success("Laporan disalin.");
    }
  }
  function handleDeleteReport(id: string) {
    remove(id);
    toast.success("Laporan dipadam.");
    setActiveReportId(null);
    setView("search"); // nothing to show, go back to search
  }

  // After a data restore, re-read both lists from storage so the UI updates.
  function handleDataChanged() {
    refreshReports();
    refreshHistory();
  }

  // A short Bahasa Melayu status line announced to screen readers (see the
  // aria-live region in the layout below).
  const srStatus = loading
    ? `Sedang menyelidik "${topic}". ${completedCount} daripada ${SECTION_ORDER.length} bahagian selesai.`
    : researchFailed
      ? "Penyelidikan gagal. Sila cuba lagi."
      : result
        ? "Penyelidikan selesai."
        : "";

  return (
    // Row on desktop (sidebar + main); on mobile the sidebar collapses into a
    // slide-in overlay opened from the top bar.
    <div className="flex min-h-full flex-1">
      <Sidebar
        reports={reports}
        history={history}
        onOpenReport={handleOpenReport}
        onPickHistory={handlePickHistory}
        onDataChanged={handleDataChanged}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar with the hamburger menu (desktop hides it). */}
        <div className="no-print flex items-center gap-2 border-b p-3 md:hidden">
          <MobileSidebar
            reports={reports}
            history={history}
            onOpenReport={handleOpenReport}
            onPickHistory={handlePickHistory}
            onDataChanged={handleDataChanged}
          />
          <span className="font-heading text-sm font-semibold">
            Karangan BM AI Assistant
          </span>
        </div>

        {/* Screen-reader-only live region announcing research progress in BM. */}
        <p className="sr-only" role="status" aria-live="polite">
          {srStatus}
        </p>

        {/* Main area scrolls on its own so the sidebar stays put. */}
        <main className="flex-1 overflow-y-auto">
        {view === "report" && activeReport ? (
          // ---------- REPORT VIEW ----------
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
            <div className="no-print">
              <Button variant="ghost" size="sm" onClick={() => setView("search")}>
                <ArrowLeft aria-hidden />
                Kembali ke carian
              </Button>
            </div>
            <ReportView
              report={activeReport}
              onRename={rename}
              onDuplicate={handleDuplicateReport}
              onDelete={handleDeleteReport}
            />
          </div>
        ) : (
          // ---------- SEARCH VIEW ----------
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
          {/* Search chrome (heading, search box, quick topics) — hidden in print */}
          <div className="no-print flex flex-col gap-8">
            {/* Heading + tagline */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
                Karangan BM AI Assistant
              </h2>
              <p className="text-sm text-muted-foreground">
                Jana bahan karangan mengikut 5W1H daripada sumber rasmi.
              </p>
            </div>

            {/* Search box (wired to topic + loading) */}
            <SearchBar
              value={topic}
              onChange={setTopic}
              // Wrap so no click event is passed in as `overrideTopic`.
              onGenerate={() => handleGenerate()}
              loading={loading}
            />

            {/* Quick topics: fill the box AND generate straight away */}
            <QuickTopics
              onPick={(picked) => {
                setTopic(picked);
                handleGenerate(picked);
              }}
            />
          </div>

          {/* While generating: show the progress steps (driven by sections done) */}
          {loading && (
            <div className="mx-auto">
              <ProgressSteps currentStep={currentStep} />
            </div>
          )}

          {/* If EVERY section failed, show a clear error state with a retry. */}
          {researchFailed && (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 p-6 text-center"
            >
              <TriangleAlert className="size-8 text-destructive" aria-hidden />
              <p className="font-medium">Penyelidikan gagal.</p>
              <p className="text-sm text-muted-foreground">
                Semua bahagian gagal dimuatkan. Sila semak sambungan internet
                anda dan cuba lagi.
              </p>
              <Button onClick={() => handleGenerate()}>Cuba lagi</Button>
            </div>
          )}

          {/* Show the report as soon as we have a result object (fills in live) */}
          {result && (
            <div className="flex flex-col gap-6">
              <div className="no-print flex items-center justify-between gap-2">
                <h3 className="font-heading text-lg font-semibold">
                  Laporan: {result.topic}
                </h3>
                <Button onClick={() => handleSaveReport()}>
                  <FileOutput aria-hidden />
                  Jana laporan
                </Button>
              </div>

              {SECTION_ORDER.map((key) => (
                <Section
                  key={key}
                  sectionKey={key}
                  cards={result.sections[key]}
                  selectedIds={selectedIds}
                  onToggle={toggleId}
                  onLoadMore={handleLoadMore}
                  loading={sectionLoading[key]}
                  loadingMore={loadingMore[key]}
                />
              ))}
            </div>
          )}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
