"use client";

// A small icon button that flips the app between light and dark mode.
// - useTheme() from next-themes tells us the *actual* theme in use
//   (resolvedTheme) and lets us change it (setTheme).
// - We show a Sun icon while in dark mode (click it to go bright), and a
//   Moon icon while in light mode (click it to go dark).
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
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
