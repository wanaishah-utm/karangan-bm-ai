"use client";

// A single 5W1H section (e.g. "Siapa"). It shows a labelled badge with a
// "chosen / total" counter, the list of fact cards, and a "Muat lagi" button
// that asks the AI for MORE cards for this section only.
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import type { SectionKey, FactCard as FactCardType } from "@/types";
import { SECTION_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FactCard } from "@/components/research/fact-card";

interface SectionProps {
  sectionKey: SectionKey;
  cards: FactCardType[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  // Ask the parent to fetch more cards for THIS section.
  onLoadMore: (sectionKey: SectionKey) => void;
  // True while this section's FIRST batch is still loading (show skeletons).
  loading?: boolean;
  // True while a "Muat lagi" request is in flight (spinner on the button).
  loadingMore?: boolean;
}

export function Section({
  sectionKey,
  cards,
  selectedIds,
  onToggle,
  onLoadMore,
  loading = false,
  loadingMore = false,
}: SectionProps) {
  // How many of this section's cards are currently ticked.
  const selectedCount = cards.filter((card) => selectedIds.has(card.id)).length;

  // Show placeholder skeletons only during the very first load (no cards yet).
  const showSkeletons = loading && cards.length === 0;

  return (
    <section className="flex flex-col gap-3">
      {/* Section heading: the BM label as a REAL heading (rendered as <h4> so
          the six 5W1H headings are proper, in-order headings), plus a counter. */}
      <div className="flex items-center gap-2">
        <Badge render={<h4 />}>{SECTION_LABELS[sectionKey]}</Badge>
        <span className="text-xs text-muted-foreground">
          {selectedCount}/{cards.length} dipilih
        </span>
      </div>

      {showSkeletons ? (
        // Three grey placeholder cards while we wait for the first response.
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        // Card list. The parent controls the stagger; each child animates itself.
        <motion.div
          className="grid gap-3"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          {cards.map((card) => (
            <motion.div
              key={card.id}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <FactCard
                card={card}
                selected={selectedIds.has(card.id)}
                onToggle={onToggle}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* "Muat lagi" (Load more): only useful once the first batch has arrived. */}
      {!showSkeletons && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLoadMore(sectionKey)}
            disabled={loadingMore || loading}
          >
            {loadingMore && <Loader2 className="animate-spin" />}
            Muat lagi
          </Button>
        </div>
      )}
    </section>
  );
}
