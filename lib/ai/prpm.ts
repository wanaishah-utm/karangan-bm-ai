// Checks a suggested peribahasa against PRPM DBP (Pusat Rujukan Persuratan
// Melayu, prpm.dbp.gov.my), so the AI can't slip in made-up sayings.
// Server-only: used by /api/peribahasa.
//
// How PRPM is read (it has no API, so this parses its search pages):
//   1. Search `Cari1?keyword=<words joined by +>`. PRPM drops the connection
//      when the keyword is longer than 24 characters (as sent), so a long
//      peribahasa is searched by its most distinctive words that fit.
//   2. The results page has a "Peribahasa" side panel. Its "Lihat
//      selanjutnya" link (`&d=<id>`) opens the full list of matching entries
//      from Kamus Istimewa Peribahasa Melayu, each with its official meaning.
//   3. Short idioms (simpulan bahasa, e.g. "tumbuk rusuk") are Kamus Dewan
//      headwords instead; they show as the tab labels of the dictionary panel.
// An unknown phrase gets "Carian kata tiada di dalam kamus terkini" and no
// peribahasa panel.
//
// PRPM also searches the official MEANINGS, so searchByTheme("dadah") finds
// real peribahasa ABOUT a theme, not only ones containing the word.

const BASE = "https://prpm.dbp.gov.my/";
const TIMEOUT_MS = 5000;
// Longest keyword PRPM accepts, counted as sent in the URL.
const MAX_KEYWORD = 24;
// Dictionary content barely changes, so let Next cache each page for a day —
// fewer requests to DBP and faster repeat checks.
const REVALIDATE_SECONDS = 86_400;

export type PrpmResult =
  // Found in a PRPM peribahasa source (e.g. Kamus Istimewa Peribahasa
  // Melayu): PRPM's wording, meaning and source.
  | { status: "found"; peribahasa: string; maksud: string; sumber: string }
  // An exact Kamus Dewan headword (a simpulan bahasa).
  | { status: "idiom"; peribahasa: string; sumber: string }
  | { status: "not_found" }
  // PRPM couldn't be reached or returned something unexpected.
  | { status: "unavailable" };

// Comparison words that are interchangeable at the start of a peribahasa
// ("Bagai aur dengan tebing" = "Sebagai aur dengan tebing").
const SIMILES = new Set([
  "bagai", "sebagai", "seperti", "umpama", "laksana", "macam", "bak",
  "ibarat", "sepantun", "sebagaimana", "bagaikan", "seumpama",
]);
// Very common words that make poor search keywords.
const STOPWORDS = new Set([
  "di", "ke", "dari", "dengan", "yang", "dan", "akan", "pun", "tak", "tidak",
  "jangan", "itu", "ini", "pada", "dalam", "kerana", "sudah", "lagi", "juga",
  ...SIMILES,
]);

// Lower-case, keep letters/digits/hyphens, single spaces.
function norm(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Word forms PRPM writes differently from everyday usage ("di sebalik batu"
// is listed as "di balik batu").
const SAME_WORD: Record<string, string> = { sebalik: "balik" };
// Little words that come and go between versions of a saying ("Ke bukit sama
// didaki" vs PRPM's "Bukit sama didaki"); ignored when comparing.
const PARTICLES = new Set(["ke", "di", "yang", "pun"]);

// A word without the -nya / -lah endings ("kulitnya" → "kulit",
// "biarlah" → "biar"), so inflected forms compare (and search) alike.
function stem(word: string): string {
  return word.length > 5 ? word.replace(/(nya|lah)$/, "") : word;
}

// Every reading of a PRPM entry. PRPM marks a swappable word with "(= x)",
// meaning x can replace the word before it, and an optional word with "(x)":
//   "Seperti api makan (= dalam) sekam." → "Seperti api makan sekam.",
//                                           "Seperti api dalam sekam."
//   "Bersatu (kita) teguh, …"            → with and without "kita"
function entryVariants(entry: string): string[] {
  let forms = [entry.replace(/\*/g, "")];
  const swap = /(\S+)\s*[([]=\s*([^)\]]+)[)\]]/;
  for (let round = 0; round < 4 && forms.some((f) => swap.test(f)); round++) {
    forms = forms.flatMap((f) => {
      const m = f.match(swap);
      if (!m || m.index === undefined) return [f];
      const before = f.slice(0, m.index);
      const after = f.slice(m.index + m[0].length);
      return [before + m[1] + after, before + m[2].trim() + after];
    });
  }
  forms = forms.flatMap((f) =>
    /\([^)=]+\)/.test(f)
      ? [f.replace(/\(([^)=]+)\)/g, "$1"), f.replace(/\s*\([^)=]+\)/g, "")]
      : [f],
  );
  const tidy = (f: string) => f.replace(/\s+/g, " ").replace(/\s+([.,;])/g, "$1").trim();
  return [...new Set(forms.map(tidy))].slice(0, 16);
}

