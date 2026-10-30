"use client";

// This is the app's home page and the "brain" that owns all the state:
//   topic       – what's typed in the search box
//   result      – the research result to show (null until we start generating)
//   selectedIds – which fact cards the teacher has ticked
//   loading     – whether a full generation is in progress
//
// Three pages, switched by `view` (the header nav):
//   home   – Laman Utama: hero, topic box and the six aspect tiles
//   module – Modul 5W1H: one aspect's facts for the current topic
//   report – Laporan: a saved report
//   saved  – Simpanan: every saved report as a card (open / rename / delete)
//
// Generation loads ONE aspect at a time: a search fetches the chosen aspect
// (Siapa by default) and shows only that. The other five load on demand when
// picked, and are cached once loaded. Selections (selectedIds) are global, so
// "Jana Laporan" collects ticked cards across every visited aspect.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import type {
  FactCard,
  ResearchResult,
  SavedReport,
  ScopeFilter,
  SectionKey,
} from "@/types";
import { SECTION_LABELS } from "@/types";
import { fetchSection } from "@/lib/research-client";
import { dedupeAgainst } from "@/lib/fact-dedup";
import { useReports } from "@/hooks/use-reports";
import { AppHeader, type AppView } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Landing } from "@/components/home/landing";
import { AspectResults } from "@/components/search/aspect-results";
import { ReportView } from "@/components/report/report-view";
import { SavedReports } from "@/components/report/saved-reports";

// The six sections always appear in this fixed order.
const SECTION_ORDER: SectionKey[] = [
  "siapa",
  "apa",
  "bila",
  "di_mana",
  "mengapa",
  "bagaimana",
];

