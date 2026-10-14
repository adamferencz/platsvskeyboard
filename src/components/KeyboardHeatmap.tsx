"use client";

import { useMemo, useState } from "react";
import type { KeyStat } from "@/game/content/words";
import {
  FINGER_NAMES,
  KeyDefinition,
  findChapterForKey,
  getLayout,
} from "@/lib/keyboard";

export interface KeyboardHeatmapProps {
  keyStats?: Record<string, KeyStat> | null;
  layout?: "qwertz" | "qwerty";
  onLayoutChange?: (layout: "qwertz" | "qwerty") => void;
  className?: string;
}

export function KeyboardHeatmap({
  keyStats,
  layout = "qwertz",
  onLayoutChange,
  className = "",
}: KeyboardHeatmapProps) {
  const [internalLayout, setInternalLayout] = useState<"qwertz" | "qwerty">(layout);
  const currentLayout = onLayoutChange ? layout : internalLayout;

  const [hoveredKey, setHoveredKey] = useState<KeyDefinition | null>(null);
  const [selectedKey, setSelectedKey] = useState<KeyDefinition | null>(null);

  const handleLayoutSwitch = (newLayout: "qwertz" | "qwerty") => {
    setInternalLayout(newLayout);
    onLayoutChange?.(newLayout);
  };

  const keyboardRows = useMemo(() => getLayout(currentLayout), [currentLayout]);

  // Agregované statistiky pro celou klávesnici
  const summary = useMemo(() => {
    let totalHits = 0;
    let totalMisses = 0;
    let trainedCount = 0;
    let worstKey: { key: string; errorRate: number; label: string } | null = null;

    if (keyStats) {
      for (const [k, stat] of Object.entries(keyStats)) {
        if (!k || k.length > 2) continue;
        const h = stat.hits ?? 0;
        const m = stat.misses ?? 0;
        const t = h + m;
        if (t > 0) {
          totalHits += h;
          totalMisses += m;
          trainedCount++;
          const err = m / t;
          if (t >= 3 && m > 0 && (!worstKey || err > worstKey.errorRate)) {
            worstKey = {
              key: k,
              errorRate: err,
              label: k === " " ? "Mezerník" : k.toUpperCase(),
            };
          }
        }
      }
    }

    const totalStrokes = totalHits + totalMisses;
    const avgAccuracy = totalStrokes > 0 ? Math.round((totalHits / totalStrokes) * 100) : 100;

    return {
      totalHits,
      totalMisses,
      totalStrokes,
      trainedCount,
      avgAccuracy,
      worstKey,
    };
  }, [keyStats]);

  // Pomocná funkce pro vytažení KeyStat pro danou klávesu
  const getKeyStats = (keyDef: KeyDefinition): { stat: KeyStat | null; total: number; errorRate: number; accuracy: number } => {
    if (!keyStats) return { stat: null, total: 0, errorRate: 0, accuracy: 100 };
    const k = keyDef.key.toLowerCase();
    const alt = (keyDef.altKey ?? keyDef.shiftLabel ?? keyDef.shiftChar)?.toLowerCase();
    const stat = keyStats[k] ?? (alt ? keyStats[alt] : null) ?? null;

    if (!stat) return { stat: null, total: 0, errorRate: 0, accuracy: 100 };
    const hits = stat.hits ?? 0;
    const misses = stat.misses ?? 0;
    const total = hits + misses;
    if (total === 0) return { stat, total: 0, errorRate: 0, accuracy: 100 };

    const errorRate = misses / total;
    const accuracy = Math.round((hits / total) * 100);
    return { stat, total, errorRate, accuracy };
  };

  // Vizuální barvy podle požadavků:
  // < 5% errors: emerald green (bg-emerald-600/80)
  // 5%–20% errors: amber/yellow (bg-amber-500/80)
  // > 20% errors: coral/rose red (bg-rose-600/80)
  // 0 attempts: neutral dark zinc (bg-zinc-800/50)
  const getKeyColorClasses = (keyDef: KeyDefinition, isFunctional: boolean) => {
    const { total, errorRate } = getKeyStats(keyDef);

    if (total === 0) {
      if (isFunctional) {
        return "bg-zinc-900/80 text-zinc-400 border-zinc-800/80 hover:bg-zinc-800/90";
      }
      return "bg-zinc-800/50 text-zinc-400 border-zinc-700/40 hover:bg-zinc-800 hover:border-zinc-500";
    }

    if (errorRate < 0.05) {
      return "bg-emerald-600/80 text-emerald-50 border-emerald-500/70 hover:bg-emerald-500 shadow-sm shadow-emerald-950/60";
    }
    if (errorRate <= 0.2) {
      return "bg-amber-500/80 text-zinc-950 border-amber-400/90 font-medium hover:bg-amber-400 shadow-sm shadow-amber-950/60";
    }
    return "bg-rose-600/80 text-rose-50 border-rose-500 font-bold hover:bg-rose-500 shadow-sm shadow-rose-950/70";
  };

  // Aktivní klávesa pro zobrazení detailu (hovered má přednost před vybranou)
  const activeKey = hoveredKey ?? selectedKey;
  const activeStats = activeKey ? getKeyStats(activeKey) : null;
  const activeChapter = activeKey && !activeKey.special && activeKey.key !== " "
    ? findChapterForKey(activeKey.key)
    : null;

  return (
    <div className={`rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-xl ${className}`}>
      {/* Hlavička: Nadpis + Přepínač rozložení klávesnice */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <svg
              className="h-5 w-5 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="2" y="4" width="20" height="16" rx="3" strokeWidth="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Heatmapa chybovosti klávesnice
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Barevné zobrazení chybovosti jednotlivých kláves z tvých odehraných her. Přejeď myší nebo klikni na klávesu pro detail.
          </p>
        </div>

        {/* Přepínač rozložení */}
        <div className="flex items-center rounded-xl bg-zinc-950 p-1 text-xs border border-white/10">
          <button
            type="button"
            onClick={() => handleLayoutSwitch("qwertz")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              currentLayout === "qwertz"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Česká QWERTZ
          </button>
          <button
            type="button"
            onClick={() => handleLayoutSwitch("qwerty")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              currentLayout === "qwerty"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Česká QWERTY
          </button>
        </div>
      </div>

      {/* Rychlý přehled statistik */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
        <div className="rounded-lg bg-zinc-950/70 p-2.5 border border-white/5">
          <div className="text-zinc-400">Celkem úhozů</div>
          <div className="mt-0.5 text-base font-bold text-white">{summary.totalStrokes.toLocaleString("cs-CZ")}</div>
        </div>
        <div className="rounded-lg bg-zinc-950/70 p-2.5 border border-white/5">
          <div className="text-zinc-400">Průměrná přesnost</div>
          <div className="mt-0.5 text-base font-bold text-emerald-400">{summary.avgAccuracy} %</div>
        </div>
        <div className="rounded-lg bg-zinc-950/70 p-2.5 border border-white/5">
          <div className="text-zinc-400">Natrénováno kláves</div>
          <div className="mt-0.5 text-base font-bold text-white">{summary.trainedCount}</div>
        </div>
        <div className="rounded-lg bg-zinc-950/70 p-2.5 border border-white/5">
          <div className="text-zinc-400">Nejslabší klávesa</div>
          <div className="mt-0.5 text-base font-bold text-rose-400">
            {summary.worstKey ? `${summary.worstKey.label} (${Math.round(summary.worstKey.errorRate * 100)} % chyb)` : "Žádná"}
          </div>
        </div>
      </div>

      {/* Vizuální plátno klávesnice */}
      <div className="overflow-x-auto rounded-xl bg-zinc-950/80 p-3.5 border border-white/5 shadow-inner">
        <div className="min-w-[680px] space-y-1.5 select-none font-mono">
          {keyboardRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1.5 justify-center">
              {row.map((keyDef) => {
                const isFunctional = Boolean(keyDef.special);

                const width = keyDef.width ?? 1.0;
                const { total, errorRate, accuracy } = getKeyStats(keyDef);
                const colorClasses = getKeyColorClasses(keyDef, isFunctional);
                const isSelected = selectedKey?.key === keyDef.key;
                const isHovered = hoveredKey?.key === keyDef.key;

                // Tooltip text pro nativní hover
                const tooltipText = isFunctional
                  ? keyDef.label
                  : total > 0
                  ? `Klávesa ${keyDef.key === " " ? "Mezerník" : keyDef.key.toUpperCase()}: ${accuracy} % úspěšnost (${total} úhozů, ${keyStats?.[keyDef.key]?.misses ?? 0} chyb)`
                  : `Klávesa ${keyDef.key === " " ? "Mezerník" : keyDef.key.toUpperCase()}: Zatím netrénováno`;

                return (
                  <button
                    key={keyDef.key}
                    type="button"
                    title={tooltipText}
                    style={{ flex: `${width} 0 0%` }}
                    onClick={() => setSelectedKey(isSelected ? null : keyDef)}
                    onMouseEnter={() => setHoveredKey(keyDef)}
                    onMouseLeave={() => setHoveredKey(null)}
                    className={`relative flex h-11 items-center justify-center rounded-lg border text-xs transition duration-150 ${colorClasses} ${
                      isSelected
                        ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 z-10"
                        : isHovered
                        ? "scale-[1.03] z-10"
                        : ""
                    }`}
                  >
                    <span className="truncate px-1 text-center font-sans font-semibold">
                      {keyDef.shiftLabel && !keyDef.special ? `${keyDef.shiftLabel} ${keyDef.label}` : keyDef.label}
                    </span>

                    {/* Hmatový výstupek na klávesách F a J */}
                    {keyDef.nub && (
                      <span className="absolute bottom-1 h-0.5 w-3.5 rounded-full bg-current opacity-80" />
                    )}

                    {/* Malý indikátor počtu chyb pro klávesy s vysokou chybovostí */}
                    {total >= 3 && errorRate > 0.2 && (
                      <span className="absolute top-0.5 right-1 text-[9px] font-mono leading-none opacity-90">
                        !
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda barev podle DISPATCH zadání */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-zinc-300">Legenda:</span>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-600/80 border border-emerald-500/80" />
            <span>&lt; 5 % chyb (Bezchybné)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500/80 border border-amber-400/90" />
            <span>5–20 % chyb (Občasná chyba)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-600/80 border border-rose-500" />
            <span>&gt; 20 % chyb (Časté chyby)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-zinc-800/50 border border-zinc-700/40" />
            <span>0 pokusů (Netrénováno)</span>
          </div>
        </div>
      </div>

      {/* Interaktivní detailní karta klávesy (Interactive key card / tooltip) */}
      <div className="mt-4 rounded-xl border border-white/5 bg-zinc-950/60 p-3.5">
        {activeKey ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border text-xl font-bold font-mono ${getKeyColorClasses(
                  activeKey,
                  false
                )}`}
              >
                {activeKey.key === " " ? "␣" : activeKey.key.toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {activeKey.key === " " ? "Mezerník" : `Klávesa ${activeKey.label.split(" ")[0].toUpperCase()}`}
                  </span>
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
                    {FINGER_NAMES[activeKey.finger]}
                  </span>
                  {activeKey.home && (
                    <span className="rounded-md bg-emerald-950 px-2 py-0.5 text-[11px] text-emerald-300 border border-emerald-800/50">
                      Domovská klávesa
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {activeChapter ? (
                    <span>
                      V kurzu od: <span className="text-zinc-200">Kapitola {activeChapter.id} ({activeChapter.name})</span>
                    </span>
                  ) : (
                    <span>Funkční klávesa</span>
                  )}
                </div>
              </div>
            </div>

            {/* Statistické ukazatele aktivní klávesy */}
            {activeStats && activeStats.total > 0 ? (
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="text-right">
                  <div className="text-zinc-400">Přesnost</div>
                  <div className={`text-base font-bold ${
                    activeStats.errorRate < 0.05
                      ? "text-emerald-400"
                      : activeStats.errorRate <= 0.2
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}>
                    {activeStats.accuracy} %
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-400">Správné úhozy</div>
                  <div className="text-base font-bold text-white">{activeStats.stat?.hits ?? 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-400">Překlepy</div>
                  <div className="text-base font-bold text-rose-400">{activeStats.stat?.misses ?? 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-400">Celkem</div>
                  <div className="text-base font-bold text-zinc-200">{activeStats.total}</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 italic">
                Tuto klávesu jsi ve svých odehraných kolech ještě nepoužil(a).
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <svg className="h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Kliknutím nebo najetím myší na jakoukoli klávesu zobrazíš podrobné statistiky úhozů a doporučený prst.</span>
          </div>
        )}
      </div>
    </div>
  );
}