// norm() with comparison words folded to one token, spelling variants and
// word endings unified, and particles dropped — so equivalent wordings of the
// same saying compare equal.
function comparable(s: string): string {
  return norm(s)
    .split(" ")
    .map((w) => (SIMILES.has(w) ? "~" : stem(SAME_WORD[w] ?? w)))
    .filter((w) => w && !PARTICLES.has(w))
    .join(" ");
}

// Plain text from an HTML fragment.
function text(htmlFragment: string): string {
  return htmlFragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?)])/g, "$1") // "tebing ." → "tebing."
    .trim();
}

// A keyword as PRPM's own links send it: URL-encoded words joined by "+".
function encodeKeyword(keyword: string): string {
  return keyword.split(" ").map(encodeURIComponent).join("+");
}

// Levenshtein-based similarity in [0, 1], for tiny wording differences.
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

// Does a PRPM entry match the suggestion? Checked against every reading of
// the entry (see entryVariants). It matches when:
//   • it's the same saying after folding, or a near-identical wording (typos);
//   • the suggestion is one clause of a longer entry;
//   • the suggestion's opening clause (3+ words) is a clause of the entry — a
//     popular variant ending, e.g. "Sepandai-pandai tupai melompat, akhirnya
//     jatuh ke tanah juga" for PRPM's "…, sekali gawal juga";
//   • the suggestion (3+ words) appears word for word inside the entry, e.g.
//     "kacang lupakan kulit" in "Jangan menjadi seperti kacang lupakan kulit…".
// Returns the wording to show — PRPM's own reading, or the suggestion itself
// when it was found inside a longer PRPM sentence — or null.
function matchEntry(entry: string, suggestion: string): string | null {
  const p = comparable(suggestion);
  if (!p) return null;
  const opening = comparable(suggestion.split(/[,;]/)[0] ?? "");

  for (const form of entryVariants(entry)) {
    const e = comparable(form);
    if (!e) continue;
    const clauses = form.split(/[,;]/).map(comparable).filter(Boolean);
    if (
      e === p ||
      similarity(e, p) >= 0.9 ||
      clauses.some((c) => c === p || similarity(c, p) >= 0.9) ||
      (opening.split(" ").length >= 3 &&
        clauses.some((c) => c === opening || similarity(c, opening) >= 0.92))
    ) {
      return displayWording(form);
    }
    if (p.split(" ").length >= 3 && ` ${e} `.includes(` ${p} `)) {
      return displayWording(suggestion);
    }
  }
  return null;
}

// Content words of a saying, stemmed, in order — without comparison words
// ("bagai", "seperti" …) and very common words. PRPM only returns entries
// containing EVERY search word, so "bagai" would miss PRPM's "Seperti …".
function contentWords(peribahasa: string): string[] {
  return norm(peribahasa)
    .split(" ")
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);
}

// The searches to try, best first (each within PRPM's length limit):
//   1. the two longest content words, in order — usually enough;
//   2. the first two content words — reaches a different PRPM source when the
//      first search opened the wrong list (e.g. "bersatu teguh" finds
//      "Bersatu kita teguh…" in the English–Malay proverb book);
//   3–4. the two longest words on their own — for when another word is
//      spelt differently in PRPM ("pembetung" / "pembentung").
// A short saying (an idiom such as "tumbuk rusuk") is searched as written.
function keywordsFor(peribahasa: string): string[] {
  const all = norm(peribahasa).split(" ").filter(Boolean);
  if (all.length <= 2) return [all.join(" ")].filter((k) => fits(k));

  const words = contentWords(peribahasa);
  const byLength = words
    .map((w, i) => ({ w, i }))
    .sort((a, b) => b.w.length - a.w.length);
  const inOrder = (items: { w: string; i: number }[]) =>
    [...items].sort((a, b) => a.i - b.i).map(({ w }) => w).join(" ");

  const tries = [
    inOrder(byLength.slice(0, 2)),
    words.slice(0, 2).join(" "),
    byLength[0]?.w ?? "",
    byLength[1]?.w ?? "",
  ];
  return [...new Set(tries.filter((k) => k && fits(k)))];
}

