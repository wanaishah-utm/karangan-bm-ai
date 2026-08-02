// Builds the instruction text (the "prompt") we send to the AI for ONE section.
// Keeping this in its own file makes it easy to read and tweak the wording
// without touching the API route logic.
import type { SectionKey } from "@/types";
import { SECTION_LABELS } from "@/types";

// A short Bahasa Melayu explanation of what each 5W1H angle means for a
// karangan, so the AI knows what kind of facts to look for per section.
const ANGLE_MEANINGS: Record<SectionKey, string> = {
  siapa:
    "pihak, individu, tokoh, agensi atau organisasi yang terlibat atau bertanggungjawab",
  apa: "definisi, konsep, jenis, bentuk atau ciri utama isu tersebut",
  bila: "masa, tempoh, aliran (trend) atau peristiwa penting yang berkaitan",
  di_mana:
    "lokasi, tempat, sektor, negeri atau negara di mana isu ini berlaku atau memberi kesan",
  mengapa: "sebab, punca atau faktor yang mendorong berlakunya isu ini",
  bagaimana:
    "cara, langkah, kesan atau penyelesaian yang berkaitan dengan isu ini",
};

export function buildSectionPrompt(
  topic: string,
  sectionKey: SectionKey,
  count: number,
  existingFacts: string[],
): string {
  const label = SECTION_LABELS[sectionKey]; // BM label, e.g. "Mengapa"
  const meaning = ANGLE_MEANINGS[sectionKey];

  // List the facts we already have so the AI can avoid repeating them.
  const existingBlock =
    existingFacts.length > 0
      ? existingFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")
      : "(tiada lagi — ini permintaan pertama)";

  return `Anda ialah pembantu penyelidik untuk guru Bahasa Melayu yang menyediakan bahan karangan KSSM/SPM. Tugas anda ialah mengumpul fakta yang SAHIH dan boleh disemak untuk membantu pelajar menulis karangan.

TAJUK KARANGAN: "${topic}"
SUDUT 5W1H: ${label} — iaitu ${meaning}.

PERATURAN WAJIB:
1. WAJIB gunakan carian web (web search) untuk mencari maklumat terkini dan sahih. JANGAN sekali-kali mereka-reka fakta, statistik, kes, URL atau tahun.
2. Utamakan sumber rasmi dan berwibawa secara GLOBAL:
   - Malaysia (jika tajuk bersifat tempatan): SPRM, DOSM, KPM, KKM, Bernama, parlimen.gov.my dan jabatan kerajaan rasmi.
   - Antarabangsa (untuk kerelevanan global): WHO, UNESCO, UNICEF, UN, World Bank, OECD, Reuters serta jurnal berwasit (peer-reviewed).
   - Pilih sumber yang PALING relevan dengan tajuk ini.
3. SEMUA medan "fact", "statistic" dan "currentCase" MESTI ditulis dalam Bahasa Melayu formal (standard Dewan). Terjemahkan daripada bahasa lain apabila perlu. Medan "source" (nama sumber) dan "url" kekal dalam bentuk asal.
4. Jika tiada statistik rasmi yang boleh disahkan, medan "statistic" MESTI ditulis TEPAT sebagai: "Tiada statistik rasmi ditemui".
5. Pulangkan TEPAT ${count} kad untuk sudut "${label}" sahaja. Setiap kad mesti benar-benar berkaitan dengan sudut ini.
6. JANGAN ulang mana-mana fakta yang telah disenaraikan di bawah. Berikan fakta baharu yang benar-benar berbeza:
${existingBlock}

FORMAT OUTPUT:
Pulangkan HANYA satu array JSON (tiada teks lain, tiada penerangan, tiada pagar kod \`\`\`). Setiap elemen mesti mengikut struktur ini dengan TEPAT:
[
  {
    "fact": "ayat fakta dalam Bahasa Melayu formal",
    "statistic": "angka rasmi dengan konteks, atau 'Tiada statistik rasmi ditemui'",
    "currentCase": "kes atau isu semasa yang berkaitan dalam Bahasa Melayu",
    "source": "nama sumber, cth: SPRM atau WHO",
    "url": "https://pautan-sah-untuk-menyemak",
    "year": 2025
  }
]
"year" mestilah nombor (tahun penerbitan) atau null jika tidak diketahui.`;
}
