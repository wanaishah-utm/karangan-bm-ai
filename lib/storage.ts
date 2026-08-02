// The ONLY file in the app that talks to localStorage directly.
//
// Everything here is guarded with `if (typeof window === "undefined")` because
// this code can be imported into components that Next.js renders on the SERVER,
// where `localStorage` (a browser-only API) does not exist. Without the guard,
// server rendering would crash.
//
// We also wrap every JSON.parse in try/catch: if the stored data is somehow
// corrupt, we return a safe default instead of throwing.
import type { SavedReport } from "@/types";

// The two localStorage keys we use. Namespaced with "karangan." to avoid
// clashing with anything else on the same domain.
const REPORTS_KEY = "karangan.reports";
const HISTORY_KEY = "karangan.history";

// Keep at most this many past searches.
const HISTORY_LIMIT = 20;

// -------------------- low-level read / write helpers --------------------

// Read a JSON value from localStorage, returning `fallback` if anything is
// missing, unavailable (server), or corrupt.
function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt JSON or blocked storage — fall back safely.
    return fallback;
  }
}

// Write a JSON value to localStorage. Silently does nothing on the server or if
// storage is full/blocked.
function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — nothing we can do, so ignore.
  }
}

// -------------------- reports --------------------

// All saved reports, newest first. Always returns an array.
export function getReports(): SavedReport[] {
  const reports = readJson<SavedReport[]>(REPORTS_KEY, []);
  return Array.isArray(reports) ? reports : [];
}

// A single report by id, or undefined if not found.
export function getReport(id: string): SavedReport | undefined {
  return getReports().find((report) => report.id === id);
}

// Add a brand-new report to the front of the list (so it shows up first).
export function saveReport(report: SavedReport): void {
  if (typeof window === "undefined") return;
  const reports = getReports();
  reports.unshift(report); // newest first
  writeJson(REPORTS_KEY, reports);
}

// Change some fields of an existing report (e.g. its name).
export function updateReport(id: string, patch: Partial<SavedReport>): void {
  if (typeof window === "undefined") return;
  const reports = getReports().map((report) =>
    report.id === id ? { ...report, ...patch } : report,
  );
  writeJson(REPORTS_KEY, reports);
}

// Remove a report by id.
export function deleteReport(id: string): void {
  if (typeof window === "undefined") return;
  const reports = getReports().filter((report) => report.id !== id);
  writeJson(REPORTS_KEY, reports);
}

// Make a copy of a report with a new id, a "(salinan)" name, and a fresh date.
// Returns the new copy (or undefined if the original wasn't found).
export function duplicateReport(id: string): SavedReport | undefined {
  if (typeof window === "undefined") return undefined;
  const original = getReport(id);
  if (!original) return undefined;

  const copy: SavedReport = {
    ...original,
    id: crypto.randomUUID(),
    name: `${original.name} (salinan)`,
    createdAt: new Date().toISOString(),
  };

  const reports = getReports();
  reports.unshift(copy);
  writeJson(REPORTS_KEY, reports);
  return copy;
}

// -------------------- search history --------------------

// Past search topics, most recent first. Always returns an array.
export function getHistory(): string[] {
  const history = readJson<string[]>(HISTORY_KEY, []);
  return Array.isArray(history) ? history : [];
}

// Record a search. Most recent goes first, duplicates (ignoring letter case)
// are removed, and the list is capped at HISTORY_LIMIT items.
export function addToHistory(topic: string): void {
  if (typeof window === "undefined") return;
  const trimmed = topic.trim();
  if (trimmed === "") return;

  const existing = getHistory();
  // Drop any earlier entry that matches, case-insensitively.
  const deduped = existing.filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase(),
  );
  deduped.unshift(trimmed); // put the newest search at the front

  writeJson(HISTORY_KEY, deduped.slice(0, HISTORY_LIMIT));
}

// Wipe the whole search history.
export function clearHistory(): void {
  if (typeof window === "undefined") return;
  writeJson(HISTORY_KEY, []);
}

// -------------------- backup / restore --------------------

// Bundle reports + history into one JSON string (for the teacher to save/backup).
export function exportAllData(): string {
  return JSON.stringify({ reports: getReports(), history: getHistory() });
}

// Restore reports + history from a JSON string. Returns true on success,
// false if the JSON is invalid.
export function importAllData(json: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const data = JSON.parse(json);
    if (data && Array.isArray(data.reports)) writeJson(REPORTS_KEY, data.reports);
    if (data && Array.isArray(data.history)) writeJson(HISTORY_KEY, data.history);
    return true;
  } catch {
    return false;
  }
}
