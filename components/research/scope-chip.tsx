// The small "Dalam negara" / "Luar negara" label at the bottom-left of a fact
// card (results page and report). Cyan with a map pin for local facts, violet
// with a globe for international ones — the same colours as the filter.
// Screen only: printed reports leave the label out (`no-print`).
import { Globe, MapPin } from "lucide-react";

import type { FactScope } from "@/types";
import { SCOPE_LABELS } from "@/types";
import { cn } from "@/lib/utils";

export function ScopeChip({ scope }: { scope: FactScope }) {
  const Icon = scope === "dalam" ? MapPin : Globe;
  return (
    <span
      className={cn(
        "no-print inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        scope === "dalam"
          ? "border-cyan-100 bg-cyan-50 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300"
          : "border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {SCOPE_LABELS[scope]}
    </span>
  );
}
