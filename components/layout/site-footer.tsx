"use client";

// The dark strip at the bottom of the page card. Its three links open short
// dialogs (there are no separate pages for them) describing how the app treats
// data, the terms of use, and how to use it.
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SECTIONS: { label: string; title: string; body: ReactNode }[] = [
  {
    label: "Dasar Privasi",
    title: "Dasar Privasi",
    body: (
      <>
        <p>
          Laporan dan sejarah carian anda disimpan dalam pelayar ini sahaja
          (storan tempatan). Tiada akaun dan tiada pangkalan data pelayan.
        </p>
        <p>
          Tajuk karangan yang anda taip dihantar ke perkhidmatan AI (OpenAI)
          untuk mencari fakta. Jangan masukkan maklumat peribadi dalam tajuk.
        </p>
      </>
    ),
  },
  {
    label: "Terma Penggunaan",
    title: "Terma Penggunaan",
    body: (
      <>
        <p>
          Fakta dijana oleh AI daripada carian web dan mungkin mengandungi
          kesilapan. Sila sahkan setiap fakta dengan sumber asal sebelum
          digunakan dalam karangan atau bahan pengajaran.
        </p>
        <p>Aplikasi ini ialah alat bantu pembelajaran, bukan sumber rasmi.</p>
      </>
    ),
  },
  {
    label: "Bantuan & FAQ",
    title: "Cara menggunakan",
    body: (
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Taip tajuk karangan di Laman Utama dan tekan anak panah.</li>
        <li>
          Pilih aspek 5W1H (Siapa, Apa, Bila, Di mana, Mengapa, Bagaimana) untuk
          melihat faktanya.
        </li>
        <li>
          Tapis mengikut Dalam negara atau Luar negara, dan tekan Muat lagi untuk
          5 fakta tambahan.
        </li>
        <li>Tandakan fakta yang sesuai, kemudian tekan Jana Laporan.</li>
        <li>Cetak, muat turun DOCX, salin atau kongsi laporan anda.</li>
      </ol>
    ),
  },
];

export function SiteFooter() {
  return (
    <footer className="no-print flex flex-col items-center justify-between gap-3 bg-slate-900 px-6 py-5 text-xs text-slate-400 sm:flex-row sm:px-10">
      <p className="flex items-center gap-2 text-center sm:text-left">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-amber-400" />
        <span>
          <span className="font-heading font-bold tracking-wide text-white">
            Karangan BM AI
          </span>{" "}
          © {new Date().getFullYear()} Hak Cipta Terpelihara. SPM KSSM Pintar.
        </span>
      </p>

      <nav aria-label="Maklumat" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        {SECTIONS.map((s) => (
          <Dialog key={s.label}>
            <DialogTrigger className="rounded-sm font-medium text-slate-300 outline-none transition-colors hover:text-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400">
              {s.label}
            </DialogTrigger>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>{s.title}</DialogTitle>
                <DialogDescription render={<div />} className="space-y-2">
                  {s.body}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Tutup</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ))}
      </nav>
    </footer>
  );
}