// Whether a keyword is within PRPM's length limit.
function fits(keyword: string): boolean {
  return encodeKeyword(keyword).length <= MAX_KEYWORD;
}

async function getPage(path: string): Promise<string> {
  const res = await fetch(BASE + path, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; KaranganBM/1.0)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`PRPM ${res.status}`);
  return res.text();
}

// Drop PRPM's cross-reference notes from a meaning, e.g.
// "(Peribahasa lain yang sama makna: …)" and "(Bandingkan dengan: …)".
function cleanMaksud(maksud: string): string {
  return maksud
    .replace(/\((?:Peribahasa lain|Bandingkan)[^)]*\)\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface Entry {
  wording: string;
  maksud: string;
  sumber: string;
}

// Rows of a PRPM results grid, read by column name, since each source lays
// its table out differently:
//   Kamus Istimewa Peribahasa Melayu: Peribahasa | Takrif | Sumber
//   Peribahasa dan Ungkapan Inggeris - Melayu:
//     Rujukan | Peribahasa Inggeris | Makna | Peribahasa Melayu | … | Sumber
function gridEntries(grid: string): Entry[] {
  const headers = [...grid.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => text(m[1]));
  let wordingCol = headers.findIndex((h) => /^peribahasa melayu$/i.test(h));
  if (wordingCol === -1) wordingCol = headers.findIndex((h) => /^peribahasa$/i.test(h));
  const maksudCol = headers.findIndex((h) => /^(takrif|makna)$/i.test(h));
  const sumberCol = headers.findIndex((h) => /^sumber$/i.test(h));
  if (wordingCol === -1) return [];

  const entries: Entry[] = [];
  for (const row of grid.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => text(m[1]));
    const wording = cells[wordingCol] ?? "";
    // Skip the header row and the pager row ("1 2 3 …").
    if (!/\p{L}/u.test(wording)) continue;
    entries.push({
      wording,
      maksud: maksudCol === -1 ? "" : (cells[maksudCol] ?? ""),
      sumber: (sumberCol === -1 ? "" : cells[sumberCol]) || "PRPM DBP",
    });
  }
  return entries;
}

// All peribahasa entries a search page leads to.
async function peribahasaEntries(searchPage: string, keyword: string): Promise<Entry[]> {
  const panelAt = searchPage.indexOf("infoPeribahasa");
  if (panelAt === -1) return [];
  // The panel's markup ends at the first </span> (its wrapping label).
  const panelEnd = searchPage.indexOf("</span>", panelAt);
  const panel = searchPage.slice(panelAt, panelEnd === -1 ? undefined : panelEnd);

  // The full list, when there's a "Lihat selanjutnya" link — but only if that
  // page really is the "Peribahasa Melayu" list (not another PRPM section).
  const d = panel.match(/[?&]d=(\d+)/)?.[1];
  if (d) {
    const listPage = await getPage(`Cari1?keyword=${encodeKeyword(keyword)}&d=${d}`);
    const domain = text(listPage.match(/id="MainContent_namaDomain">([\s\S]*?)<\/span>/)?.[1] ?? "");
    const gridAt = listPage.indexOf("MainContent_GridView1");
    if (/peribahasa/i.test(domain) && gridAt !== -1) {
      const entries = gridEntries(listPage.slice(gridAt, listPage.indexOf("</table>", gridAt)));
      if (entries.length > 0) return entries;
    }
  }

  // Otherwise the single entry shown in the panel itself.
  const wording = panel.match(/<font color="#000">([\s\S]*?)<\/font>/)?.[1];
  const meaning = panel.match(/Bermaksud :<\/center><br\/?><center>([\s\S]*?)<\/center>/)?.[1];
  return wording
    ? [{ wording: text(wording), maksud: text(meaning ?? ""), sumber: "Kamus Istimewa Peribahasa Melayu" }]
    : [];
}


