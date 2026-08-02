"use client";

// The mobile version of the sidebar. On small screens the desktop sidebar is
// hidden, so we show a hamburger (Menu) button that opens the same sidebar
// content inside a slide-in Dialog overlay.
import { useState } from "react";
import { Menu, X } from "lucide-react";

import type { SavedReport, SectionKey } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SidebarBody } from "@/components/layout/sidebar";

interface MobileSidebarProps {
  reports: SavedReport[];
  history: string[];
  activeAspect: SectionKey;
  onSelectAspect: (key: SectionKey) => void;
  onOpenReport: (id: string) => void;
  onPickHistory: (topic: string) => void;
  onDataChanged: () => void;
}

export function MobileSidebar(props: MobileSidebarProps) {
  // Whether the overlay is open. We control it so we can auto-close it after
  // the user picks an aspect, a report, or a past search.
  const [open, setOpen] = useState(false);

  // Wrap the handlers so tapping an item also closes the overlay.
  function handleSelectAspect(key: SectionKey) {
    setOpen(false);
    props.onSelectAspect(key);
  }
  function handleOpenReport(id: string) {
    setOpen(false);
    props.onOpenReport(id);
  }
  function handlePickHistory(topic: string) {
    setOpen(false);
    props.onPickHistory(topic);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Hamburger button (icon-only → needs a BM aria-label) */}
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Buka menu navigasi" />
        }
      >
        <Menu aria-hidden />
      </DialogTrigger>

      {/* Slide-in panel pinned to the left edge, full height. We turn off the
          default centred close button and add our own with a BM label. */}
      <DialogContent
        showCloseButton={false}
        className="fixed top-0 left-0 h-dvh max-h-none w-[280px] max-w-[85%] translate-x-0 translate-y-0 gap-0 rounded-none p-0"
      >
        {/* Base UI requires a title for the dialog; keep it for screen readers. */}
        <DialogTitle className="sr-only">Menu navigasi</DialogTitle>

        {/* Close control (icon-only → BM aria-label) */}
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tutup menu"
              className="absolute top-2 right-2 z-10"
            />
          }
        >
          <X aria-hidden />
        </DialogClose>

        {/* The same sidebar content used on desktop. */}
        <SidebarBody
          {...props}
          onSelectAspect={handleSelectAspect}
          onOpenReport={handleOpenReport}
          onPickHistory={handlePickHistory}
        />
      </DialogContent>
    </Dialog>
  );
}
