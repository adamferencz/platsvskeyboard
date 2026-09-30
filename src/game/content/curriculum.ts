/**
 * Osnova kurzu — pořadí kláves převzaté z Psaní hravě (22 úrovní, "brány" = testy bez nových kláves).
 * Kapitola má ROUNDS_PER_CHAPTER kol; poslední kolo je boss.
 *
 * 100 % kurzu = všechna kola všech kapitol dokončená aspoň na 1 hvězdičku
 * (všechna písmena včetně háčků a čárek; interpunkce a čísla do kurzu nepatří — OTAZKY B6).
 */

export const ROUNDS_PER_CHAPTER = 6;

export interface Chapter {
  /** 1-based číslo kapitoly */
  id: number;
  /** nové klávesy v této kapitole (prázdné = brána) */
  newKeys: string[];
  /** všechny klávesy dostupné v této kapitole (kumulativně) */
  keys: string[];
  name: string;
  gate: boolean;
  /** oblast na mapě (jen pro vzhled) */
  region: string;
}

const RAW: { keys: string; name?: string; region: string }[] = [
  { keys: "dfjk", region: "Hravý háj" },
  { keys: "aslů", region: "Hravý háj" },
  { keys: "", name: "Brána: domácí řada", region: "Hravý háj" },
  { keys: "ei", region: "Náhorní pláň" },
  { keys: "ru", region: "Náhorní pláň" },
  { keys: "to", region: "Náhorní pláň" },
  { keys: "", name: "Brána: horní řada I", region: "Náhorní pláň" },
  { keys: "pcv", region: "Psavé údolí" },
  { keys: "mn", region: "Psavé údolí" },
  { keys: "yz", region: "Psavé údolí" },
  { keys: "", name: "Brána: dolní řada", region: "Psavé údolí" },
  { keys: "ghb", region: "Země pána Prstů" },
  { keys: ".,", name: "Tečka a čárka", region: "Země pána Prstů" },
  { keys: "", name: "Brána: celá abeceda", region: "Země pána Prstů" },
  { keys: "qwx", region: "Země pána Prstů" },
  { keys: "SHIFT", name: "Velká písmena", region: "Země pána Prstů" },
  { keys: "", name: "Brána: velká písmena", region: "Země pána Prstů" },
  { keys: "čí", region: "Bažina diakritiky" },
  { keys: "řá", region: "Bažina diakritiky" },
  { keys: "šéú", region: "Bažina diakritiky" },
  { keys: "žýě", region: "Bažina diakritiky" },
  { keys: "", name: "Brána: diakritika — finále", region: "Bažina diakritiky" },
];

export const CHAPTERS: Chapter[] = (() => {
  const acc: string[] = [];
  return RAW.map((r, i) => {
    const newKeys = r.keys === "SHIFT" ? ["SHIFT"] : r.keys.split("");
    for (const k of newKeys) if (!acc.includes(k)) acc.push(k);
    return {
      id: i + 1,
      newKeys,
      keys: [...acc],
      name: r.name ?? `Klávesy ${newKeys.join(" ")}`,
      gate: r.keys === "",
      region: r.region,
    };
  });
})();

export const TOTAL_ROUNDS = CHAPTERS.length * ROUNDS_PER_CHAPTER;

export function chapterById(id: number): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

/** Písmena (bez SHIFT a interpunkce), ze kterých se skládají slova v dané kapitole. */
export function lettersOf(chapter: Chapter): string[] {
  return chapter.keys.filter((k) => k !== "SHIFT" && /^[a-záčďéěíňóřšťúůýž]$/i.test(k));
}

export function allowsUppercase(chapter: Chapter): boolean {
  return chapter.keys.includes("SHIFT");
}

export function allowsPunctuation(chapter: Chapter): boolean {
  return chapter.keys.includes(".") || chapter.keys.includes(",");
}

/** Id levelu ve tvaru "3-2" (kapitola 3, kolo 2). */
export function levelId(chapter: number, round: number): string {
  return `${chapter}-${round}`;
}

export function parseLevelId(id: string): { chapter: number; round: number } | null {
  const m = /^(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  const chapter = Number(m[1]);
  const round = Number(m[2]);
  if (!chapterById(chapter) || round < 1 || round > ROUNDS_PER_CHAPTER) return null;
  return { chapter, round };
}

/** % kurzu = dokončená kola / všechna kola. */
export function completionPercent(completedRounds: number): number {
  return Math.min(100, Math.round((completedRounds / TOTAL_ROUNDS) * 1000) / 10);
}
