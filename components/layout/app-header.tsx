"use client";

// The header at the top of the white page card (Kuning Emas design):
//   left   – the three-chevron mark + "BM AI" (and, on small screens, the menu
//            button)
//   centre – Laman Utama / Modul 5W1H / Laporan / Simpanan (the current page is
//            a gold pill)
//   right  – light/dark toggle
//
// On small screens the centre links don't fit, so they move into a slide-in
// panel opened from the ☰ button (which is hidden on large screens).
//
// The header is exactly h-16 and sticky, so the results page's own sticky bar
// can pin right beneath it with `top-16`.
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronMark } from "@/components/layout/chevron-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export type AppView = "home" | "module" | "report" | "saved";

interface AppHeaderProps {
  view: AppView;
  onHome: () => void;
  onModule: () => void;
  onReport: () => void;
  onSaved: () => void;
  // Gold dot on "Laporan": a new report hasn't been opened from the nav yet.
  showReportDot: boolean;
}

export function AppHeader({
  view,
  onHome,
  onModule,
  onReport,
  onSaved,
  showReportDot,
}: AppHeaderProps) {
  // Whether the slide-in menu is open. Controlled so picking a link closes it.
  const [open, setOpen] = useState(false);

  const links: { label: string; view: AppView; onClick: () => void }[] = [
    { label: "Laman Utama", view: "home", onClick: onHome },
    { label: "Modul 5W1H", view: "module", onClick: onModule },
    { label: "Laporan", view: "report", onClick: onReport },
    { label: "Simpanan", view: "saved", onClick: onSaved },
  ];

  // A gold dot on "Laporan" after a new report, until it's opened.
  const dot = (link: { view: AppView }) =>
    link.view === "report" && showReportDot ? (
      <span aria-label="Laporan baharu" className="size-2 rounded-full bg-amber-500" />
    ) : null;

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-card/95 px-4 backdrop-blur sm:px-8">
      <div className="flex items-center gap-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Buka menu"
                className="-ml-2 text-amber-500 hover:text-amber-600 lg:hidden"
              />
            }
          >
            <Menu className="size-6" strokeWidth={2.5} aria-hidden />
          </DialogTrigger>

          {/* Slide-in panel pinned to the LEFT edge, full height. */}
          <DialogContent
            showCloseButton={false}
            className="fixed top-0 left-0 flex h-dvh max-h-none w-[300px] max-w-[85%] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-r border-amber-100 bg-warm p-0 dark:border-border"
          >
            <DialogTitle className="sr-only">Menu</DialogTitle>

            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Tutup menu"
                  className="absolute top-3 right-3 z-10"
                />
              }
            >
              <X aria-hidden />
            </DialogClose>

            <div className="flex items-center gap-3 border-b border-amber-100 px-4 py-4 dark:border-border">
              <ChevronMark />
              <span className="font-heading text-lg font-extrabold tracking-tight">BM AI</span>
            </div>

            <nav aria-label="Navigasi utama" className="flex flex-col gap-1 p-3">
              {links.map((link) => (
                <button
                  key={link.view}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    link.onClick();
                  }}
                  aria-current={view === link.view ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-left font-heading text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    view === link.view
                      ? "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"
                      : "text-muted-foreground hover:bg-amber-50 hover:text-foreground dark:hover:bg-amber-400/10",
                  )}
                >
                  {link.label}
                  {dot(link)}
                </button>
              ))}
            </nav>
          </DialogContent>
        </Dialog>

        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="BM AI — Laman Utama"
        >
          <ChevronMark />
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
          <span className="font-heading text-lg font-extrabold tracking-tight">
            BM AI
          </span>
        </button>
      </div>

      {/* Absolutely centred on the header (it's sticky, so it's the positioning
          parent): the logo side is wider than the toggle side, so plain
          justify-between would push the links off-centre. */}
      <nav
        aria-label="Navigasi utama"
        className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex"
      >
        {links.map((link) => {
          const active = view === link.view;
          return (
            <button
              key={link.view}
              type="button"
              onClick={link.onClick}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 font-heading text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-amber-100 font-bold text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"
                  : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
              {dot(link)}
            </button>
          );
        })}
      </nav>

      <ThemeToggle />
    </header>
  );
}
