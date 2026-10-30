// A signature colour for each 5W1H aspect. These are used everywhere the aspect
// appears — its landing tile, its tab on the results page, the tint of its
// result cards and its title bar in the report — so colour alone tells the
// student which aspect they're looking at.
//
// The values are fixed (not theme tokens) on purpose: saturated colours read as
// vivid on both the light and the dark background, and all six are dark enough
// that white bold labels stay legible on them.
import type { SectionKey } from "@/types";

// The brand: golden yellow, always paired with dark-brown text for contrast
// (white on yellow fails WCAG). Used for the "Cadangan Peribahasa" title bar.
export const BRAND_GOLD = "#EAB308";
export const BRAND_INK = "#422006";

export const ASPECT_COLORS: Record<SectionKey, string> = {
  siapa: "#2563eb", // blue
  apa: "#7c3aed", // violet
  bila: "#ea580c", // orange
  di_mana: "#0e7490", // deep cyan
  mengapa: "#dc2626", // red
  bagaimana: "#db2777", // pink
};

// A translucent wash of an aspect colour over the current background — used for
// the soft card tint. `pct` is how much colour to mix in (0–100).
export function aspectTint(color: string, pct: number): string {
  return `color-mix(in oklch, ${color} ${pct}%, transparent)`;
}
