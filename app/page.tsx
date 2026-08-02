"use client";

// This is the app's home page and the "brain" that owns all the state:
//   topic       – what's typed in the search box
//   result      – the research result to show (null until we start generating)
//   selectedIds – which fact cards the teacher has ticked
//   loading     – whether a full generation is in progress
//
// Generation loads ONE aspect at a time: a search fetches "siapa" first and
// shows only that. The other five aspects load on demand when the user picks
// them in the sidebar, and are cached once loaded. Selections (selectedIds) are
// global, so "Jana laporan" collects ticked cards across every visited aspect.
import { useRef, useState } from "react";
import {
  FileOutput,
  ArrowLeft,
  ArrowRight,
  TriangleAlert,
  Loader2,
} from "lucide-react";
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
import { ReportView } from "@/components/report/report-view";
import { RotatingText } from "@/components/ui/rotating-text";
import { ClickEffects } from "@/components/ui/click-effects";
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

// Shared hover/focus treatment for the bottom navigation buttons: they turn
// emerald with readable text, gain a soft shadow, and lift slightly. The lift is
// gated behind `motion-safe` so it's skipped when the user prefers reduced motion.
// The `dark:hover`/`dark:focus-visible` overrides beat the outline variant's own
// dark hover background, so the emerald wins in dark mode too.
const NAV_BUTTON =
  "transition-all duration-200 ease-out hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary hover:shadow-lg focus-visible:bg-primary focus-visible:text-primary-foreground dark:focus-visible:bg-primary focus-visible:shadow-lg motion-safe:hover:-translate-y-0.5 motion-safe:focus-visible:-translate-y-0.5";

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

  // Points at the top of the results block so the prev/next buttons can scroll
  // back up after switching aspect.
  const resultsRef = useRef<HTMLDivElement>(null);

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

  // Which single aspect the main area is currently showing.
  const [activeAspect, setActiveAspect] = useState<SectionKey>("siapa");
  // Which aspects have already been fetched (so re-selecting is instant and we
  // know whether an aspect still needs loading).
  const [loadedAspects, setLoadedAspects] = useState<Set<SectionKey>>(new Set());
  // Per-section flags: first-load skeletons, and "Muat lagi" spinners.
  const [sectionLoading, setSectionLoading] = useState<Record<SectionKey, boolean>>(
    allSectionsFlag(false),
  );
  const [loadingMore, setLoadingMore] = useState<Record<SectionKey, boolean>>(
    allSectionsFlag(false),
  );

  // Fetch one aspect's cards, store them, and mark it loaded. Returns whether it
  // succeeded. Shows the section's skeleton via `sectionLoading` while it runs.
  async function fetchAspect(key: SectionKey, topicArg: string): Promise<boolean> {
    setSectionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const cards = await fetchSection(topicArg, key, CARDS_PER_SECTION, []);
      setResult((prev) =>
        prev ? { ...prev, sections: { ...prev.sections, [key]: cards } } : prev,
      );
      setLoadedAspects((prev) => new Set(prev).add(key));
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ralat tidak diketahui.";
      toast.error(`Bahagian "${SECTION_LABELS[key]}" gagal: ${message}`);
      return false;
    } finally {
      setSectionLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  // Start a fresh search: load ONLY "siapa" and show it. `overrideTopic` lets a
  // quick-topic pill generate immediately.
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
    setActiveAspect("siapa"); // always start on the first aspect
    setLoadedAspects(new Set());
    setLoadingMore(allSectionsFlag(false));
    setSectionLoading(allSectionsFlag(false));
    // Start with an empty result so the section can render its skeleton.
    setResult({
      topic: activeTopic,
      generatedAt: new Date().toISOString(),
      sections: emptySections(),
    });

    try {
      // Only the first aspect loads now; the rest load on demand from the sidebar.
      const ok = await fetchAspect("siapa", activeTopic);
      if (!ok) {
        setResearchFailed(true);
        setResult(null);
      }
    } finally {
      setLoading(false);
      researchInFlight.current = false; // allow the next run
    }
  }

  // Show a given aspect. If it hasn't been loaded yet, fetch it (which shows the
  // skeleton); if it's already cached, switching is instant.
  function selectAspect(key: SectionKey) {
    setActiveAspect(key);
    if (!result) return; // no search yet — nothing to load
    if (loadedAspects.has(key)) return; // cached → instant
    if (sectionLoading[key]) return; // already loading
    fetchAspect(key, result.topic);
  }

  // Move to the aspect at a given offset (-1 = previous, +1 = next) in 5W1H
  // order, load it if needed, and scroll back to the top of the results.
  function goToAspectBy(offset: number) {
    const index = SECTION_ORDER.indexOf(activeAspect);
    const target = SECTION_ORDER[index + offset];
    if (!target) return; // no aspect in that direction
    selectAspect(target);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const activeLabel = SECTION_LABELS[activeAspect];
  const srStatus = loading
    ? `Sedang menyelidik "${topic}".`
    : researchFailed
      ? "Penyelidikan gagal. Sila cuba lagi."
      : sectionLoading[activeAspect]
        ? `Sedang memuatkan bahagian ${activeLabel}.`
        : result
          ? `Menunjukkan bahagian ${activeLabel}.`
          : "";

  return (
    // Row on desktop (sidebar + main); on mobile the sidebar collapses into a
    // slide-in overlay opened from the top bar.
    <div className="flex min-h-full flex-1">
      <Sidebar
        reports={reports}
        history={history}
        activeAspect={activeAspect}
        onSelectAspect={selectAspect}
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
            activeAspect={activeAspect}
            onSelectAspect={selectAspect}
            onOpenReport={handleOpenReport}
            onPickHistory={handlePickHistory}
            onDataChanged={handleDataChanged}
          />
          <span className="font-heading text-sm font-semibold">BM AI Assistant</span>
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
          {/* Search chrome (heading, search box, quick topics) — hidden in print.
              `relative` so the click-effects layer can sit absolutely behind it. */}
          <div className="no-print relative flex flex-col gap-8">
            {/* Decorative click-effects layer — BEHIND the hero content (z-0) and
                scoped to this box only, so it never fires on the sidebar, results,
                fact cards, or report view. */}
            <ClickEffects
              className="no-print absolute inset-0 z-0"
              mode="rings"
              duration={0.3}
              strokeWidth={1.5}
              effectSize={60}
              showLabel={false}
            />

            {/* Hero content sits ABOVE the layer (z-10). It's pointer-events-none
                so clicks on empty space fall through to the effects layer, while
                the real controls re-enable pointer events so they stay clickable. */}
            <div className="pointer-events-none relative z-10 flex flex-col gap-8">
              {/* Heading + animated rotating headline.
                  The heading stays the real, accessible page heading; the rotating
                  text below it is decorative and cycles Jana Karangan/Idea/… */}
              <div className="flex flex-col items-center gap-3 text-center">
                <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
                  BM AI Assistant
                </h2>
                <RotatingText
                  className="no-print"
                  prefix="Jana"
                  texts={["Karangan", "Idea", "Fakta", "Statistik", "Bahan"]}
                />
              </div>

              {/* Search box (wired to topic + loading) */}
              <div className="pointer-events-auto">
                <SearchBar
                  value={topic}
                  onChange={setTopic}
                  // Wrap so no click event is passed in as `overrideTopic`.
                  onGenerate={() => handleGenerate()}
                  loading={loading}
                />
              </div>

              {/* Quick topics: fill the box AND generate straight away */}
              <div className="pointer-events-auto">
                <QuickTopics
                  onPick={(picked) => {
                    setTopic(picked);
                    handleGenerate(picked);
                  }}
                />
              </div>
            </div>
          </div>

          {/* If the initial search failed, show a clear error state with a retry. */}
          {researchFailed && (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 p-6 text-center"
            >
              <TriangleAlert className="size-8 text-destructive" aria-hidden />
              <p className="font-medium">Penyelidikan gagal.</p>
              <p className="text-sm text-muted-foreground">
                Sila semak sambungan internet anda dan cuba lagi.
              </p>
              <Button onClick={() => handleGenerate()}>Cuba lagi</Button>
            </div>
          )}

          {/* Show ONLY the active aspect. Other aspects load when picked from the
              sidebar (see selectAspect). Selections persist across aspects. */}
          {result && (
            <div ref={resultsRef} className="flex scroll-mt-4 flex-col gap-6">
              <div className="no-print flex items-center justify-between gap-2">
                <h3 className="font-heading text-lg font-semibold">
                  Laporan: {result.topic}
                </h3>
                <Button onClick={() => handleSaveReport()}>
                  <FileOutput aria-hidden />
                  Jana laporan
                </Button>
              </div>

              {/* key=activeAspect remounts the section (fresh skeleton) on switch */}
              <Section
                key={activeAspect}
                sectionKey={activeAspect}
                cards={result.sections[activeAspect]}
                selectedIds={selectedIds}
                onToggle={toggleId}
                loading={sectionLoading[activeAspect]}
              />

              {/* Bottom navigation row — changes with the active aspect:
                    first  : [Muat lagi] [Seterusnya]
                    middle : [Sebelumnya] [Muat lagi] [Seterusnya]
                    last   : [Sebelumnya] [Muat lagi] [Jana laporan] */}
              {(() => {
                const activeIndex = SECTION_ORDER.indexOf(activeAspect);
                const isFirst = activeIndex === 0;
                const isLast = activeIndex === SECTION_ORDER.length - 1;
                return (
                  <div className="no-print flex flex-wrap items-center justify-center gap-2">
                    {/* Previous aspect — hidden on the first aspect. */}
                    {!isFirst && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={NAV_BUTTON}
                        aria-label="Aspek sebelumnya"
                        onClick={() => goToAspectBy(-1)}
                      >
                        <ArrowLeft aria-hidden />
                        Sebelumnya
                      </Button>
                    )}

                    {/* Load more cards for the current aspect. */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={NAV_BUTTON}
                      aria-label="Muat lebih banyak fakta"
                      disabled={
                        loadingMore[activeAspect] || sectionLoading[activeAspect]
                      }
                      onClick={() => handleLoadMore(activeAspect)}
                    >
                      {loadingMore[activeAspect] && (
                        <Loader2 className="animate-spin" aria-hidden />
                      )}
                      Muat lagi
                    </Button>

                    {/* On the last aspect, "Jana laporan" REPLACES "Seterusnya"
                        and reuses the same handler as the header button. */}
                    {isLast ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className={NAV_BUTTON}
                        aria-label="Jana laporan daripada fakta dipilih"
                        onClick={() => handleSaveReport()}
                      >
                        <FileOutput aria-hidden />
                        Jana laporan
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className={NAV_BUTTON}
                        aria-label="Aspek seterusnya"
                        onClick={() => goToAspectBy(1)}
                      >
                        Seterusnya
                        <ArrowRight aria-hidden />
                      </Button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
