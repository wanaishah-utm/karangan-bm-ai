"use client";

// "Mod Paparan Kelas" — a full-screen overlay that projects facts one at a time,
// big enough to read from the back of a classroom.
//
// It's rendered by the parent only while active (e.g. {open && <ClassroomMode/>}),
// so this component's whole lifetime = "open". On mount it grabs fullscreen and
// focus; on unmount it releases fullscreen, restores focus, and removes listeners.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Shuffle,
  ArrowLeft,
  ArrowRight,
  ChartBar,
  Newspaper,
  TriangleAlert,
} from "lucide-react";

import type { FactCard, SectionKey } from "@/types";
import { SECTION_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// One projectable fact plus which 5W1H aspect it belongs to.
export interface ClassroomItem {
  card: FactCard;
  sectionKey: SectionKey;
}

const NO_STAT = "Tiada statistik rasmi ditemui";

// A statistic/current-case counts as "empty" if blank or starting with "Tiada".
function hasContent(text: string, emptyMarker?: string): boolean {
  const trimmed = text.trim();
  if (trimmed === "") return false;
  if (emptyMarker && trimmed === emptyMarker) return false;
  return !/^tiada/i.test(trimmed);
}

// Show a readable domain instead of the full (unclickable) projected URL.
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Fisher–Yates shuffle of [0..n-1].
function shuffledIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function ClassroomMode({
  items,
  onClose,
}: {
  items: ClassroomItem[];
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Keep the latest onClose without re-running the mount effect.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const [index, setIndex] = useState(0); // position within `order`
  const [shuffle, setShuffle] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [reduced, setReduced] = useState(false);

  // The order we step through: sequential, or a shuffled permutation.
  const order = useMemo(
    () => (shuffle ? shuffledIndices(items.length) : items.map((_, i) => i)),
    [shuffle, items],
  );

  // Keep the current length in a ref so the (once-registered) key handler can
  // wrap around without going stale.
  const lengthRef = useRef(order.length);
  useEffect(() => {
    lengthRef.current = order.length;
  }, [order.length]);

  const hasItems = items.length > 0;
  const current = hasItems ? items[order[index]] : undefined;

  // Detect reduced-motion (used to keep the controls always visible).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Mount: fullscreen + focus + keyboard. Unmount: undo all of it.
  useEffect(() => {
    const container = containerRef.current;
    // Remember what was focused so we can restore it on exit.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    // Try the Fullscreen API; if it's unavailable/denied, the fixed overlay
    // still covers the whole screen as a fallback.
    let enteredFullscreen = false;
    container?.requestFullscreen?.().then(
      () => {
        enteredFullscreen = true;
      },
      () => {
        /* ignore — fallback overlay is fine */
      },
    );

    function go(delta: number) {
      const len = lengthRef.current;
      if (len === 0) return;
      setIndex((i) => (i + delta + len) % len); // wrap around
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault(); // Space must not scroll the page
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Tab" && container) {
        // Focus trap: keep Tab within the overlay's buttons.
        const focusables = container.querySelectorAll<HTMLElement>(
          "button:not([disabled])",
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    // If the user leaves fullscreen (e.g. native Esc), close the overlay too.
    function onFullscreenChange() {
      if (enteredFullscreen && !document.fullscreenElement) onCloseRef.current();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      // Remove the fullscreen listener BEFORE exiting, so our own exit doesn't
      // re-trigger onClose.
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("keydown", onKeyDown);
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      previouslyFocused?.focus?.(); // restore focus to the trigger button
    };
  }, []);

  // Auto-hide the controls after a few seconds; show them again on activity.
  // Skipped under reduced motion (controls stay put).
  useEffect(() => {
    if (reduced) return;
    let timer = window.setTimeout(() => setControlsVisible(false), 3000);
    const show = () => {
      setControlsVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setControlsVisible(false), 3000);
    };
    window.addEventListener("mousemove", show);
    window.addEventListener("keydown", show);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", show);
      window.removeEventListener("keydown", show);
    };
  }, [reduced]);

  // On-screen navigation helpers (buttons).
  function goBy(delta: number) {
    const len = lengthRef.current;
    if (len === 0) return;
    setIndex((i) => (i + delta + len) % len);
  }

  // Controls fade classes (no transition under reduced motion).
  const controlsClass = cn(
    reduced ? "" : "transition-opacity duration-300",
    controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
  );

  const aspectLabel = current ? SECTION_LABELS[current.sectionKey] : "";
  const statHas = current ? hasContent(current.card.statistic, NO_STAT) : false;
  const caseHas = current ? hasContent(current.card.currentCase) : false;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Mod Paparan Kelas"
      className="no-print fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background text-foreground"
    >
      {/* Polite announcement of the current card for screen readers. */}
      <p className="sr-only" role="status" aria-live="polite">
        {hasItems
          ? `Kad ${index + 1} daripada ${items.length}. ${aspectLabel}: ${current!.card.fact}`
          : "Tiada fakta untuk dipaparkan."}
      </p>

      {/* Top bar: progress + shuffle toggle + close. */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 p-4 sm:p-6",
          controlsClass,
        )}
      >
        <span className="text-lg font-medium tabular-nums sm:text-2xl">
          {hasItems ? `${index + 1} / ${items.length}` : "0 / 0"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant={shuffle ? "default" : "outline"}
            size="sm"
            aria-pressed={shuffle}
            aria-label="Rawak susunan fakta"
            onClick={() => {
              setShuffle((s) => !s);
              setIndex(0); // restart from the first card of the new order
            }}
          >
            <Shuffle aria-hidden />
            Rawak
          </Button>
          <Button
            ref={closeButtonRef}
            variant="outline"
            size="icon"
            aria-label="Tutup mod paparan kelas"
            onClick={() => onClose()}
          >
            <X aria-hidden />
          </Button>
        </div>
      </div>

      {/* Centre: the current fact (or a message when there's nothing to show). */}
      {!hasItems || !current ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <p className="text-2xl font-medium sm:text-3xl">
            Tiada fakta untuk dipaparkan. Sila pilih fakta atau jana penyelidikan
            dahulu.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center sm:px-12">
          {/* Aspect badge (emerald) */}
          <span className="inline-block rounded-full bg-primary px-5 py-1.5 font-semibold text-primary-foreground [font-size:clamp(1rem,2.5vw,1.75rem)]">
            {aspectLabel}
          </span>

          {/* The fact — very large, fluid size. */}
          <p className="max-w-5xl font-semibold leading-tight [font-size:clamp(2rem,5vw,4rem)]">
            {current.card.fact}
          </p>

          {/* Statistic + current case, each with its icon. */}
          <div className="flex flex-col gap-4 [font-size:clamp(1rem,2.5vw,1.75rem)]">
            <p
              className={cn(
                "flex items-center justify-center gap-3",
                statHas ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {statHas ? (
                <ChartBar className="size-[1.2em] shrink-0 text-primary" aria-hidden />
              ) : (
                <TriangleAlert className="size-[1.2em] shrink-0" aria-hidden />
              )}
              <span>{current.card.statistic}</span>
            </p>
            <p
              className={cn(
                "flex items-center justify-center gap-3",
                caseHas ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {caseHas ? (
                <Newspaper className="size-[1.2em] shrink-0 text-primary" aria-hidden />
              ) : (
                <TriangleAlert className="size-[1.2em] shrink-0" aria-hidden />
              )}
              <span>{current.card.currentCase}</span>
            </p>
          </div>

          {/* Source name, year, and the plain domain (links aren't clickable here). */}
          <p className="text-muted-foreground [font-size:clamp(0.9rem,2vw,1.25rem)]">
            {current.card.source} ({current.card.year ?? "Tiada tahun"}) ·{" "}
            {domainOf(current.card.url)}
          </p>
        </div>
      )}

      {/* Bottom: large previous/next buttons. */}
      {hasItems && (
        <div className={cn("flex justify-between gap-4 p-4 sm:p-6", controlsClass)}>
          <Button
            variant="outline"
            size="lg"
            className="text-lg"
            aria-label="Fakta sebelum"
            onClick={() => goBy(-1)}
          >
            <ArrowLeft aria-hidden />
            Sebelum
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-lg"
            aria-label="Fakta seterusnya"
            onClick={() => goBy(1)}
          >
            Seterusnya
            <ArrowRight aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
