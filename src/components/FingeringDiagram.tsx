"use client";

import { useEffect, useState } from "react";
import {
  FINGER_DATA,
  getLayout,
  getKeyTargetInfo,
  type Finger,
} from "@/lib/keyboard";

interface Props {
  /** Aktuálně očekávaný znak ze hry (vygenerovaný ze zombíka nebo bonusu) */
  expectedChar?: string | null;
  /** Výchozí rozložení (qwertz / qwerty) z profilu */
  initialLayout?: "qwertz" | "qwerty";
}

const STORAGE_KEY_OPEN = "pvz_fingering_diagram_open";
const STORAGE_KEY_LAYOUT = "pvz_keyboard_layout";

export function FingeringDiagram({ expectedChar, initialLayout = "qwertz" }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [layoutName, setLayoutName] = useState<"qwertz" | "qwerty">(initialLayout);

  // Načtení preferencí z localStorage po mountu
  useEffect(() => {
    try {
      const savedOpen = localStorage.getItem(STORAGE_KEY_OPEN);
      if (savedOpen !== null) {
        setIsOpen(savedOpen === "true");
      }
      const savedLayout = localStorage.getItem(STORAGE_KEY_LAYOUT);
      if (savedLayout === "qwertz" || savedLayout === "qwerty") {
        setLayoutName(savedLayout);
      } else if (initialLayout) {
        setLayoutName(initialLayout);
      }
    } catch {
      // Ignorovat chyby localStorage (např. anonymní režim)
    }
  }, [initialLayout]);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_OPEN, String(next));
      } catch {
        // Ignorovat
      }
      return next;
    });
  };

  const toggleLayout = () => {
    setLayoutName((prev) => {
      const next = prev === "qwertz" ? "qwerty" : "qwertz";
      try {
        localStorage.setItem(STORAGE_KEY_LAYOUT, next);
      } catch {
        // Ignorovat
      }
      return next;
    });
  };

  const layout = getLayout(layoutName);
  const targetInfo = expectedChar ? getKeyTargetInfo(expectedChar, layoutName) : null;

  return (
    <div
      onMouseDown={(e) => {
        // Zásadní: zabrání sebrání fokusu ze skrytého <input> hry
        e.preventDefault();
      }}
      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/85 p-3 shadow-xl backdrop-blur-md"
    >
      {/* Hlavička s instrukcí a přepínači */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">⌨️</span>
          <span className="text-sm font-semibold text-zinc-200">Prstoklad</span>
          <button
            type="button"
            onClick={toggleLayout}
            onMouseDown={(e) => e.preventDefault()}
            title="Přepnout rozložení QWERTZ / QWERTY"
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            {layoutName.toUpperCase()}
          </button>
        </div>

        {/* Instrukční panel: které písmeno a prst použít */}
        <div className="flex flex-1 items-center justify-center px-2">
          {targetInfo ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-400">Cíl:</span>
              <span className="inline-flex items-center rounded-md border border-yellow-400/50 bg-yellow-400/20 px-2 py-0.5 font-mono text-base font-bold text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                {targetInfo.targetChar === " " ? "Mezera" : targetInfo.targetChar}
              </span>
              <span className="text-zinc-500">➔</span>
              {targetInfo.needsShift && targetInfo.shiftFingerStyle && (
                <>
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${targetInfo.shiftFingerStyle.badgeClass}`}
                  >
                    Shift ({targetInfo.shiftFingerStyle.shortLabel})
                  </span>
                  <span className="text-zinc-400">+</span>
                </>
              )}
              <span
                className={`inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-semibold ${targetInfo.fingerStyle.badgeClass}`}
              >
                {targetInfo.fingerStyle.label}
              </span>
            </div>
          ) : (
            <div className="text-xs text-zinc-400">
              Výchozí pozice: <strong className="text-zinc-300">A S D F</strong> (levá) ·{" "}
              <strong className="text-zinc-300">J K L Ů</strong> (pravá)
            </div>
          )}
        </div>

        {/* Tlačítko pro sbalení/rozbalení */}
        <button
          type="button"
          onClick={toggleOpen}
          onMouseDown={(e) => e.preventDefault()}
          className="rounded border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
        >
          {isOpen ? "Skrýt klávesnici ▲" : "Zobrazit klávesnici ▼"}
        </button>
      </div>

      {/* Rozbalená vizuální klávesnice */}
      {isOpen && (
        <div className="mt-3 space-y-1.5">
          {/* Řady klávesnice */}
          <div className="space-y-1 font-mono text-xs select-none">
            {layout.map((row, rowIdx) => (
              <div key={rowIdx} className="flex w-full items-stretch justify-center gap-1">
                {row.map((keyDef) => {
                  const isTarget = targetInfo?.keyDef.key.toLowerCase() === keyDef.key.toLowerCase();
                  const isShiftTarget =
                    targetInfo?.needsShift &&
                    targetInfo.shiftKeyKey &&
                    targetInfo.shiftKeyKey.toLowerCase() === keyDef.key.toLowerCase();
                  const isActive = isTarget || isShiftTarget;

                  const fingerStyle = FINGER_DATA[keyDef.finger];

                  // Šířka klávesy v poměru
                  const flexBasis = `${(keyDef.width ?? 1) * 38}px`;

                  return (
                    <div
                      key={keyDef.key}
                      style={{
                        flexGrow: keyDef.width ?? 1,
                        flexShrink: keyDef.width ?? 1,
                        flexBasis,
                        maxWidth: keyDef.width ? `${(keyDef.width ?? 1) * 75}px` : "55px",
                      }}
                      className={`relative flex h-9.5 min-w-[24px] flex-col items-center justify-center rounded-md border transition-all duration-100 ${
                        isActive
                          ? `${fingerStyle.activeBgClass} scale-[1.04] z-20`
                          : keyDef.home
                          ? "border-emerald-500/60 bg-zinc-900/90 text-zinc-100 shadow-[inset_0_0_8px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                          : `border-zinc-800/90 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700`
                      }`}
                    >
                      {/* Horní (shift) popisek, pokud existuje */}
                      {keyDef.shiftLabel && (
                        <span
                          className={`absolute top-0.5 right-1 text-[9px] leading-none ${
                            isActive ? "opacity-90" : "text-zinc-500"
                          }`}
                        >
                          {keyDef.shiftLabel}
                        </span>
                      )}

                      {/* Hlavní popisek klávesy */}
                      <span
                        className={`leading-none ${
                          keyDef.special
                            ? "text-[10px] tracking-tight font-sans font-medium"
                            : "text-xs font-bold"
                        } ${isActive ? "" : fingerStyle.keyTextClass}`}
                      >
                        {keyDef.label}
                      </span>

                      {/* Hmatový výstupek na F a J */}
                      {keyDef.nub && (
                        <span
                          className={`absolute bottom-1 h-0.5 w-3 rounded-full transition-colors ${
                            isActive ? "bg-black/80" : "bg-emerald-400/80"
                          }`}
                          title="Hmatový výstupek pro orientaci prstů"
                        />
                      )}

                      {/* Barevný proužek prstu na spodním okraji klávesy */}
                      {!isActive && (
                        <span
                          className="absolute bottom-0 inset-x-1 h-[2px] rounded-full opacity-70"
                          style={{ backgroundColor: fingerStyle.accentHex }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legenda prstů s barevným rozlišením */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between border-t border-zinc-800/60 pt-2 text-[11px] text-zinc-400">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-zinc-500 mr-1">Levá ruka:</span>
              {(["left_pinky", "left_ring", "left_middle", "left_index"] as Finger[]).map((f) => (
                <span key={f} className="inline-flex items-center gap-1 rounded bg-zinc-900/80 px-1.5 py-0.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: FINGER_DATA[f].accentHex }}
                  />
                  <span className="text-zinc-300">{FINGER_DATA[f].shortLabel.replace("L. ", "")}</span>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1 text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span>Palce: mezerník</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-zinc-500 mr-1">Pravá ruka:</span>
              {(["right_index", "right_middle", "right_ring", "right_pinky"] as Finger[]).map((f) => (
                <span key={f} className="inline-flex items-center gap-1 rounded bg-zinc-900/80 px-1.5 py-0.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: FINGER_DATA[f].accentHex }}
                  />
                  <span className="text-zinc-300">{FINGER_DATA[f].shortLabel.replace("P. ", "")}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
