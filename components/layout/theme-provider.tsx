"use client";

// This component wraps the whole app so that light/dark mode works everywhere.
// It uses the "next-themes" library, which:
//   - reads the user's system (OS) preference,
//   - remembers the user's manual choice, and
//   - adds a CSS class ("light" or "dark") onto the <html> element.
// Any component below this one can then read/change the theme with useTheme().
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class" // switch themes by toggling a class on <html> (matches our Tailwind .dark styles)
      defaultTheme="system" // start out following the operating system's setting
      enableSystem // allow the app to follow the OS light/dark preference
    >
      {children}
    </NextThemesProvider>
  );
}
