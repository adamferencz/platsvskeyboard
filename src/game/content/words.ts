/**
 * Generátor textů pro zombíky.
 *
 * Slovník: public/data/words-cs.json (rspeer/wordfreq, CC BY-SA 4.0) — [slovo, pořadí].
 * Pro malé sady kláves (kapitoly 1–2) reálná česká slova neexistují, proto pseudo-slabiky.
 * Adaptivita (jako keybr): nejslabší klávesa ("focus key") se objeví v polovině textů.
 */

import type { Chapter } from "./curriculum";
import { allowsPunctuation, allowsUppercase, lettersOf } from "./curriculum";

export type WordList = [string, number][];

export interface KeyStat {
  hits: number;
  misses: number;
}

export interface GeneratorOptions {
  chapter: Chapter;
  round: number;
  words: WordList;
  keyStats?: Record<string, KeyStat>;
  rng?: () => number;
}

const VOWELS = new Set("aeiouyáéěíóúůý".split(""));

export class WordGenerator {
  private pool: string[];
  private letters: string[];
  private focusKey: string | null;
  private rng: () => number;
  private opts: GeneratorOptions;

  constructor(opts: GeneratorOptions) {
    this.opts = opts;
    this.rng = opts.rng ?? Math.random;
    this.letters = lettersOf(opts.chapter);
    const set = new Set(this.letters);
    const [minLen, maxLen] = this.lengthRange();
    this.pool = opts.words
      .filter(([w]) => w.length >= minLen && w.length <= maxLen && [...w].every((ch) => set.has(ch)))
      .map(([w]) => w);
    this.focusKey = this.pickFocusKey();
  }

  /** Délka textu podle kapitoly a kola. */
  private lengthRange(): [number, number] {
    const c = this.opts.chapter.id;
    const r = this.opts.round;
    if (c <= 2) return [1, r <= 3 ? 1 : 2];
    if (c <= 6) return [2, 3 + Math.floor(r / 3)];
    if (c <= 14) return [3, 5 + Math.floor(r / 3)];
    return [4, 7 + Math.floor(r / 3)];
  }

  private pickFocusKey(): string | null {
    const stats = this.opts.keyStats;
    if (!stats) return null;
    let worst: string | null = null;
    let worstScore = -1;
    for (const k of this.letters) {
      const s = stats[k];
      if (!s || s.hits + s.misses < 5) continue;
      const rate = s.misses / (s.hits + s.misses);
      if (rate > worstScore) {
        worstScore = rate;
        worst = k;
      }
    }
    return worstScore > 0.08 ? worst : null;
  }

  /** Náhodná pseudo-slabika (CV / CVC / VC) z dostupných písmen. */
  private pseudoWord(len: number): string {
    const vowels = this.letters.filter((l) => VOWELS.has(l));
    const cons = this.letters.filter((l) => !VOWELS.has(l));
    let out = "";
    for (let i = 0; i < len; i++) {
      const wantVowel = vowels.length > 0 && (i % 2 === 1 || cons.length === 0);
      const src = wantVowel ? vowels : cons.length ? cons : this.letters;
      out += src[Math.floor(this.rng() * src.length)];
    }
    return out;
  }

  /** Text pro jednoho zombíka. */
  next(): string {
    const [minLen, maxLen] = this.lengthRange();
    let word: string;
    const useFocus = this.focusKey && this.rng() < 0.5;
    const candidates = useFocus ? this.pool.filter((w) => w.includes(this.focusKey!)) : this.pool;

    if (candidates.length >= 8) {
      // častější slova mají větší šanci (pool je seřazený podle frekvence)
      const idx = Math.floor(Math.pow(this.rng(), 1.6) * candidates.length);
      word = candidates[idx];
    } else if (this.pool.length >= 8) {
      word = this.pool[Math.floor(Math.pow(this.rng(), 1.6) * this.pool.length)];
    } else {
      const len = minLen + Math.floor(this.rng() * (maxLen - minLen + 1));
      word = this.pseudoWord(len);
      if (useFocus && this.focusKey && !word.includes(this.focusKey)) {
        const pos = Math.floor(this.rng() * word.length);
        word = word.slice(0, pos) + this.focusKey + word.slice(pos + 1);
      }
    }

    if (allowsUppercase(this.opts.chapter) && this.rng() < 0.3) {
      word = word[0].toUpperCase() + word.slice(1);
    }
    if (allowsPunctuation(this.opts.chapter) && word.length > 1 && this.rng() < 0.25) {
      word += this.rng() < 0.5 ? "." : ",";
    }
    return word;
  }

  /** Bonusové slovo pro věž — delší než běžný text, jen z odemčených písmen. */
  bonusWord(): string {
    const longer = this.opts.words
      .filter(([w]) => w.length >= 4 && w.length <= 8 && [...w].every((ch) => this.letters.includes(ch)))
      .slice(0, 400);
    if (longer.length) return longer[Math.floor(this.rng() * longer.length)][0];
    return this.pseudoWord(4);
  }

  get focus(): string | null {
    return this.focusKey;
  }

  get poolSize(): number {
    return this.pool.length;
  }
}

let cache: Promise<WordList> | null = null;

export function loadWords(): Promise<WordList> {
  if (!cache) {
    cache = fetch("/data/words-cs.json")
      .then((r) => r.json())
      .then((j: { words: WordList }) => j.words);
  }
  return cache;
}
