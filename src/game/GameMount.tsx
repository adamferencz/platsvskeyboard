"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { bridge } from "./bridge";
import { chapterById } from "./content/curriculum";
import { loadWords, type KeyStat } from "./content/words";
import type { HudState, RunResult } from "./types";

interface Props {
  chapter: number;
  round: number;
  keyStats: Record<string, KeyStat>;
  playerCpm: number;
  onFinished: (result: RunResult) => void;
  onExit: () => void;
}

/**
 * Obal Phaseru pro React: vytvoří hru v useEffect, zničí ji při odmountování.
 * HUD kreslí React nad canvasem podle událostí z mostu (max. 5× za sekundu).
 */
export default function GameMount({ chapter, round, keyStats, playerCpm, onFinished, onExit }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [loading, setLoading] = useState(true);
  const finishedRef = useRef(onFinished);
  const exitRef = useRef(onExit);
  finishedRef.current = onFinished;
  exitRef.current = onExit;

  useEffect(() => {
    let cancelled = false;
    const offHud = bridge.onTyped("hud", setHud);
    const offReady = bridge.onTyped("level-ready", () => setLoading(false));
    const offFinished = bridge.onTyped("run-finished", (r) => finishedRef.current(r));
    const offExit = bridge.onTyped("exit", () => exitRef.current());

    (async () => {
      const [{ createGame }, words] = await Promise.all([import("./main"), loadWords()]);
      if (cancelled || !parentRef.current) return;
      gameRef.current = createGame(parentRef.current, {
        chapter,
        round,
        words,
        keyStats,
        playerCpm,
        parent: parentRef.current,
      });
    })();

    return () => {
      cancelled = true;
      offHud();
      offReady();
      offFinished();
      offExit();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // hra se vytváří jednou pro danou úroveň; keyStats/playerCpm se čtou jen při startu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, round]);

  const ch = chapterById(chapter);

  return (
    <div className="relative mx-auto w-full max-w-[1280px] select-none">
      <div ref={parentRef} className="aspect-video w-full overflow-hidden rounded-xl bg-[#1e2a24] shadow-2xl" />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 text-white">
        <div className="space-y-1 rounded-lg bg-black/55 px-3 py-2 backdrop-blur-sm">
          <div className="text-sm text-zinc-200">
            Kapitola {chapter} · {ch?.name} · kolo {round}
          </div>
          <div className="text-2xl text-red-500" aria-label={`Životy: ${hud?.lives ?? "-"}`}>
            {"❤".repeat(hud?.lives ?? 0)}
            <span className="opacity-25">{"❤".repeat(Math.max(0, 5 - (hud?.lives ?? 0)))}</span>
          </div>
        </div>
        <div className="rounded-lg bg-black/55 px-3 py-2 text-right backdrop-blur-sm">
          <div className="text-3xl font-bold tabular-nums">{hud?.score ?? 0}</div>
          <div className="text-sm text-zinc-200">
            zbývá {hud?.remaining ?? "-"} · kombo {hud?.combo ?? 0}
          </div>
        </div>
      </div>

      {hud?.boost && (
        <div
          onClick={() => {
            bridge.emitTyped("toggle-boost", true);
            parentRef.current?.querySelector("input")?.focus();
          }}
          className={`absolute left-1/2 top-3 -translate-x-1/2 cursor-pointer select-none transition-all duration-150 ${
            hud.boost.locked
              ? "scale-105 ring-4 ring-emerald-400 border-2 border-emerald-300 shadow-2xl shadow-emerald-500/60 bg-zinc-900/95"
              : "hover:scale-[1.02] ring-1 ring-white/20 hover:ring-emerald-400/50 shadow-lg bg-zinc-900/90"
          } rounded-2xl px-5 py-2.5 backdrop-blur-md`}
        >
          {hud.boost.locked && (
            <>
              {/* Vizuální zaměřovač / rohy cíle */}
              <span className="pointer-events-none absolute -top-1 -left-1 text-emerald-400 font-mono text-xs font-black">⌜</span>
              <span className="pointer-events-none absolute -top-1 -right-1 text-emerald-400 font-mono text-xs font-black">⌝</span>
              <span className="pointer-events-none absolute -bottom-1 -left-1 text-emerald-400 font-mono text-xs font-black">⌞</span>
              <span className="pointer-events-none absolute -bottom-1 -right-1 text-emerald-400 font-mono text-xs font-black">⌟</span>
              {/* Odznak zaměřovače v rohu */}
              <div className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/50">
                <svg className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "6s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="1" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="1" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="23" y2="12" />
                </svg>
              </div>
            </>
          )}
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">{hud.boost.icon}</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
                <span>{hud.boost.title}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1 ${
                    hud.boost.locked
                      ? "bg-emerald-500 text-black font-bold tracking-wide"
                      : "bg-white/10 text-zinc-300"
                  }`}
                >
                  {hud.boost.locked ? (
                    <>
                      <span>🎯 ZAMČENO · PIŠ SLOVO</span>
                    </>
                  ) : (
                    "MEZERNÍK / TAB = ZAMĚŘIT"
                  )}
                </span>
              </div>
              <div className="font-mono text-2xl font-bold tracking-wider text-white">
                <span className="text-emerald-400 underline decoration-2 underline-offset-4">
                  {hud.boost.word.slice(0, hud.boost.typed)}
                </span>
                <span className="text-zinc-100 opacity-90">
                  {hud.boost.word.slice(hud.boost.typed)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}


      {hud?.boss && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <div className="w-1/2 rounded-full bg-black/50 p-1">
            <div className="h-4 rounded-full bg-purple-500 transition-all" style={{ width: `${(hud.boss.hp / hud.boss.maxHp) * 100}%` }} />
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 text-xl text-white">
          Načítám zombíky…
        </div>
      )}
    </div>
  );
}
