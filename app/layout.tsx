import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Our own client component that provides light/dark theme to the whole app.
import { ThemeProvider } from "@/components/layout/theme-provider";
// shadcn's tooltip provider — needed once, high up, so tooltips work app-wide.
import { TooltipProvider } from "@/components/ui/tooltip";
// Toast notifications. Mounted here so toasts work on EVERY page/view.
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Page metadata (shown in the browser tab and by search engines / link previews).
export const metadata: Metadata = {
  title: "Karangan BM AI Assistant",
  description:
    "Jana bahan karangan Bahasa Melayu mengikut kerangka 5W1H daripada sumber rasmi — lengkap dengan fakta, statistik dan rujukan.",
};

// Viewport settings so the app scales correctly on mobile devices.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      // lang="ms" = Bahasa Melayu. suppressHydrationWarning stops React from
      // warning about the theme class next-themes adds before hydration.
      lang="ms"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* ThemeProvider must be outermost so every child can read the theme. */}
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          {/* Toaster lives inside ThemeProvider so toasts follow light/dark mode. */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