// How many cards to SHOW per batch (first load and each "Muat lagi").
const CARDS_PER_SECTION = 5;
// We ASK the AI for a few extra, because the duplicate filter can throw away
// near-repeats; the surplus is trimmed so each batch still adds exactly 5.
const FETCH_BUFFER = 3;

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

  // Saved reports, backed by localStorage (see the hook).
  const {
    reports,
    save,
    rename,
    updateSections,
    update: updateReport,
    remove,
  } = useReports();

  // Which page the card shows (see the top of this file).
  const [view, setView] = useState<AppView>("home");
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  // A report was just made with "Jana Laporan" and Laporan hasn't been opened
  // since — the header shows a gold dot on "Laporan" until it is.
  const [hasNewReport, setHasNewReport] = useState(false);
  // Look the active report up from state so rename/duplicate reflect instantly.
  const activeReport = reports.find((r) => r.id === activeReportId) ?? null;

  // Which single aspect the main area is currently showing.
  const [activeAspect, setActiveAspect] = useState<SectionKey>("siapa");
  // Results filter: Semua / Dalam negara / Luar negara. Applies to every aspect;
  // with a filter on, new facts are also *searched* in that scope only.
  const [scope, setScope] = useState<ScopeFilter>("semua");
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

  // Whenever the page or the aspect changes, jump back to the top so the new
  // view starts in sight. The WINDOW is the
  // scroller (the page grows with its content; <main> doesn't scroll on its
  // own). We scroll once immediately and once more after the crossfade settles
  // (~300ms), because the outgoing view stays mounted while it fades and the
  // page height shrinks under us. Instant (not smooth) so the height change
  // can't interrupt it mid-flight.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const id = setTimeout(() => window.scrollTo({ top: 0 }), 300);
    return () => clearTimeout(id);
  }, [view, activeAspect]);

  // Get up to 5 NEW facts for one aspect, not repeating anything in `existing`.
  // The AI sometimes repeats itself, and the duplicate filter then leaves fewer
  // than 5 — so if we come up short we ask ONE more time (telling it what we
  // already have) and top up. Two tries at most keeps loading time bounded. If
  // the top-up fails we keep what the first try found; if the FIRST try fails
  // the error propagates so the caller can report it.
  async function fetchFreshBatch(
    topicArg: string,
    key: SectionKey,
    existing: FactCard[],
    scopeArg: ScopeFilter = "semua", // search only this scope (server-filtered)
  ): Promise<FactCard[]> {
    let fresh: FactCard[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      if (fresh.length >= CARDS_PER_SECTION) break;
      const known = [...existing, ...fresh];
      let batch: FactCard[];
      try {
        batch = await fetchSection(
          topicArg,
          key,
          CARDS_PER_SECTION + FETCH_BUFFER,
          known.map((card) => card.fact),
          scopeArg,
        );
      } catch (error) {
        if (attempt === 0) throw error;
        break; // top-up failed — settle for what the first try gave us
      }
      fresh = [...fresh, ...dedupeAgainst(known, batch)];
    }
    return fresh.slice(0, CARDS_PER_SECTION);
  }

  // Fetch one aspect's cards, store them, and mark it loaded. Returns whether it
  // succeeded. Shows the section's skeleton via `sectionLoading` while it runs.
  async function fetchAspect(
    key: SectionKey,
    topicArg: string,
    scopeArg: ScopeFilter = "semua",
  ): Promise<boolean> {
    setSectionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const cards = await fetchFreshBatch(topicArg, key, [], scopeArg);
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

  // Start a fresh search: load ONLY the starting aspect (Siapa unless a tile
  // was picked) and open the Modul 5W1H page on it. `overrideTopic` lets a
  // quick-topic pill generate immediately. Re-submitting the topic that is
  // already loaded just reopens its results instead of searching again.
  async function handleGenerate(
    overrideTopic?: string,
    startAspect: SectionKey = "siapa",
  ) {
    // Safety guard: only treat overrideTopic as the topic when it's really a
    // string. This stops a stray click event (MouseEvent) from being used here.
    const raw = typeof overrideTopic === "string" ? overrideTopic : topic;
    const activeTopic = raw.trim();
    if (activeTopic === "") return; // nothing to search for
    if (result && result.topic === activeTopic && !researchFailed) {
      setTopic(activeTopic);
      zoomToAspect(startAspect);
      return;
    }

    // Guard: if a run is already happening, ignore extra clicks.
    if (researchInFlight.current) return;
    researchInFlight.current = true;

    // Reset everything for a fresh run.
    setView("module"); // straight to the results page, skeletons first
    setResearchFailed(false); // clear any previous error state
    setTopic(activeTopic);
    setLoading(true);
    setSelectedIds(new Set());
    setActiveAspect(startAspect);
    setScope("semua"); // a new topic starts unfiltered
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
      // Only the starting aspect loads now; the rest load on demand.
      const ok = await fetchAspect(startAspect, activeTopic);
      if (!ok) {
        setResearchFailed(true);
        setResult(null);
        setView("home"); // the error + retry live under the topic box
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
    if (sectionLoading[key]) return; // already loading
    if (loadedAspects.has(key)) {
      topUpScope(key, scope); // cached → instant, but fill a thin filtered view
      return;
    }
    fetchAspect(key, result.topic, scope);
  }

  // Change the Dalam/Luar negara filter. If the current aspect then shows fewer
  // than 5 facts in that scope, fetch more — searched in that scope only.
  function changeScope(next: ScopeFilter) {
    setScope(next);
    topUpScope(activeAspect, next);
  }

  // When a filter leaves an (already loaded) aspect with fewer than 5 matching
  // facts, load one more batch in that scope. Runs only on user actions
  // (changing filter / aspect), never in a loop.
  function topUpScope(key: SectionKey, scopeArg: ScopeFilter) {
    if (!result || scopeArg === "semua") return;
    if (!loadedAspects.has(key) || sectionLoading[key] || loadingMore[key]) return;
    const matching = result.sections[key].filter((c) => c.scope === scopeArg).length;
    if (matching < CARDS_PER_SECTION) handleLoadMore(key, scopeArg);
  }

  // Load + show one aspect on the Modul 5W1H page. Switching aspect from the
  // tabs on that page uses selectAspect directly.
  function zoomToAspect(key: SectionKey) {
    selectAspect(key);
    setView("module");
  }

  // A landing tile: open that aspect of the topic in the box — straight away
  // if it's the topic already loaded, otherwise by starting a new search on it.
  function handleTile(key: SectionKey) {
    handleGenerate(undefined, key);
  }

  // "Laman Utama": back to the landing page. The current topic and its facts
  // are kept, so "Modul 5W1H" (or a tile) returns to them.
  function goHome() {
    setView("home");
  }

  // "Modul 5W1H": the current topic's results, if there is one yet.
  function goModule() {
    if (result) {
      setView("module");
      return;
    }
    setView("home");
    toast.info("Taip tajuk karangan dahulu.");
  }

  // "Laporan": the report open last, else the newest saved one.
  function goReport() {
    const target = activeReport ?? reports[0];
    if (!target) {
      toast.info("Belum ada laporan. Tandakan fakta, kemudian tekan Jana Laporan.");
      return;
    }
    setActiveReportId(target.id);
    setView("report");
    setHasNewReport(false);
  }

  // "Simpanan": the list of every saved report.
  function goSaved() {
    setView("saved");
  }

  // "Muat lagi": fetch 5 MORE cards for one section, telling the AI what we
  // already have so it doesn't repeat itself, then append the new cards. With a
  // Dalam/Luar negara filter on, the new cards are searched in that scope.
  async function handleLoadMore(key: SectionKey, scopeArg: ScopeFilter = scope) {
    if (!result || loadingMore[key]) return;

    setLoadingMore((prev) => ({ ...prev, [key]: true }));
    try {
      // Up to 5 facts that aren't already shown (topped up if the AI repeats).
      const more = await fetchFreshBatch(
        result.topic,
        key,
        result.sections[key],
        scopeArg,
      );
      setResult((prev) => {
        if (!prev) return prev;
        // Re-check against the latest list (belt-and-braces), then append.
        const fresh = dedupeAgainst(prev.sections[key], more);
        return {
          ...prev,
          sections: { ...prev.sections, [key]: [...prev.sections[key], ...fresh] },
        };
      });
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
    setHasNewReport(true);
  }

  // --- Simpanan handlers ---
  // Open a saved report from its card.
  function handleOpenReport(id: string) {
    setActiveReportId(id);
    setView("report");
    setHasNewReport(false);
  }
  // --- report view handlers ---
  // Delete a whole report (from the report page, or a card's trash button in
  // Simpanan). Only if it's the report being shown do we leave the report page.
  function handleDeleteReport(id: string) {
    remove(id);
    toast.success("Laporan dipadam.");
    if (id !== activeReportId) return;
    setActiveReportId(null);
    if (view === "report") setView(result ? "module" : "home"); // nothing to show, go back
  }
  // "Padam pilihan": remove just the chosen facts. If that empties the report,
  // there's nothing left to show, so the whole report is deleted instead.
  function handleDeleteCards(id: string, cardIds: string[]) {
    const report = reports.find((r) => r.id === id);
    if (!report) return;
    const drop = new Set(cardIds);
    const sections = emptySections();
    let remaining = 0;
    for (const key of SECTION_ORDER) {
      sections[key] = (report.sections[key] ?? []).filter(
        (card) => !drop.has(card.id),
      );
      remaining += sections[key].length;
    }
    if (remaining === 0) {
      handleDeleteReport(id);
      return;
    }
    updateSections(id, sections);
    toast.success(`${cardIds.length} fakta dipadam.`);
  }

  // Aspects where the teacher has ticked at least one fact. These get the ✓ on
  // their landing tile and results tab — merely loading an aspect
  // doesn't count, only choosing something from it does.
  const selectedAspects = new Set<SectionKey>(
    result
      ? SECTION_ORDER.filter((key) =>
          result.sections[key].some((card) => selectedIds.has(card.id)),
        )
      : [],
  );

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
    // The golden frame: a gradient page with the app in one big rounded white
    // card (header, the current page, footer). `overflow-clip` rounds the
    // card's corners WITHOUT making it a scroll container, so the sticky header
    // and the results page's sticky panel still pin to the window.
    <div className="app-frame flex min-h-full min-w-0 flex-1 flex-col bg-gradient-to-b from-[#eab308] via-[#f59e0b] to-[#d97706] p-2 sm:p-6 lg:p-8 dark:from-[#3a2906] dark:via-[#271b04] dark:to-[#170f02] print:bg-none print:p-0">
      <p className="no-print mx-auto mb-2 flex w-full max-w-[1240px] items-center justify-between px-2 font-heading text-xs font-bold tracking-wide text-white sm:mb-3 sm:text-sm">
        Karangan BM AI Assistant – SPM KSSM
        <span className="hidden text-xs font-medium text-amber-50/80 sm:inline">
          Modul 5W1H Interaktif
        </span>
      </p>

      <div className="app-card mx-auto flex w-full max-w-[1240px] flex-1 flex-col overflow-clip rounded-[24px] border border-amber-200/40 bg-card shadow-2xl sm:rounded-[36px] dark:border-amber-500/15 print:rounded-none print:border-0 print:shadow-none">
        <AppHeader
          view={view}
          onHome={goHome}
          onModule={goModule}
          onReport={goReport}
          onSaved={goSaved}
          // Not while reading a report — only once the student has moved on.
          showReportDot={hasNewReport && view !== "report"}
        />

        {/* Screen-reader-only live region announcing research progress in BM. */}
        <p className="sr-only" role="status" aria-live="polite">
          {srStatus}
        </p>

        {/* `grid` + gridArea 1/1 on every page stacks them in the SAME cell, so
            during a swap the old page fades out while the new one fades in on
            top of it (a true crossfade — no empty gap between them). */}
        <main className="grid flex-1 bg-warm print:bg-transparent">
          <AnimatePresence initial={false}>
            {view === "saved" ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, pointerEvents: "none" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ gridArea: "1 / 1" }}
                className="min-w-0"
              >
                <SavedReports
                  reports={reports}
                  onOpen={handleOpenReport}
                  onRename={rename}
                  onDelete={handleDeleteReport}
                  onHome={goHome}
                />
              </motion.div>
            ) : view === "report" && activeReport ? (
              <motion.div
                key="report"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, pointerEvents: "none" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ gridArea: "1 / 1" }}
                className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-6 sm:py-10 print:max-w-none print:p-0"
              >
                <ReportView
                  key={activeReport.id}
                  report={activeReport}
                  onRename={rename}
                  onDelete={handleDeleteReport}
                  onDeleteCards={handleDeleteCards}
                  onUpdate={updateReport}
                />
              </motion.div>
            ) : view === "module" && result ? (
              <motion.div
                key="module"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, pointerEvents: "none" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ gridArea: "1 / 1" }}
                className="min-w-0"
              >
                {/* key=activeAspect remounts the page (replays the card
                    stagger) whenever the aspect changes. */}
                <AspectResults
                  key={activeAspect}
                  topic={result.topic}
                  aspectKey={activeAspect}
                  cards={result.sections[activeAspect]}
                  selectedIds={selectedIds}
                  onToggle={toggleId}
                  loading={sectionLoading[activeAspect]}
                  loadingMore={loadingMore[activeAspect]}
                  onLoadMore={() => handleLoadMore(activeAspect)}
                  scope={scope}
                  onScopeChange={changeScope}
                  onSelectAspect={selectAspect}
                  selectedAspects={selectedAspects}
                  sectionLoading={sectionLoading}
                  onSaveReport={() => handleSaveReport()}
                />
              </motion.div>
            ) : (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, pointerEvents: "none" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ gridArea: "1 / 1" }}
                className="min-w-0 bg-card"
              >
                <Landing
                  topic={topic}
                  onTopicChange={setTopic}
                  // Wrap so no submit event is passed in as `overrideTopic`.
                  onGenerate={() => handleGenerate()}
                  onPickTopic={(picked) => {
                    setTopic(picked);
                    handleGenerate(picked);
                  }}
                  loading={loading}
                  researchFailed={researchFailed}
                  onSelectAspect={handleTile}
                  selectedAspects={selectedAspects}
                  sectionLoading={sectionLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
