"use client";
import { useEffect, useRef, useState } from "react";
import { loadJson, saveJson } from "./storage";

export function usePersistentState<T>(key: string, initial: T, pollMs = 1000) {
  // Start with the provided fallback to match SSR on both server and first client render
  const [state, setState] = useState<T>(initial);
  const last = useRef<string>(JSON.stringify(initial));

  // Load once on mount (client) to avoid hydration mismatch, then keep in sync
  useEffect(() => {
    const next = loadJson<T>(key, initial);
    setState(next);
    last.current = JSON.stringify(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Save on change
  useEffect(() => {
    saveJson(key, state);
    last.current = JSON.stringify(state);
  }, [key, state]);

  // Sync across tabs and routes; also poll to catch in-tab writers
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        const next = loadJson<T>(key, initial);
        if (JSON.stringify(next) !== last.current) setState(next);
      }
    };
    const onVisibility = () => {
      const next = loadJson<T>(key, initial);
      if (JSON.stringify(next) !== last.current) setState(next);
    };
    const id = setInterval(onVisibility, pollMs);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [key, initial, pollMs]);

  return [state, setState] as const;
}


