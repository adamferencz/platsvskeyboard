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
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const finishedRef = useRef(onFinished);
  const exitRef = useRef(onExit);
  finishedRef.current = onFinished;
  exitRef.current = onExit;

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const isFs = Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(isFs);
      setTimeout(() => {
        gameRef.current?.scale.refresh();
      }, 50);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const el = containerRef.current as (HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    }) | null;

    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      if (el?.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el?.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  };

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
    <div
      ref={containerRef}
      className={`relative mx-auto w-full select-none ${
        isFullscreen
          ? "fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-black"
          : "max-w-[1280px]"
      }`}
    >
      <div
        className={`relative aspect-video w-full ${
          isFullscreen ? "max-h-screen max-w-[calc(100vh*16/9)]" : ""
        }`}
      >
        <div
          ref={parentRef}
          className={`absolute inset-0 overflow-hidden bg-[#1e2a24] shadow-2xl ${
            isFullscreen ? "rounded-none" : "rounded-xl"
          }`}
        />

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
            <div className="rounded-lg bg-black/55 px-3 py-2 text-right backdrop-blur-sm">
              <div className="text-3xl font-bold tabular-nums">{hud?.score ?? 0}</div>
              <div className="text-sm text-zinc-200">
                zbývá {hud?.remaining ?? "-"} · kombo {hud?.combo ?? 0}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                toggleFullscreen();
              }}
              aria-label={isFullscreen ? "Ukončit celou obrazovku" : "Celá obrazovka"}
              title={isFullscreen ? "Ukončit celou obrazovku" : "Celá obrazovka"}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg bg-black/55 text-zinc-200 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white active:scale-95 cursor-pointer"
            >
              {isFullscreen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                  <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                  <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                  <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
              )}
            </button>
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
    </div>
  );
}
