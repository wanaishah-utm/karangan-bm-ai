"use client";

// A small icon button that flips the app between light and dark mode.
// - useTheme() from next-themes tells us the *actual* theme in use
//   (resolvedTheme) and lets us change it (setTheme).
// - We show a Sun icon while in dark mode (click it to go bright), and a
//   Moon icon while in light mode (click it to go dark). Both icons are always
//   rendered and CSS (`dark:`) picks the visible one: the server doesn't know
//   the theme, so choosing the icon in JS would make the server HTML and the
//   first browser render differ (a hydration error).
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Is the app currently showing the dark theme?
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Tukar mod gelap" // BM for "Toggle dark mode" — helps screen readers
      className="rounded-full border bg-muted/50"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" aria-hidden />
      <Moon className="dark:hidden" aria-hidden />
    </Button>
  );
}
