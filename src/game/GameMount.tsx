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
  const [damaged, setDamaged] = useState(false);
  const prevLivesRef = useRef<number | null>(null);
  const finishedRef = useRef(onFinished);
  const exitRef = useRef(onExit);
  finishedRef.current = onFinished;
  exitRef.current = onExit;

  useEffect(() => {
    if (hud?.lives !== undefined) {
      if (prevLivesRef.current !== null && hud.lives < prevLivesRef.current) {
        setDamaged(true);
        const timer = setTimeout(() => setDamaged(false), 500);
        return () => clearTimeout(timer);
      }
      prevLivesRef.current = hud.lives;
    }
  }, [hud?.lives]);

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
  const combo = hud?.combo ?? 0;

  return (
    <div className="relative mx-auto w-full max-w-[1280px] select-none">
      <div ref={parentRef} className="aspect-video w-full overflow-hidden rounded-xl bg-[#1e2a24] shadow-2xl" />

      {/* Damage flash vignette */}
      {damaged && (
        <div className="pointer-events-none absolute inset-0 z-10 rounded-xl border-4 border-red-500/70 shadow-[inset_0_0_50px_rgba(239,68,68,0.7)] animate-in fade-in duration-100" />
      )}

      {/* In-Game Arcade HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 text-white">
        {/* Left: Chapter pill & Glowing Life Containers */}
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/65 px-3.5 py-2.5 backdrop-blur-md shadow-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Kapitola {chapter} · {ch?.name} · {round === 6 ? "👑 Boss" : `kolo ${round}`}
          </div>
          {/* Glowing Life Containers */}
          <div
            className={`flex items-center gap-1.5 ${damaged ? "animate-damage-shake" : ""}`}
            aria-label={`Životy: ${hud?.lives ?? "-"}`}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const active = i < (hud?.lives ?? 0);
              return (
                <div
                  key={i}
                  className="relative flex items-center justify-center transition-all duration-300"
                  style={{
                    filter: active
                      ? "drop-shadow(0 0 6px rgba(239, 68, 68, 0.95)) drop-shadow(0 0 14px rgba(220, 38, 38, 0.6))"
                      : "drop-shadow(0 0 1px rgba(0, 0, 0, 0.8))",
                  }}
                >
                  <svg
                    className={`h-6 w-6 sm:h-7 sm:w-7 transition-all duration-200 ${
                      active
                        ? "fill-red-500 stroke-red-300 stroke-1 scale-100"
                        : "fill-zinc-900/90 stroke-zinc-700/60 stroke-1 opacity-35 scale-90"
                    }`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  {active && (
                    <span className="absolute top-1.5 left-2 h-1.5 w-1.5 rounded-full bg-white/80 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Dedicated Arcade Combo Meter */}
        <div className="flex flex-col items-center justify-center pt-1">
          {combo > 0 && (
            <div
              key={combo}
              className={`animate-combo-bounce flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 font-black uppercase tracking-wider text-sm sm:text-base shadow-2xl backdrop-blur-md transition-all ${
                combo >= 20
                  ? "animate-ultra-pulse border-yellow-300 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 text-yellow-100 shadow-[0_0_25px_rgba(234,179,8,0.8)]"
                  : combo >= 10
                  ? "border-orange-300 bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.7)]"
                  : combo >= 5
                  ? "border-yellow-400 bg-gradient-to-r from-amber-600 to-yellow-600 text-amber-50 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                  : "border-emerald-400 bg-gradient-to-r from-emerald-800 to-teal-800 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
              }`}
            >
              <span>
                {combo >= 20
                  ? `⚡ ULTRA COMBO x${combo} ⚡`
                  : combo >= 10
                  ? `🔥 COMBO x${combo} 🔥`
                  : combo >= 5
                  ? `✨ KOMBO x${combo}`
                  : `KOMBO x${combo}`}
              </span>
            </div>
          )}
        </div>

        {/* Right: Arcade Score & Remaining Counter */}
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-950/60 via-zinc-950/85 to-black/90 px-4 py-2 text-right backdrop-blur-md shadow-xl">
          <div className="flex items-baseline justify-end gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400/80">Skóre</span>
            <span className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {hud?.score ?? 0}
            </span>
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-zinc-300">
            <span>🧟</span>
            <span>zbývá {hud?.remaining ?? "-"}</span>
          </div>
        </div>
      </div>

      {hud?.bonusWord && (
        <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full border border-emerald-400/50 bg-emerald-600/95 px-5 py-2 font-mono text-xl sm:text-2xl text-white shadow-xl backdrop-blur-sm">
          🌱 <span className="text-emerald-200">{hud.bonusWord.slice(0, hud.bonusTyped)}</span>
          {hud.bonusWord.slice(hud.bonusTyped)}
        </div>
      )}

      {hud?.boss && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <div className="w-1/2 rounded-full border border-purple-500/40 bg-black/70 p-1 backdrop-blur-sm shadow-xl">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 transition-all shadow-[0_0_10px_rgba(168,85,247,0.7)]"
              style={{ width: `${(hud.boss.hp / hud.boss.maxHp) * 100}%` }}
            />
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
