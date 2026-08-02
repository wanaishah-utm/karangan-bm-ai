"use client";

// A React hook exposing the past search topics plus helpers to change them.
// Same pattern as use-reports: mutations update localStorage AND React state.
import { useCallback, useEffect, useState } from "react";

import * as storage from "@/lib/storage";

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  // Load once on mount (never during render — storage touches `window`, and
  // reading during render would cause a server/client hydration mismatch). This
  // single, one-time setState is therefore intentional and safe.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(storage.getHistory());
  }, []);

  // Re-read the history from storage (used after a data restore).
  const refresh = useCallback(() => {
    setHistory(storage.getHistory());
  }, []);

  // Record a search, then sync state.
  const add = useCallback((topic: string) => {
    storage.addToHistory(topic);
    setHistory(storage.getHistory());
  }, []);

  // Clear the history, then sync state.
  const clear = useCallback(() => {
    storage.clearHistory();
    setHistory([]);
  }, []);

  return { history, add, clear, refresh };
}
