"use client";

// The "Modul 5W1H" page: the facts for ONE aspect of the current topic.
//
//   • A sticky panel (pinned under the header while the facts scroll) holds
//     the six aspect tabs (the open one is solid in its colour; a ✓ marks
//     aspects with ticked facts), the topic pill, the "x/y dipilih" counter,
//     "Jana Laporan", and the Semua / Dalam negara / Luar negara filter.
//   • Below it, the fact cards: white until ticked, then tinted in the
//     aspect's colour. Each shows its scope label (left) and source (right).
//   • "Muat lagi" fetches 5 more facts. (Laman Utama is in the header nav.)
//
// Choosing a filter shows only that scope and makes new facts come from it.
// The component is remounted per aspect (keyed by aspectKey in the page), so
// the cards re-stagger each time the aspect changes.
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { Check, ExternalLink, FileOutput, Globe, Loader2, MapPin, Plus } from "lucide-react";

import type { FactCard, ScopeFilter, SectionKey } from "@/types";
import { SCOPE_LABELS, SECTION_LABELS } from "@/types";
import { ASPECT_COLORS, aspectTint } from "@/lib/aspect-colors";
import { ASPECT_ICONS } from "@/lib/aspect-meta";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScopeChip } from "@/components/research/scope-chip";

// The Dalam/Luar negara filter options.
const SCOPE_OPTIONS: { value: ScopeFilter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "dalam", label: "Dalam negara" },
  { value: "luar", label: "Luar negara" },
];

const ASPECTS: SectionKey[] = [
  "siapa",
  "apa",
  "bila",
  "di_mana",
  "mengapa",
  "bagaimana",
];

