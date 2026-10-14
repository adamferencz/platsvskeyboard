"use client";

import { useEffect, useRef } from "react";

export type HotkeyMap = Record<string, (e: KeyboardEvent) => void>;

interface Options {
  /** ms po připojení, kdy se klávesy ignorují (dopisování z hry nesmí spustit akci) */
  armDelayMs?: number;
  enabled?: boolean;
}

/** Je fokus v prvku, kde klávesa má svůj vlastní význam (psaní, nativní Enter na tlačítku)? */
function isInteractiveTarget(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  // Enter a mezerník na tlačítku/odkazu klikne nativně — nepřidávat druhou akci
  if ((key === "Enter" || key === " ") && (tag === "BUTTON" || tag === "A")) return true;
  return false;
}

/**
 * Globální klávesové zkratky stránky. Klíč mapy = `KeyboardEvent.key` (např. "Enter", "Escape", "r").
 * Písmena se porovnávají bez ohledu na velikost.
 */
export function useHotkeys(map: HotkeyMap, { armDelayMs = 0, enabled = true }: Options = {}) {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!enabled) return;
    const armedAt = performance.now() + armDelayMs;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (performance.now() < armedAt) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const handler = mapRef.current[key];
      if (!handler || isInteractiveTarget(e.target, e.key)) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [armDelayMs, enabled]);
}
