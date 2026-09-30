/**
 * Parametry kola: kolik zombíků, jak rychle, kdy boss, kolik věží.
 * Rychlost se odvíjí od cílové rychlosti psaní, ne jen od čísla kola.
 */
import { ROUNDS_PER_CHAPTER, chapterById } from "./curriculum";

export type ZombieKind = "basic" | "fast" | "armored" | "boss";

export interface RoundConfig {
  chapter: number;
  round: number;
  /** počet běžných zombíků */
  count: number;
  /** interval spawnu v ms */
  spawnMs: number;
  /** čas, za který zombík přejde dráhu (s) */
  crossSec: number;
  /** boss na konci kola */
  boss: boolean;
  bossHp: number;
  /** poměr rychlých zombíků 0..1 */
  fastRatio: number;
  armoredRatio: number;
  /** jak často se nabízí bonusové slovo (0 = nikdy) */
  bonusEvery: number;
  lives: number;
}

export function roundConfig(chapter: number, round: number, playerCpm = 0): RoundConfig {
  const ch = chapterById(chapter);
  const gate = ch?.gate ?? false;
  const boss = round === ROUNDS_PER_CHAPTER;
  const difficulty = (chapter - 1) * 0.6 + (round - 1) * 0.8 + (gate ? 2 : 0);

  // silný student dostane rychlejší zombíky, slabý pomalejší
  const cpmFactor = playerCpm > 0 ? Math.min(1.6, Math.max(0.7, playerCpm / 150)) : 1;
  const crossSec = Math.max(4.5, (14 - difficulty * 0.35) / cpmFactor);

  return {
    chapter,
    round,
    count: Math.round(8 + difficulty * 1.2),
    spawnMs: Math.max(1100, 3200 - difficulty * 110),
    crossSec,
    boss,
    bossHp: 3 + Math.floor(chapter / 6),
    fastRatio: chapter >= 3 ? Math.min(0.35, 0.05 + difficulty * 0.02) : 0,
    armoredRatio: chapter >= 8 ? Math.min(0.25, difficulty * 0.015) : 0,
    bonusEvery: chapter >= 3 ? 4 : 0,
    lives: 5,
  };
}
