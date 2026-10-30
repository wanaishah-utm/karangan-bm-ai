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

// The localStorage key we use. Namespaced with "karangan." to avoid clashing
// with anything else on the same domain.
const REPORTS_KEY = "karangan.reports";

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
