"use client";

// A single 5W1H section (e.g. "Siapa"). It shows a labelled badge with a
// "chosen / total" counter and the list of fact cards. The navigation row
// (Sebelumnya / Muat lagi / Seterusnya / Jana laporan) lives in the page below
// this component, since it spans the whole results view — not just one section.
import { motion } from "framer-motion";

import type { SectionKey, FactCard as FactCardType } from "@/types";
import { SECTION_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FactCard } from "@/components/research/fact-card";

interface SectionProps {
  sectionKey: SectionKey;
  cards: FactCardType[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  // True while this section's FIRST batch is still loading (show skeletons).
  loading?: boolean;
}

export function Section({
  sectionKey,
  cards,
  selectedIds,
  onToggle,
  loading = false,
}: SectionProps) {
  // How many of this section's cards are currently ticked.
  const selectedCount = cards.filter((card) => selectedIds.has(card.id)).length;

  // Show placeholder skeletons only during the very first load (no cards yet).
  const showSkeletons = loading && cards.length === 0;

  return (
    // The id is the jump target for the section-jump buttons; scroll-mt leaves a
    // little breathing room above the heading when we scroll to it.
    <section id={`section-${sectionKey}`} className="flex scroll-mt-4 flex-col gap-3">
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
      ) : cards.length === 0 ? (
        // Loaded, but the AI found no distinct facts for this aspect. This is a
        // calm empty state — "Muat lagi" (in the page's nav row) is still there.
        <p className="text-sm text-muted-foreground">
          Tiada fakta baharu ditemui untuk aspek ini.
        </p>
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
    </section>
  );
}
