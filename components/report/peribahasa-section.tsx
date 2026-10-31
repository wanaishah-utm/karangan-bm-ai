"use client";

// "Cadangan Peribahasa": the last block of a report. The teacher asks the AI
// for peribahasa that suit the report's facts; the server keeps only those
// PRPM DBP lists (see /api/peribahasa). Each comes with its meaning, an
// example sentence tied to the facts, the PRPM source it was confirmed in,
// and a link to look it up on PRPM. The suggestions are saved with the report.
//
// A "Sertakan dalam cetakan & muat turun" tick decides whether they appear on
// paper and in the DOCX / Salin / Kongsi versions (on by default). When it's
// off, the whole block is `no-print`.
import { useState } from "react";
import { BadgeCheck, ExternalLink, Loader2, Quote, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type { SavedReport, SectionKey } from "@/types";
import { BRAND_GOLD, BRAND_INK } from "@/lib/aspect-colors";
import { fetchPeribahasa } from "@/lib/research-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const SECTION_ORDER: SectionKey[] = [
  "siapa",
  "apa",
  "bila",
  "di_mana",
  "mengapa",
  "bagaimana",
];

// PRPM DBP's search page for one peribahasa, so teachers can check it.
function prpmUrl(peribahasa: string): string {
  return `https://prpm.dbp.gov.my/cari1?keyword=${encodeURIComponent(peribahasa)}`;
}

export function PeribahasaSection({
  report,
  onUpdate,
}: {
  report: SavedReport;
  onUpdate: (patch: Partial<SavedReport>) => void;
}) {
  const [loading, setLoading] = useState(false);

  const items = report.peribahasa ?? [];
  const include = report.printPeribahasa ?? true;

  async function generate() {
    const facts = SECTION_ORDER.flatMap((key) =>
      (report.sections[key] ?? []).map((card) => card.fact),
    );
    if (facts.length === 0) return;

    setLoading(true);
    try {
      const found = await fetchPeribahasa(report.topic, facts);
      if (found.length === 0) {
        toast.info("Tiada peribahasa yang sesuai ditemui. Sila cuba lagi.");
        return;
      }
      onUpdate({ peribahasa: found, printPeribahasa: include });
      toast.success(`${found.length} cadangan peribahasa dijana.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ralat tidak diketahui.";
      toast.error(`Gagal menjana peribahasa: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  // ---- Nothing generated yet: an invitation (screen only) ----
  if (items.length === 0) {
    return (
      <section className="no-print flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 px-5 py-6 text-center dark:border-amber-400/30 dark:bg-amber-400/5">
        <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
          <Quote className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-base font-bold">Cadangan Peribahasa</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Dapatkan peribahasa yang sesuai dengan fakta dalam laporan ini,
            lengkap dengan maksud dan contoh ayat.
          </p>
        </div>
        <Button onClick={generate} disabled={loading} className="rounded-full font-heading font-bold">
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          {loading ? "Menjana…" : "Jana cadangan peribahasa"}
        </Button>
      </section>
    );
  }

  // ---- The suggestions ----
  return (
    <section
      className={cn("report-aspect flex flex-col gap-2", !include && "no-print")}
      aria-label="Cadangan Peribahasa"
    >
      <h3
        className="report-peribahasa-head flex items-center gap-2 rounded-xl px-5 py-3 font-heading text-base font-bold"
        style={{ backgroundColor: BRAND_GOLD, color: BRAND_INK }}
      >
        <Quote className="size-4" aria-hidden />
        Cadangan Peribahasa
        <span className="ml-auto rounded-full bg-black/10 px-3 py-0.5 text-xs font-semibold">
          {items.length} Peribahasa
        </span>
      </h3>

      {/* Controls (screen only): include on paper / in exports, regenerate. */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 px-1">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={include}
            onCheckedChange={(checked) => onUpdate({ printPeribahasa: checked })}
          />
          Sertakan dalam cetakan &amp; muat turun
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={generate}
          disabled={loading}
          className="text-muted-foreground"
        >
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
          {loading ? "Menjana…" : "Jana semula"}
        </Button>
      </div>

      <ul className={cn("flex flex-col gap-3", loading && "opacity-60")}>
        {items.map((item) => (
          <li
            key={item.id}
            className="report-fact rounded-2xl border-[1.5px] border-amber-200 bg-amber-50/70 px-5 py-4 dark:border-amber-400/25 dark:bg-amber-400/5"
          >
            <p className="font-heading font-bold text-foreground">“{item.peribahasa}”</p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground">
              <span className="font-semibold">Maksud:</span> {item.maksud}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Contoh:</span>{" "}
              <span className="italic">{item.contoh}</span>
            </p>
            <div className="report-fact-meta mt-2 flex flex-wrap items-center justify-between gap-2">
              {/* Where PRPM DBP lists it (suggestions saved before the PRPM
                  check existed have no source). */}
              {item.sumber ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {item.sumber}
                </span>
              ) : (
                <span />
              )}
              <a
                href={prpmUrl(item.peribahasa)}
                target="_blank"
                rel="noopener noreferrer"
                className="no-print ml-auto inline-flex items-center gap-1 rounded-sm text-xs font-medium text-amber-800 underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-300"
              >
                Semak di PRPM DBP
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
