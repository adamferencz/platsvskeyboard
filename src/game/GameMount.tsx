"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { soundManager } from "./audio/soundManager";
import { bridge } from "./bridge";
import { chapterById } from "./content/curriculum";
import { loadWords, type KeyStat } from "./content/words";
import type { HudState, RunResult } from "./types";
import { FingeringDiagram } from "@/components/FingeringDiagram";

interface Props {
  chapter: number;
  round: number;
  keyStats: Record<string, KeyStat>;
  playerCpm: number;
  layout?: "qwertz" | "qwerty";
  onFinished: (result: RunResult) => void;
  onExit: () => void;
}

/**
 * Obal Phaseru pro React: vytvoří hru v useEffect, zničí ji při odmountování.
 * HUD kreslí React nad canvasem podle událostí z mostu (max. 5× za sekundu).
 */
export default function GameMount({ chapter, round, keyStats, playerCpm, layout, onFinished, onExit }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const finishedRef = useRef(onFinished);
  const exitRef = useRef(onExit);
  finishedRef.current = onFinished;
  exitRef.current = onExit;

  useEffect(() => {
    setMuted(soundManager.isMuted());
    const offMute = soundManager.addListener(setMuted);
    return () => {
      offMute();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsPaused(false);
    const offHud = bridge.onTyped("hud", setHud);
    const offReady = bridge.onTyped("level-ready", () => setLoading(false));
    const offFinished = bridge.onTyped("run-finished", (r) => finishedRef.current(r));
    const offExit = bridge.onTyped("exit", () => exitRef.current());
    const offPause = bridge.onTyped("pause-state", setIsPaused);

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
      offPause();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // hra se vytváří jednou pro danou úroveň; keyStats/playerCpm se čtou jen při startu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, round]);

  useEffect(() => {
    if (!isPaused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        bridge.emitTyped("resume-level");
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setIsPaused(false);
        bridge.emitTyped("restart-level");
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        exitRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaused]);

  const ch = chapterById(chapter);

  return (
    <div className="mx-auto w-full max-w-[1280px] select-none">
      <div className="relative">
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
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => bridge.emitTyped("pause-level")}
              aria-label="Pozastavit hru"
              className="pointer-events-auto rounded-lg bg-black/55 px-3 py-2 text-xl text-zinc-300 backdrop-blur-sm transition-colors hover:bg-black/75 hover:text-white"
              title="Pauza (Esc)"
            >
              ⏸
            </button>
            <button
              type="button"
              onClick={() => soundManager.toggleMute()}
              className="pointer-events-auto flex items-center justify-center rounded-lg bg-black/55 px-3 py-2 text-xl backdrop-blur-sm transition hover:bg-black/75 hover:scale-105 active:scale-95 focus:outline-none"
              title={(hud?.muted ?? muted) ? "Zapnout zvuk (SFX)" : "Ztlumit zvuk (SFX)"}
              aria-label={(hud?.muted ?? muted) ? "Zapnout zvuk" : "Ztlumit zvuk"}
            >
              {(hud?.muted ?? muted) ? "🔇" : "🔊"}
            </button>
            <div className="rounded-lg bg-black/55 px-3 py-2 text-right backdrop-blur-sm">
              <div className="text-3xl font-bold tabular-nums">{hud?.score ?? 0}</div>
              <div className="text-sm text-zinc-200">
                zbývá {hud?.remaining ?? "-"} · kombo {hud?.combo ?? 0}
              </div>
            </div>
          </div>
        </div>

        {hud?.bonusWord && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-emerald-600/90 px-5 py-2 font-mono text-2xl text-white shadow-lg">
            🌱 <span className="text-emerald-200">{hud.bonusWord.slice(0, hud.bonusTyped)}</span>
            {hud.bonusWord.slice(hud.bonusTyped)}
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

        {/* Pause Modal */}
        {isPaused && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-2xl text-emerald-400">
                ⏸
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Hra pozastavena</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Kapitola {chapter} · {ch?.name} · kolo {round}
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => bridge.emitTyped("resume-level")}
                  className="w-full flex items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow hover:bg-emerald-500 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Pokračovat</span>
                  <kbd className="rounded bg-emerald-700/60 px-2 py-0.5 text-xs text-emerald-100 font-mono">
                    Esc / Enter
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPaused(false);
                    bridge.emitTyped("restart-level");
                  }}
                  className="w-full flex items-center justify-between rounded-xl bg-zinc-800 border border-white/5 px-4 py-3 font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Restartovat kolo</span>
                  <kbd className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300 font-mono">
                    R
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={() => exitRef.current()}
                  className="w-full flex items-center justify-between rounded-xl bg-zinc-800/60 border border-white/5 px-4 py-3 font-medium text-zinc-400 hover:bg-red-950/40 hover:text-red-300 hover:border-red-900/30 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Odejít na mapu</span>
                  <kbd className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 font-mono">
                    M
                  </kbd>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vizuální nápověda prstokladu pod herním plátnem */}
      <div className="mt-3">
        <FingeringDiagram expectedChar={hud?.expectedChar} initialLayout={layout} />
      </div>
    </div>
  );
}
