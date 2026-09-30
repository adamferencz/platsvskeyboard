import type { KeyStat } from "./content/words";

export interface LevelRequest {
  chapter: number;
  round: number;
}

/** Výsledek jednoho odehraného kola — jediná věc, kterou hra předává ven. */
export interface RunResult {
  levelId: string;
  chapter: number;
  round: number;
  won: boolean;
  correct: number;
  errors: number;
  durationMs: number;
  /** hrubé úhozy/min */
  cpm: number;
  /** čisté úhozy/min */
  netCpm: number;
  accuracy: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
  livesLost: number;
  kills: number;
  maxCombo: number;
  keyStats: Record<string, KeyStat>;
  /** [t ms od začátku, 1 = správně / 0 = chyba] */
  keystrokes: [number, 0 | 1][];
}

export interface HudState {
  lives: number;
  score: number;
  combo: number;
  remaining: number;
  bonusWord: string | null;
  bonusTyped: number;
  boss: { hp: number; maxHp: number } | null;
}
