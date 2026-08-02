import type { ResearchResult } from "@/types";

// ⚠️ PLACEHOLDER DATA ONLY ⚠️
// Everything below is hand-written sample content for the topic "Rasuah"
// (corruption). It lets us build and test the UI before the real AI + web
// search is wired up in a later phase. The facts, statistics, cases, sources
// and URLs are illustrative and should NOT be treated as verified references.
//
// Layout rule we follow on purpose: in EVERY section, exactly ONE of the two
// cards uses the statistic "Tiada statistik rasmi ditemui" so the UI's
// "no statistic" state is always visible during testing.
export const SAMPLE_RESULT: ResearchResult = {
  topic: "Rasuah",
  generatedAt: "2026-08-02T00:00:00.000Z",
  sections: {
    // SIAPA — who is involved
    siapa: [
      {
        id: "siapa-1",
        fact: "Suruhanjaya Pencegahan Rasuah Malaysia (SPRM) ialah agensi utama yang menyiasat dan mencegah rasuah di Malaysia.",
        statistic: "SPRM menerima 8,000 aduan rasuah pada tahun 2024.",
        currentCase: "SPRM menahan beberapa penjawat awam berprofil tinggi dalam siasatan salah guna kuasa baru-baru ini.",
        source: "SPRM",
        url: "https://www.sprm.gov.my/",
        year: 2024,
      },
      {
        id: "siapa-2",
        fact: "Rasuah membabitkan pemberi dan penerima, termasuk penjawat awam, ahli politik dan pihak swasta.",
        statistic: "Tiada statistik rasmi ditemui",
        currentCase: "Beberapa kes melibatkan orang tengah yang menguruskan suapan bagi pihak kontraktor swasta.",
        source: "Bernama",
        url: "https://www.bernama.com/bm/",
        year: 2025,
      },
    ],
    // APA — what corruption is
    apa: [
      {
        id: "apa-1",
        fact: "Rasuah ialah perbuatan meminta, menerima atau memberi suapan untuk mempengaruhi sesuatu keputusan atau tindakan.",
        statistic: "Malaysia mendapat skor 50/100 dalam Indeks Persepsi Rasuah (CPI) 2024.",
        currentCase: "Isu integriti dalam perolehan kerajaan sering dibangkitkan dalam laporan Ketua Audit Negara.",
        source: "Transparency International",
        url: "https://www.transparency.org/en/cpi/2024",
        year: 2024,
      },
      {
        id: "apa-2",
        fact: "Rasuah merangkumi pelbagai bentuk seperti suapan wang, pemberian hadiah, salah guna kuasa dan penyelewengan dana.",
        statistic: "Tiada statistik rasmi ditemui",
        currentCase: "Kes penyelewengan dana bantuan kebajikan telah dilaporkan di beberapa negeri.",
        source: "SPRM",
        url: "https://www.sprm.gov.my/index.php?page_id=99",
        year: 2025,
      },
    ],
    // BILA — when / time trends
    bila: [
      {
        id: "bila-1",
        fact: "Kes rasuah dilaporkan meningkat pada tahun-tahun kebelakangan ini seiring dengan usaha penguatkuasaan yang lebih agresif.",
        statistic: "Bilangan pertuduhan rasuah meningkat kepada 1,200 kes pada 2024 berbanding tahun sebelumnya.",
        currentCase: "Kempen kesedaran anti-rasuah dipergiat menjelang tahun 2026.",
        source: "SPRM",
        url: "https://www.sprm.gov.my/index.php?page_id=100",
        year: 2024,
      },
      {
        id: "bila-2",
        fact: "Rasuah sering meningkat pada waktu tertentu seperti musim perolehan projek besar dan pilihan raya.",
        statistic: "Tiada statistik rasmi ditemui",
        currentCase: "Pemantauan diperketat pada tempoh pengagihan geran projek pembangunan 2025.",
        source: "Bernama",
        url: "https://www.bernama.com/bm/am/news.php",
        year: 2025,
      },
    ],
    // DI MANA — where it happens
    di_mana: [
      {
        id: "di_mana-1",
        fact: "Rasuah boleh berlaku dalam sektor awam mahupun swasta, termasuk perolehan, penguatkuasaan dan perkhidmatan pelesenan.",
        statistic: "Sektor pentadbiran awam mencatat kadar aduan rasuah tertinggi pada 2024.",
        currentCase: "Beberapa pihak berkuasa tempatan menjadi tumpuan siasatan berkaitan kelulusan permit.",
        source: "SPRM",
        url: "https://www.sprm.gov.my/index.php?page_id=101",
        year: 2024,
      },
      {
        id: "di_mana-2",
        fact: "Kawasan bandar yang pesat membangun berisiko tinggi kerana nilai projek pembangunan yang besar.",
        statistic: "Tiada statistik rasmi ditemui",
        currentCase: "Projek infrastruktur di beberapa negeri dipantau rapi bagi mengelak salah guna dana.",
        source: "DOSM",
        url: "https://www.dosm.gov.my/",
        year: 2025,
      },
    ],
    // MENGAPA — why it happens
    mengapa: [
      {
        id: "mengapa-1",
        fact: "Rasuah berpunca daripada faktor seperti tamak, gaji rendah, lemah penguatkuasaan dan budaya 'cari jalan mudah'.",
        statistic: "Kira-kira 60% responden dalam satu tinjauan menganggap rasuah sebagai masalah serius negara.",
        currentCase: "Program integriti diperkenalkan di jabatan kerajaan bagi menangani punca dalaman rasuah.",
        source: "Transparency International",
        url: "https://www.transparency.org/en/countries/malaysia",
        year: 2024,
      },
      {
        id: "mengapa-2",
        fact: "Kekurangan ketelusan dan sistem pemantauan yang lemah memberi ruang kepada amalan rasuah berleluasa.",
        statistic: "Tiada statistik rasmi ditemui",
        currentCase: "Cadangan memperkasa perlindungan pemberi maklumat (whistleblower) terus dibincangkan.",
        source: "Bernama",
        url: "https://www.bernama.com/bm/",
        year: 2026,
      },
    ],
    // BAGAIMANA — how to address it
    bagaimana: [
      {
        id: "bagaimana-1",
        fact: "Rasuah boleh dibendung melalui penguatkuasaan undang-undang tegas, pendidikan nilai murni dan sistem yang telus.",
        statistic: "Lebih 500 program kesedaran anti-rasuah dianjurkan di seluruh negara pada 2024.",
        currentCase: "Modul integriti diperkenalkan di sekolah dan institusi pengajian tinggi.",
        source: "SPRM",
        url: "https://www.sprm.gov.my/index.php?page_id=102",
        year: 2024,
      },
      {
        id: "bagaimana-2",
        fact: "Digitalisasi urus niaga kerajaan seperti pembayaran dalam talian mengurangkan peluang berlakunya suapan.",
        statistic: "Tiada statistik rasmi ditemui",
        currentCase: "Sistem e-perolehan diperluas bagi meningkatkan ketelusan dalam kontrak kerajaan.",
        source: "DOSM",
        url: "https://www.dosm.gov.my/portal-main/landingv2",
        year: 2025,
      },
    ],
  },
};
