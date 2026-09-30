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
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 text-white drop-shadow">
        <div className="space-y-1">
          <div className="text-sm opacity-80">
            Kapitola {chapter} · {ch?.name} · kolo {round}
          </div>
          <div className="text-2xl" aria-label={`Životy: ${hud?.lives ?? "-"}`}>
            {"❤".repeat(hud?.lives ?? 0)}
            <span className="opacity-30">{"❤".repeat(Math.max(0, 5 - (hud?.lives ?? 0)))}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tabular-nums">{hud?.score ?? 0}</div>
          <div className="text-sm opacity-80">
            zbývá {hud?.remaining ?? "-"} · kombo {hud?.combo ?? 0}
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
    </div>
  );
}