// A wording made readable: footnote stars, any leftover brackets and the final
// full stop removed. "Bersatu kita teguh, bercerai kita roboh*." → "Bersatu
// kita teguh, bercerai kita roboh"
function displayWording(wording: string): string {
  return wording
    .replace(/\*/g, "")
    .replace(/\s*[([]=[^)\]]*[)\]]/g, "")
    .replace(/\(([^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;])/g, "$1")
    .replace(/\.$/, "")
    .trim()
    .replace(/^\p{Ll}/u, (c) => c.toUpperCase());
}

// The first PRPM peribahasa entry a keyword finds that matches the
// suggestion (or null), plus how many entries the keyword found at all.
async function findInPrpm(
  keyword: string,
  page: string,
  peribahasa: string,
): Promise<{ match: PrpmResult | null; entries: number }> {
  const entries = await peribahasaEntries(page, keyword);
  for (const entry of entries) {
    const wording = matchEntry(entry.wording, peribahasa);
    if (wording) {
      return {
        match: {
          status: "found",
          peribahasa: wording,
          maksud: cleanMaksud(entry.maksud),
          sumber: entry.sumber,
        },
        entries: entries.length,
      };
    }
  }
  return { match: null, entries: entries.length };
}

// Per-saying time limit across its searches, so one slow lookup can't eat
// the whole request.
const SAYING_BUDGET_MS = 9000;

export async function checkPeribahasa(peribahasa: string): Promise<PrpmResult> {
  const keywords = keywordsFor(peribahasa);
  if (keywords.length === 0) return { status: "not_found" };

  const deadline = Date.now() + SAYING_BUDGET_MS;
  let reached = false; // got at least one real PRPM page

  for (const [n, keyword] of keywords.entries()) {
    if (n > 0 && Date.now() > deadline) break;
    let page: string;
    try {
      page = await getPage(`Cari1?keyword=${encodeKeyword(keyword)}`);
    } catch {
      continue; // this search failed; try the next one
    }
    // Sanity check that this really is a PRPM results page.
    if (!page.includes("MainContent")) continue;
    reached = true;

    try {
      const { match } = await findInPrpm(keyword, page, peribahasa);
      if (match) return match;
    } catch {
      // The list page failed; the other searches may still find it.
    }

    // Short idioms: an exact Kamus Dewan headword (the dictionary tab labels).
    if (n === 0 && norm(peribahasa) === keyword) {
      const headwords = [...page.matchAll(/data-toggle="tab"[^>]*>([^<]+)<\/a>/g)].map((m) =>
        norm(text(m[1])),
      );
      if (headwords.includes(keyword)) {
        return { status: "idiom", peribahasa: peribahasa.trim(), sumber: "Kamus Dewan" };
      }
    }
  }
  // Not listed — unless PRPM never answered at all.
  return reached ? { status: "not_found" } : { status: "unavailable" };
}

export interface PrpmEntry {
  peribahasa: string; // PRPM's wording, made readable
  maksud: string; // PRPM's official meaning
  sumber: string; // e.g. "Kamus Istimewa Peribahasa Melayu"
}

// Peribahasa whose wording OR official meaning contains a theme word
// (PRPM searches both), e.g. "dadah" or "mencegah". Every result is a real
// PRPM entry. Returns null if PRPM couldn't be reached.
export async function searchByTheme(word: string, limit = 12): Promise<PrpmEntry[] | null> {
  const keyword = norm(word).split(" ")[0] ?? "";
  if (!keyword || !fits(keyword)) return [];
  try {
    const page = await getPage(`Cari1?keyword=${encodeKeyword(keyword)}`);
    if (!page.includes("MainContent")) return null;
    const entries = await peribahasaEntries(page, keyword);
    return entries
      .map((e) => ({
        peribahasa: displayWording(e.wording),
        maksud: cleanMaksud(e.maksud),
        sumber: e.sumber,
      }))
      .filter((e) => e.peribahasa && e.maksud)
      .slice(0, limit);
  } catch {
    return null;
  }
}
