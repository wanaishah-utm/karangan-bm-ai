"use client";

// The landing page (Laman Utama) of the Kuning Emas design:
//   • left: the chevron mark, eyebrow, headline, a short description, then the
//     golden topic box (type a title → arrow) and the popular-topic pills
//   • right: the golden illustration
//   • below: six full-width aspect tiles in their signature colours, each with
//     its icon and what that aspect covers. A tile opens that aspect's results.
import { useRef } from "react";
import { ArrowRight, Check, ChevronRight, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import type { SectionKey } from "@/types";
import { SECTION_LABELS } from "@/types";
import { ASPECT_COLORS } from "@/lib/aspect-colors";
import { ASPECT_DESCRIPTIONS, ASPECT_ICONS } from "@/lib/aspect-meta";
import { Button } from "@/components/ui/button";
import { ChevronMark } from "@/components/layout/chevron-mark";
import { HeroIllustration } from "@/components/home/hero-illustration";
import { QuickTopics } from "@/components/search/quick-topics";

const ASPECTS: SectionKey[] = [
  "siapa",
  "apa",
  "bila",
  "di_mana",
  "mengapa",
  "bagaimana",
];

interface LandingProps {
  topic: string;
  onTopicChange: (value: string) => void;
  onGenerate: () => void;
  onPickTopic: (topic: string) => void;
  loading: boolean;
  researchFailed: boolean;
  // Open one aspect's results (starting the research first if needed).
  onSelectAspect: (key: SectionKey) => void;
  // Aspects with at least one ticked fact (✓) and ones still loading (spinner).
  selectedAspects: Set<SectionKey>;
  sectionLoading: Record<SectionKey, boolean>;
}

export function Landing({
  topic,
  onTopicChange,
  onGenerate,
  onPickTopic,
  loading,
  researchFailed,
  onSelectAspect,
  selectedAspects,
  sectionLoading,
}: LandingProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // A tile needs a title to research. Without one, point the student at the box.
  function handleTile(key: SectionKey) {
    if (topic.trim() === "") {
      toast.info("Taip tajuk karangan dahulu.");
      inputRef.current?.focus();
      return;
    }
    onSelectAspect(key);
  }

  return (
    <div className="flex flex-col">
      {/* ---------- Hero ---------- */}
      <section className="grid grid-cols-1 items-center gap-10 px-6 pt-8 pb-10 sm:px-10 lg:grid-cols-2 lg:px-12">
        <div className="flex flex-col">
          <ChevronMark size={16} />
          <p className="mt-4 mb-2 font-heading text-xs font-bold tracking-[0.22em] text-amber-600 uppercase sm:text-sm dark:text-amber-400">
            Pembantu karangan pintar SPM
          </p>
          <h1 className="mb-5 font-heading text-3xl leading-[1.15] font-extrabold text-foreground sm:text-4xl lg:text-[44px]">
            Platform Bimbingan{" "}
            <span className="text-amber-500 dark:text-amber-400">
              Karangan BM Terulung.
            </span>
          </h1>
          <p className="mb-7 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Bina perenggan karangan SPM berformat KSSM secara sistematik dengan
            panduan yang jelas dan mudah diikuti. Dengan bantuan kecerdasan
            buatan (AI), proses merancang, mengembangkan idea dan menghasilkan
            perenggan yang berkualiti menjadi lebih mudah, selaras dengan
            kehendak pemarkahan SPM.
          </p>

          {/* The golden topic box. Enter or the arrow starts the research. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onGenerate();
            }}
            className="flex w-full max-w-md items-center gap-2 rounded-full bg-[#fab915] py-1.5 pr-1.5 pl-6 shadow-md transition-shadow focus-within:ring-4 focus-within:ring-amber-300/60"
          >
            <label htmlFor="topic" className="sr-only">
              Tajuk karangan
            </label>
            <input
              ref={inputRef}
              id="topic"
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder="Taip tajuk karangan…"
              autoComplete="off"
              disabled={loading}
              className="min-w-0 flex-1 bg-transparent font-heading text-base font-bold text-[#422006] outline-none placeholder:font-semibold placeholder:text-[#422006]/55"
            />
            <button
              type="submit"
              disabled={loading || topic.trim() === ""}
              aria-label="Jana fakta 5W1H"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-[#422006] text-amber-300 outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <ArrowRight className="size-5" aria-hidden />
              )}
            </button>
          </form>

          <div className="mt-4">
            <QuickTopics onPick={onPickTopic} />
          </div>

          {researchFailed && (
            <div
              role="alert"
              className="mt-5 flex max-w-md items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4"
            >
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
              <div className="flex flex-col items-start gap-2 text-sm">
                <p className="font-medium">Penyelidikan gagal.</p>
                <p className="text-muted-foreground">
                  Sila semak sambungan internet anda dan cuba lagi.
                </p>
                <Button size="sm" onClick={onGenerate}>
                  Cuba lagi
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroIllustration className="aspect-[500/380] w-full max-w-[500px] overflow-hidden rounded-[2rem] border border-amber-100 shadow-lg dark:border-amber-900/40 dark:brightness-90" />
        </div>
      </section>

      {/* ---------- The six aspect tiles ---------- */}
      <section
        aria-label="Aspek 5W1H"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      >
        {ASPECTS.map((key) => {
          const Icon = ASPECT_ICONS[key];
          const busy = sectionLoading[key];
          const picked = selectedAspects.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleTile(key)}
              className="group relative flex items-center gap-4 p-6 text-left text-white outline-none transition-[filter] hover:brightness-110 focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset lg:p-7"
              style={{ backgroundColor: ASPECT_COLORS[key] }}
            >
              <span className="relative grid size-12 shrink-0 place-items-center rounded-xl border border-white/30 bg-white/20">
                <Icon className="size-6" aria-hidden />
                {busy ? (
                  <Loader2
                    className="absolute -top-1.5 -right-1.5 size-4 animate-spin"
                    aria-label="Sedang dimuatkan"
                  />
                ) : picked ? (
                  <span
                    className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-white"
                    style={{ color: ASPECT_COLORS[key] }}
                    aria-label="Ada fakta dipilih"
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                ) : null}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-heading text-lg leading-tight font-bold">
                  {SECTION_LABELS[key]}
                </span>
                <span className="text-xs leading-snug text-white/90">
                  {ASPECT_DESCRIPTIONS[key]}
                </span>
              </span>
              <ChevronRight
                className="ml-auto size-5 shrink-0 text-white/70 transition-transform group-hover:translate-x-1 group-hover:text-white"
                aria-hidden
              />
            </button>
          );
        })}
      </section>
    </div>
  );
}