interface AspectResultsProps {
  topic: string;
  aspectKey: SectionKey;
  cards: FactCard[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  loading: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onSelectAspect: (key: SectionKey) => void;
  // Aspects with at least one ticked fact — they get the ✓ on their tab.
  selectedAspects: Set<SectionKey>;
  sectionLoading: Record<SectionKey, boolean>;
  onSaveReport: () => void;
  // Dalam/Luar negara filter (shared by all aspects; owned by the page).
  scope: ScopeFilter;
  onScopeChange: (next: ScopeFilter) => void;
}

export function AspectResults({
  topic,
  aspectKey,
  cards,
  selectedIds,
  onToggle,
  loading,
  loadingMore,
  onLoadMore,
  onSelectAspect,
  selectedAspects,
  sectionLoading,
  onSaveReport,
  scope,
  onScopeChange,
}: AspectResultsProps) {
  const color = ASPECT_COLORS[aspectKey];
  // The cards in the chosen scope ("Semua" = all of them).
  const visible =
    scope === "semua" ? cards : cards.filter((c) => c.scope === scope);
  const selectedCount = visible.filter((c) => selectedIds.has(c.id)).length;
  // Skeletons while the first batch loads — or while a filter has nothing to
  // show yet and its scoped batch is on the way.
  const showSkeletons = visible.length === 0 && (loading || loadingMore);

  return (
    <div className="flex flex-col">
      {/* ---- Sticky panel, pinned right under the h-16 header ---- */}
      <div className="sticky top-16 z-20 border-b border-amber-100/70 bg-warm/95 px-4 pt-4 pb-4 backdrop-blur sm:px-10 sm:pt-6 dark:border-border">
        {/* The six aspect tabs: a scrolling row of pills on phones, a row of
            tiles from md up. */}
        <div
          role="group"
          aria-label="Aspek 5W1H"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-2 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 md:mx-auto md:grid md:max-w-4xl md:grid-cols-6 md:gap-3 md:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {ASPECTS.map((k) => {
            const c = ASPECT_COLORS[k];
            const Icon = ASPECT_ICONS[k];
            const active = k === aspectKey;
            const busy = sectionLoading[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => onSelectAspect(k)}
                aria-current={active ? "true" : undefined}
                aria-label={`Aspek ${SECTION_LABELS[k]}${selectedAspects.has(k) ? " (ada fakta dipilih)" : ""}`}
                className={cn(
                  "group relative flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 font-heading text-sm font-bold outline-none transition-all focus-visible:ring-4 focus-visible:ring-ring/40 md:flex-col md:gap-1.5 md:px-2 md:py-3",
                  active
                    ? "text-white shadow-md md:scale-105"
                    : "text-[var(--c)] hover:-translate-y-0.5 hover:shadow-sm dark:text-[color-mix(in_oklch,var(--c)_55%,white)]",
                )}
                style={
                  {
                    "--c": c,
                    backgroundColor: active ? c : aspectTint(c, 12),
                    borderColor: active ? c : aspectTint(c, 18),
                    boxShadow: active ? `0 0 0 4px ${aspectTint(c, 25)}` : undefined,
                  } as CSSProperties
                }
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-lg md:size-8 md:rounded-xl",
                    active ? "bg-white/20" : "bg-white/50 dark:bg-white/5",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                {SECTION_LABELS[k]}
                {busy ? (
                  <Loader2
                    className="absolute -top-1.5 -right-1.5 size-4 animate-spin text-[var(--c)]"
                    aria-hidden
                  />
                ) : selectedAspects.has(k) ? (
                  // ✓ = the student has picked at least one fact in this aspect.
                  <span
                    aria-hidden
                    className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border border-emerald-400 bg-white text-emerald-600 shadow-sm"
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Topic pill + counter, and the report action. */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-amber-100/70 pt-3 md:mt-5 md:pt-4 dark:border-border">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2 className="truncate rounded-full bg-[#eab308] px-5 py-1.5 font-heading text-lg font-bold text-[#422006] shadow-sm sm:text-xl">
              {topic}
            </h2>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200/50 bg-amber-100/70 px-3 py-1 text-xs font-semibold text-amber-900 sm:text-sm dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
              {selectedCount}/{visible.length} dipilih
            </span>
          </div>
          <Button
            onClick={onSaveReport}
            className="h-10 rounded-full bg-emerald-600 px-5 font-heading font-bold text-white hover:bg-emerald-500"
          >
            <FileOutput aria-hidden />
            Jana Laporan
          </Button>
        </div>

        {/* Dalam/Luar negara filter. Choosing one also makes new facts come
            from that scope only. */}
        <div
          role="group"
          aria-label="Tapis fakta mengikut skop"
          className="mt-3 flex w-full gap-1 rounded-full border bg-muted p-1 text-xs sm:inline-flex sm:w-fit sm:text-sm"
        >
          {SCOPE_OPTIONS.map((opt) => {
            const active = scope === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => onScopeChange(opt.value)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:flex-none sm:px-3.5 sm:py-1",
                  opt.value === "dalam" && "text-cyan-700 dark:text-cyan-300",
                  opt.value === "luar" && "text-violet-600 dark:text-violet-300",
                  opt.value === "semua" && "text-foreground",
                  active
                    ? "bg-card font-bold shadow-sm"
                    : "opacity-80 hover:opacity-100",
                )}
              >
                {opt.value === "dalam" && <MapPin className="size-3.5" aria-hidden />}
                {opt.value === "luar" && <Globe className="size-3.5" aria-hidden />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- The facts ---- */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8 sm:px-8">
        {showSkeletons ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl"
              style={{
                backgroundColor: aspectTint(color, 8),
                border: `2px solid ${aspectTint(color, 15)}`,
              }}
            />
          ))
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            {scope === "semua"
              ? "Tiada fakta ditemui untuk aspek ini. Cuba “Muat lagi”."
              : `Tiada fakta ${SCOPE_LABELS[scope].toLowerCase()} ditemui untuk aspek ini. Cuba “Muat lagi”.`}
          </p>
        ) : (
          visible.map((card, i) => {
            const selected = selectedIds.has(card.id);
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(i, 5) * 0.04 }}
                role="checkbox"
                aria-checked={selected}
                aria-label={`Pilih fakta: ${card.fact}`}
                tabIndex={0}
                onClick={() => onToggle(card.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggle(card.id);
                  }
                }}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 p-5 outline-none transition-shadow hover:shadow-md focus-visible:ring-4 focus-visible:ring-ring/40 sm:p-6",
                  !selected && "border-border bg-card",
                )}
                style={
                  selected
                    ? { backgroundColor: aspectTint(color, 10), borderColor: color }
                    : undefined
                }
              >
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <span
                    aria-hidden
                    className="mt-1 grid size-5 shrink-0 place-items-center rounded-md border-2 text-white transition-colors"
                    style={{
                      backgroundColor: selected ? color : "transparent",
                      borderColor: selected ? color : aspectTint(color, 45),
                    }}
                  >
                    {selected && <Check className="size-3.5" strokeWidth={3} />}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="leading-relaxed font-medium text-foreground sm:text-[17px]">
                      {card.fact}
                    </p>

                    {/* Bottom row: scope label on the left, source on the right. */}
                    <div
                      className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
                      style={{ borderColor: aspectTint(color, 15) }}
                    >
                      {card.scope ? <ScopeChip scope={card.scope} /> : <span />}
                      <span className="ml-auto text-right text-xs font-medium text-muted-foreground sm:text-sm">
                        Sumber:{" "}
                        <a
                          href={card.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Sumber: ${card.source} (buka dalam tab baharu)`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-sm text-foreground/80 underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          style={{ textDecorationColor: color }}
                        >
                          {card.source}
                          <ExternalLink className="size-3" aria-hidden />
                        </a>{" "}
                        · {card.year ?? "Tiada tahun"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}

        {/* "Muat lagi": fetch 5 more facts for this aspect. Hidden only while
            the very first batch is still loading. */}
        {!showSkeletons && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              disabled={loadingMore || loading}
              onClick={onLoadMore}
              className="h-11 rounded-full border-2 border-amber-800 bg-transparent px-8 font-heading font-bold text-amber-800 hover:bg-amber-50 hover:text-amber-900 dark:border-amber-400 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-400/10"
            >
              {loadingMore ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Plus aria-hidden />
              )}
              {loadingMore ? "Memuatkan…" : "Muat lagi"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
