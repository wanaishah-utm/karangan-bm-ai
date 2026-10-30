"use client";

// The row of actions at the bottom of a saved report:
//   Cetak            → open the browser print dialog
//   Muat turun DOCX  → build + download a Word file
//   Salin            → copy a plain-text version to the clipboard
//   Kongsi           → the device's share sheet (copies instead where the
//                      browser has no share sheet, e.g. most desktops)
//   (children)       → extra trailing buttons, e.g. the report's "Padam"
import { useState } from "react";
import type { ReactNode } from "react";
import { Printer, FileType, Copy, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import type { SavedReport } from "@/types";
import { Button } from "@/components/ui/button";
import { buildReportText } from "@/lib/export/report-text";
import { exportToDocx } from "@/lib/export/to-docx";

export function ExportButtons({
  report,
  children,
}: {
  report: SavedReport;
  children?: ReactNode;
}) {
  // True while the DOCX is being generated (disables the button + shows spinner).
  const [docxLoading, setDocxLoading] = useState(false);

  // Plain print → the user can pick any printer (incl. "Save as PDF").
  function handlePrint() {
    window.print();
  }

  // Build + download the Word document.
  async function handleDocx() {
    setDocxLoading(true);
    try {
      await exportToDocx(report);
      toast.success("Fail DOCX berjaya dimuat turun.");
    } catch {
      toast.error("Gagal menjana fail DOCX. Sila cuba lagi.");
    } finally {
      setDocxLoading(false);
    }
  }

  // Copy a plain-text version to the clipboard, with a graceful fallback.
  async function handleCopy() {
    const text = buildReportText(report);
    try {
      // The Clipboard API isn't available everywhere (e.g. non-HTTPS, old browsers).
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard-unavailable");
      }
      await navigator.clipboard.writeText(text);
      toast.success("Laporan disalin ke papan keratan.");
    } catch {
      toast.error("Papan keratan tidak tersedia. Sila salin teks secara manual.");
    }
  }

  // Share through the device's share sheet (WhatsApp, email, …). Without one,
  // fall back to copying. Closing the sheet (AbortError) is not an error.
  async function handleShare() {
    const text = buildReportText(report);
    if (!navigator.share) {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({ title: report.name, text });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Gagal berkongsi. Cuba Salin sebagai ganti.");
    }
  }

  return (
    // `no-print` so these controls don't appear on the printed page.
    <div className="no-print flex flex-wrap justify-center gap-2">
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer />
        Cetak
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDocx}
        disabled={docxLoading}
      >
        {docxLoading ? <Loader2 className="animate-spin" /> : <FileType />}
        {docxLoading ? "Menjana..." : "Muat turun DOCX"}
      </Button>
      <Button variant="outline" size="sm" onClick={handleCopy}>
        <Copy />
        Salin
      </Button>
      <Button variant="outline" size="sm" onClick={handleShare}>
        <Share2 />
        Kongsi
      </Button>
      {children}
    </div>
  );
}
