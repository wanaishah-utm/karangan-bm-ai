"use client";

// A React hook that exposes the saved reports plus helpers to change them.
//
// Pattern: localStorage is the source of truth on disk, but React needs its own
// state copy to know when to re-render. So every mutation does BOTH — it writes
// to storage AND updates React state — keeping the screen in sync instantly.
import { useCallback, useEffect, useState } from "react";

import type { SavedReport } from "@/types";
import * as storage from "@/lib/storage";

export function useReports() {
  const [reports, setReports] = useState<SavedReport[]>([]);

  // Load once when the component mounts. We do this in useEffect (not during
  // render) because storage touches `window`, which only exists in the browser —
  // reading during render would cause a server/client hydration mismatch. This
  // single, one-time setState is therefore intentional and safe.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReports(storage.getReports());
  }, []);

  // Re-read everything from storage into state.
  const refresh = useCallback(() => {
    setReports(storage.getReports());
  }, []);

  // Save a new report, then sync state.
  const save = useCallback((report: SavedReport) => {
    storage.saveReport(report);
    setReports(storage.getReports());
  }, []);

  // Rename a report, then sync state.
  const rename = useCallback((id: string, name: string) => {
    storage.updateReport(id, { name });
    setReports(storage.getReports());
  }, []);

  // Replace a report's facts (e.g. after deleting some of them), then sync state.
  const updateSections = useCallback(
    (id: string, sections: SavedReport["sections"]) => {
      storage.updateReport(id, { sections });
      setReports(storage.getReports());
    },
    [],
  );

  // Change any other fields of a report (e.g. its peribahasa), then sync state.
  const update = useCallback((id: string, patch: Partial<SavedReport>) => {
    storage.updateReport(id, patch);
    setReports(storage.getReports());
  }, []);

  // Duplicate a report, sync state, and hand back the new copy.
  const duplicate = useCallback((id: string) => {
    const copy = storage.duplicateReport(id);
    setReports(storage.getReports());
    return copy;
  }, []);

  // Delete a report, then sync state.
  const remove = useCallback((id: string) => {
    storage.deleteReport(id);
    setReports(storage.getReports());
  }, []);

  return { reports, save, rename, updateSections, update, duplicate, remove, refresh };
}
