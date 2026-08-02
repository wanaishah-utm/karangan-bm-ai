"use client";

// One research "fact card". The teacher ticks the ones they want to keep.
// - The whole card is clickable to toggle selection.
// - The source link inside must NOT toggle the card, so we stopPropagation on it.
import { ChartBar, TriangleAlert, ExternalLink } from "lucide-react";

import type { FactCard as FactCardType } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// The exact text our sample data uses when no statistic is available.
// We compare against it to decide which icon/style to show.
const NO_STAT = "Tiada statistik rasmi ditemui";

interface FactCardProps {
  card: FactCardType;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function FactCard({ card, selected, onToggle }: FactCardProps) {
  const hasStat = card.statistic !== NO_STAT;

  return (
    // The WHOLE card is the checkbox control: role="checkbox" + aria-checked make
    // it announce correctly, tabIndex=0 makes it focusable, and the keydown
    // handler lets keyboard users toggle it with Enter or Space.
    <Card
      role="checkbox"
      aria-checked={selected}
      aria-label={`Pilih fakta: ${card.fact}`}
      tabIndex={0}
      onClick={() => onToggle(card.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); // stop Space from scrolling the page
          onToggle(card.id);
        }
      }}
      className={cn(
        "cursor-pointer transition-shadow hover:ring-foreground/20",
        // Clear, visible focus ring for keyboard users.
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Highlight the card with a primary-coloured ring when selected.
        selected && "ring-2 ring-primary",
      )}
    >
      <CardContent className="flex gap-3">
        {/* Purely visual now — the Card itself is the accessible control, so we
            hide this from screen readers and take it out of the tab order. */}
        <Checkbox
          checked={selected}
          aria-hidden
          tabIndex={-1}
          className="pointer-events-none mt-0.5"
        />

        <div className="flex flex-col gap-2">
          {/* The main fact */}
          <p className="font-medium">{card.fact}</p>

          {/* The statistic line: chart icon if we have one, warning if we don't */}
          <p
            className={cn(
              "flex items-center gap-1.5 text-sm",
              hasStat ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {hasStat ? (
              <ChartBar className="size-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
            )}
            <span>{card.statistic}</span>
          </p>

          {/* A recent, real-world case in smaller muted text */}
          <p className="text-xs text-muted-foreground">{card.currentCase}</p>
        </div>
      </CardContent>

      {/* Footer: "Sumber: {source} · {year}" with the source as an external link */}
      <CardFooter className="text-xs text-muted-foreground">
        <span>
          Sumber:{" "}
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Sumber: ${card.source} (buka dalam tab baharu)`}
            // Clicking the link opens the source, it must not toggle the card.
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-sm font-medium text-foreground outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {card.source}
            <ExternalLink className="size-3" aria-hidden />
          </a>{" "}
          · {card.year ?? "Tiada tahun"}
        </span>
      </CardFooter>
    </Card>
  );
}
