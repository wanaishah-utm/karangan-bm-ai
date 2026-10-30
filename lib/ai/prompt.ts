// Builds the instruction text (the "prompt") we send to the AI for ONE section.
// Keeping this in its own file makes it easy to read and tweak the wording
// without touching the API route logic.
import type { ScopeFilter, SectionKey } from "@/types";
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

// Extra instructions when the teacher has filtered results to one scope.
const SCOPE_RULES: Record<ScopeFilter, string> = {
  semua: "",
  dalam: `
SKOP: DALAM NEGARA SAHAJA
- Pulangkan HANYA fakta tentang MALAYSIA (konteks tempatan): agensi, data, kes, dasar atau peristiwa di Malaysia.
- Utamakan sumber Malaysia (SPRM, DOSM, KPM, KKM, Bernama, parlimen.gov.my, laman .gov.my). Sumber antarabangsa dibenarkan HANYA jika fakta itu khusus tentang Malaysia.
- Setiap kad MESTI mempunyai "scope": "dalam".
`,
  luar: `
SKOP: LUAR NEGARA SAHAJA
- Pulangkan HANYA fakta tentang NEGARA LAIN atau peringkat GLOBAL/antarabangsa — BUKAN tentang Malaysia.
- Utamakan sumber antarabangsa (WHO, UNESCO, UNICEF, UN, World Bank, OECD, Reuters, jurnal berwasit) atau sumber rasmi negara lain.
- Setiap kad MESTI mempunyai "scope": "luar".
`,
};

export function buildSectionPrompt(
  topic: string,
  sectionKey: SectionKey,
  count: number,
  existingFacts: string[],
  scope: ScopeFilter = "semua",
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
5. Pulangkan SEHINGGA ${count} kad untuk sudut "${label}" sahaja — bilangan boleh kurang. Setiap kad mesti benar-benar berkaitan dengan sudut ini.
6. Setiap kad MESTI merupakan fakta yang BERBEZA daripada kad lain: berlainan isi/substansi, BUKAN ayat yang disusun semula (rephrase) daripada kad lain, dan BUKAN peristiwa atau statistik yang sama diulang.
7. Jika hanya terdapat sedikit fakta yang benar-benar berbeza dan boleh disahkan, PULANGKAN yang sedikit itu sahaja. Memulangkan lebih sedikit fakta yang tulen adalah BETUL dan LEBIH BAIK. Menambah bilangan dengan mengulang atau menyusun semula fakta yang sama dikira sebagai KEGAGALAN.
8. JANGAN ulang mana-mana fakta yang telah disenaraikan di bawah. Berikan fakta baharu yang benar-benar berbeza:
${existingBlock}
9. Setiap kad MESTI ada medan "scope": tulis "dalam" jika fakta itu tentang Malaysia, atau "luar" jika tentang negara lain atau peringkat global.
${SCOPE_RULES[scope]}
FORMAT OUTPUT:
Pulangkan HANYA satu array JSON (tiada teks lain, tiada penerangan, tiada pagar kod \`\`\`). Setiap elemen mesti mengikut struktur ini dengan TEPAT:
[
  {
    "fact": "ayat fakta dalam Bahasa Melayu formal",
    "statistic": "angka rasmi dengan konteks, atau 'Tiada statistik rasmi ditemui'",
    "currentCase": "kes atau isu semasa yang berkaitan dalam Bahasa Melayu",
    "source": "nama sumber, cth: SPRM atau WHO",
    "url": "https://pautan-sah-untuk-menyemak",
    "year": 2025,
    "scope": "dalam"
  }
]
"year" mestilah nombor (tahun penerbitan) atau null jika tidak diketahui. "scope" mestilah "dalam" atau "luar".`;
}

// The prompt for suggesting peribahasa that suit a report. `facts` are the
// facts the teacher kept in the report (already in BM).
export function buildPeribahasaPrompt(
  topic: string,
  facts: string[],
  count: number,
): string {
  const factBlock = facts.map((f, i) => `${i + 1}. ${f}`).join("\n");

  return `Anda ialah guru Bahasa Melayu berpengalaman yang membantu pelajar KSSM/SPM memperkaya karangan dengan peribahasa yang tepat.

TAJUK KARANGAN: "${topic}"
FAKTA YANG DIPILIH OLEH GURU:
${factBlock}

TUGAS: Cadangkan SEHINGGA ${count} peribahasa Melayu yang paling sesuai digunakan dalam karangan bertajuk ini, berdasarkan fakta di atas.

PERATURAN WAJIB:
1. Gunakan HANYA peribahasa Melayu yang SAHIH dan sudah dibukukan (contohnya dalam Kamus Istimewa Peribahasa Melayu atau Pusat Rujukan Persuratan Melayu DBP, prpm.dbp.gov.my). JANGAN sekali-kali mereka-reka peribahasa baharu atau mengubah susunan katanya.
2. Gunakan carian web untuk menyemak bentuk dan maksud peribahasa yang tepat sebelum mencadangkannya. Jika ragu-ragu tentang sesuatu peribahasa, JANGAN masukkan.
3. Pilih berdasarkan MAKSUD: maksud peribahasa mesti benar-benar sepadan dengan isi fakta di atas (contohnya punca, kesan, peranan pihak tertentu atau langkah mengatasi isu). Tanya diri sendiri: adakah guru Bahasa Melayu akan menerima peribahasa ini dalam karangan bertajuk ini? Jika tidak, JANGAN masukkan.
4. Utamakan peribahasa yang LAZIM digunakan dalam karangan SPM dan dikenali pelajar. JANGAN memilih peribahasa mengikut abjad atau mengambil beberapa peribahasa yang bermula dengan perkataan yang sama.
5. "maksud" ialah maksud standard peribahasa itu dalam Bahasa Melayu formal, seperti yang tercatat dalam sumber rujukan.
6. "contoh" ialah SATU ayat karangan dalam Bahasa Melayu formal yang menggunakan peribahasa itu MENGIKUT maksudnya yang sebenar dan dikaitkan dengan salah satu fakta di atas. Jika ayat itu memaksa peribahasa ke dalam konteks yang tidak sesuai dengan maksudnya, gugurkan peribahasa itu.
7. Setiap peribahasa mesti BERBEZA. Lebih baik memulangkan sedikit peribahasa yang tepat daripada banyak yang meragukan.

FORMAT OUTPUT:
Pulangkan HANYA satu array JSON (tiada teks lain, tiada pagar kod \`\`\`), dengan struktur ini:
[
  {
    "peribahasa": "Bagai aur dengan tebing",
    "maksud": "Hubungan yang rapat dan saling membantu antara satu sama lain.",
    "contoh": "Ibu bapa dan guru perlulah bagai aur dengan tebing dalam membendung gejala buli siber."
  }
]`;
}
