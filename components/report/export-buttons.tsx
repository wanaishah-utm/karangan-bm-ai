"use client";

// A row of export buttons shown on a saved report:
//   Cetak            → open the browser print dialog
//   Simpan PDF       → print dialog again, with a hint to pick "Save as PDF"
//   Muat turun DOCX  → build + download a Word file
//   Salin            → copy a plain-text version to the clipboard
import { useState } from "react";
import { Printer, FileDown, FileType, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { SavedReport } from "@/types";
import { Button } from "@/components/ui/button";
import { buildReportText } from "@/lib/export/report-text";
import { exportToDocx } from "@/lib/export/to-docx";

export function ExportButtons({ report }: { report: SavedReport }) {
  // True while the DOCX is being generated (disables the button + shows spinner).
  const [docxLoading, setDocxLoading] = useState(false);

  // Plain print → the user can pick any printer.
  function handlePrint() {
    window.print();
  }

  // "Save PDF" is really just printing — most browsers offer "Save as PDF" as a
  // print destination, so we tell the user that, then open the print dialog.
  function handlePdf() {
    toast.info('Dalam dialog cetak, pilih "Simpan sebagai PDF" sebagai destinasi.');
    // Small delay so the toast is visible before the print dialog blocks the page.
    setTimeout(() => window.print(), 400);
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

  return (
    // `no-print` so these controls don't appear on the printed page.
    <div className="no-print flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer />
        Cetak
      </Button>
      <Button variant="outline" size="sm" onClick={handlePdf}>
        <FileDown />
        Simpan PDF
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
    </div>
  );
}
