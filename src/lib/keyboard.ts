/**
 * Definice klávesnice, prstokladu a rozložení (QWERTZ a QWERTY)
 * pro výukové nástroje a profilovou analytiku.
 */

import { CHAPTERS, Chapter } from "../game/content/curriculum";
import type { KeyStat } from "../game/content/words";

export type Finger =
  | "left_pinky"
  | "left_ring"
  | "left_middle"
  | "left_index"
  | "left_thumb"
  | "right_thumb"
  | "right_index"
  | "right_middle"
  | "right_ring"
  | "right_pinky";

export interface KeyDefinition {
  /** Identifikátor klávesy (malé písmeno nebo speciální kód, např. 'a', 'ě', 'backspace') */
  key: string;
  /** Zobrazovaný popisek na klávese (např. 'A', '2 ě', '⌫') */
  label: string;
  /** Doporučený prst podle ČSN / mezinárodní normy */
  finger: Finger;
  /** Číslo řady: 0 = čísla/diakritika, 1 = horní, 2 = domovská, 3 = dolní, 4 = mezerník */
  row: number;
  /** Relativní šířka (1.0 = standardní čtvercová klávesa) */
  width?: number;
  /** Domovská klávesa s hmatovým výstupkem (F a J) */
  home?: boolean;
  /** Alternativní znak přiřazený klávese (např. číslice na české diakritické klávese) */
  altKey?: string;
  /** Znak při stisku Shiftu */
  shiftChar?: string;
}

export const FINGER_NAMES: Record<Finger, string> = {
  left_pinky: "Levý malíček",
  left_ring: "Levý prsteníček",
  left_middle: "Levý prostředníček",
  left_index: "Levý ukazováček",
  left_thumb: "Levý palec",
  right_thumb: "Pravý palec",
  right_index: "Pravý ukazováček",
  right_middle: "Pravý prostředníček",
  right_ring: "Pravý prsteníček",
  right_pinky: "Pravý malíček",
};

export const FINGER_SHORT_NAMES: Record<Finger, string> = {
  left_pinky: "L. malíček",
  left_ring: "L. prsteníček",
  left_middle: "L. prostředníček",
  left_index: "L. ukazováček",
  left_thumb: "Palec",
  right_thumb: "Palec",
  right_index: "P. ukazováček",
  right_middle: "P. prostředníček",
  right_ring: "P. prsteníček",
  right_pinky: "P. malíček",
};

/**
 * Standardní česká řada čísel a diakritiky (sdílená pro QWERTZ i QWERTY)
 */
const CZECH_NUMBER_ROW: KeyDefinition[] = [
  { key: ";", label: "; °", finger: "left_pinky", row: 0, altKey: "°", shiftChar: "°" },
  { key: "+", label: "1 +", finger: "left_pinky", row: 0, altKey: "1", shiftChar: "1" },
  { key: "ě", label: "2 ě", finger: "left_ring", row: 0, altKey: "2", shiftChar: "2" },
  { key: "š", label: "3 š", finger: "left_middle", row: 0, altKey: "3", shiftChar: "3" },
  { key: "č", label: "4 č", finger: "left_index", row: 0, altKey: "4", shiftChar: "4" },
  { key: "ř", label: "5 ř", finger: "left_index", row: 0, altKey: "5", shiftChar: "5" },
  { key: "ž", label: "6 ž", finger: "right_index", row: 0, altKey: "6", shiftChar: "6" },
  { key: "ý", label: "7 ý", finger: "right_index", row: 0, altKey: "7", shiftChar: "7" },
  { key: "á", label: "8 á", finger: "right_middle", row: 0, altKey: "8", shiftChar: "8" },
  { key: "í", label: "9 í", finger: "right_ring", row: 0, altKey: "9", shiftChar: "9" },
  { key: "é", label: "0 é", finger: "right_pinky", row: 0, altKey: "0", shiftChar: "0" },
  { key: "=", label: "= %", finger: "right_pinky", row: 0, altKey: "%", shiftChar: "%" },
  { key: "´", label: "´ ˇ", finger: "right_pinky", row: 0, altKey: "ˇ", shiftChar: "ˇ" },
  { key: "backspace", label: "⌫", finger: "right_pinky", row: 0, width: 1.8 },
];

/**
 * Domovská řada kláves (A–L, Ů, §)
 */
const CZECH_HOME_ROW: KeyDefinition[] = [
  { key: "caps", label: "Caps", finger: "left_pinky", row: 2, width: 1.7 },
  { key: "a", label: "A", finger: "left_pinky", row: 2 },
  { key: "s", label: "S", finger: "left_ring", row: 2 },
  { key: "d", label: "D", finger: "left_middle", row: 2 },
  { key: "f", label: "F", finger: "left_index", row: 2, home: true },
  { key: "g", label: "G", finger: "left_index", row: 2 },
  { key: "h", label: "H", finger: "right_index", row: 2 },
  { key: "j", label: "J", finger: "right_index", row: 2, home: true },
  { key: "k", label: "K", finger: "right_middle", row: 2 },
  { key: "l", label: "L", finger: "right_ring", row: 2 },
  { key: "ů", label: "Ů \"", finger: "right_pinky", row: 2, altKey: "\"", shiftChar: "\"" },
  { key: "§", label: "§ !", finger: "right_pinky", row: 2, altKey: "!", shiftChar: "!" },
  { key: "enter", label: "Enter", finger: "right_pinky", row: 2, width: 2.1 },
];

/**
 * Spodní řada s mezerníkem
 */
const CZECH_SPACE_ROW: KeyDefinition[] = [
  { key: "ctrl_l", label: "Ctrl", finger: "left_pinky", row: 4, width: 1.4 },
  { key: "alt_l", label: "Alt", finger: "left_thumb", row: 4, width: 1.3 },
  { key: " ", label: "Mezerník", finger: "right_thumb", row: 4, width: 6.8 },
  { key: "alt_r", label: "AltGr", finger: "right_thumb", row: 4, width: 1.3 },
  { key: "ctrl_r", label: "Ctrl", finger: "right_pinky", row: 4, width: 1.4 },
];

/**
 * Česká QWERTZ klávesnice (výchozí české rozložení)
 */
export const CZECH_QWERTZ_LAYOUT: KeyDefinition[][] = [
  CZECH_NUMBER_ROW,
  [
    { key: "tab", label: "Tab", finger: "left_pinky", row: 1, width: 1.4 },
    { key: "q", label: "Q", finger: "left_pinky", row: 1 },
    { key: "w", label: "W", finger: "left_ring", row: 1 },
    { key: "e", label: "E", finger: "left_middle", row: 1 },
    { key: "r", label: "R", finger: "left_index", row: 1 },
    { key: "t", label: "T", finger: "left_index", row: 1 },
    { key: "z", label: "Z", finger: "right_index", row: 1 },
    { key: "u", label: "U", finger: "right_index", row: 1 },
    { key: "i", label: "I", finger: "right_middle", row: 1 },
    { key: "o", label: "O", finger: "right_ring", row: 1 },
    { key: "p", label: "P", finger: "right_pinky", row: 1 },
    { key: "ú", label: "Ú /", finger: "right_pinky", row: 1, altKey: "/", shiftChar: "/" },
    { key: ")", label: ") (", finger: "right_pinky", row: 1, altKey: "(", shiftChar: "(" },
  ],
  CZECH_HOME_ROW,
  [
    { key: "shift_l", label: "Shift", finger: "left_pinky", row: 3, width: 2.1 },
    { key: "y", label: "Y", finger: "left_pinky", row: 3 },
    { key: "x", label: "X", finger: "left_ring", row: 3 },
    { key: "c", label: "C", finger: "left_middle", row: 3 },
    { key: "v", label: "V", finger: "left_index", row: 3 },
    { key: "b", label: "B", finger: "left_index", row: 3 },
    { key: "n", label: "N", finger: "right_index", row: 3 },
    { key: "m", label: "M", finger: "right_index", row: 3 },
    { key: ",", label: ", ?", finger: "right_middle", row: 3, altKey: "?", shiftChar: "?" },
    { key: ".", label: ". :", finger: "right_ring", row: 3, altKey: ":", shiftChar: ":" },
    { key: "-", label: "- _", finger: "right_pinky", row: 3, altKey: "_", shiftChar: "_" },
    { key: "shift_r", label: "Shift", finger: "right_pinky", row: 3, width: 2.3 },
  ],
  CZECH_SPACE_ROW,
];

/**
 * Česká QWERTY klávesnice (prohozené Z a Y)
 */
export const CZECH_QWERTY_LAYOUT: KeyDefinition[][] = [
  CZECH_NUMBER_ROW,
  [
    { key: "tab", label: "Tab", finger: "left_pinky", row: 1, width: 1.4 },
    { key: "q", label: "Q", finger: "left_pinky", row: 1 },
    { key: "w", label: "W", finger: "left_ring", row: 1 },
    { key: "e", label: "E", finger: "left_middle", row: 1 },
    { key: "r", label: "R", finger: "left_index", row: 1 },
    { key: "t", label: "T", finger: "left_index", row: 1 },
    { key: "y", label: "Y", finger: "right_index", row: 1 },
    { key: "u", label: "U", finger: "right_index", row: 1 },
    { key: "i", label: "I", finger: "right_middle", row: 1 },
    { key: "o", label: "O", finger: "right_ring", row: 1 },
    { key: "p", label: "P", finger: "right_pinky", row: 1 },
    { key: "ú", label: "Ú /", finger: "right_pinky", row: 1, altKey: "/", shiftChar: "/" },
    { key: ")", label: ") (", finger: "right_pinky", row: 1, altKey: "(", shiftChar: "(" },
  ],
  CZECH_HOME_ROW,
  [
    { key: "shift_l", label: "Shift", finger: "left_pinky", row: 3, width: 2.1 },
    { key: "z", label: "Z", finger: "left_pinky", row: 3 },
    { key: "x", label: "X", finger: "left_ring", row: 3 },
    { key: "c", label: "C", finger: "left_middle", row: 3 },
    { key: "v", label: "V", finger: "left_index", row: 3 },
    { key: "b", label: "B", finger: "left_index", row: 3 },
    { key: "n", label: "N", finger: "right_index", row: 3 },
    { key: "m", label: "M", finger: "right_index", row: 3 },
    { key: ",", label: ", ?", finger: "right_middle", row: 3, altKey: "?", shiftChar: "?" },
    { key: ".", label: ". :", finger: "right_ring", row: 3, altKey: ":", shiftChar: ":" },
    { key: "-", label: "- _", finger: "right_pinky", row: 3, altKey: "_", shiftChar: "_" },
    { key: "shift_r", label: "Shift", finger: "right_pinky", row: 3, width: 2.3 },
  ],
  CZECH_SPACE_ROW,
];

/**
 * Vrátí matici klávesnice pro dané rozložení.
 */
export function getLayout(layout: "qwertz" | "qwerty"): KeyDefinition[][] {
  return layout === "qwerty" ? CZECH_QWERTY_LAYOUT : CZECH_QWERTZ_LAYOUT;
}

/**
 * Normalizace znaku pro vyhledávání (malé písmeno, diakritika apod.)
 */
function normalizeChar(char: string): string {
  if (!char) return "";
  return char.toLowerCase();
}

/**
 * Najde definici klávesy v daném rozložení podle znaku.
 */
export function findKeyDefinition(char: string, layout: "qwertz" | "qwerty" = "qwertz"): KeyDefinition | null {
  const norm = normalizeChar(char);
  const rows = getLayout(layout);

  for (const row of rows) {
    for (const keyDef of row) {
      if (
        keyDef.key.toLowerCase() === norm ||
        keyDef.altKey?.toLowerCase() === norm ||
        keyDef.shiftChar?.toLowerCase() === norm
      ) {
        return keyDef;
      }
    }
  }

  // Fallback pro měkčení/diakritiku bez přímé fyzické klávesy
  if (norm === "ď") return findKeyDefinition("d", layout);
  if (norm === "ť") return findKeyDefinition("t", layout);
  if (norm === "ň") return findKeyDefinition("n", layout);
  if (norm === "ó") return findKeyDefinition("o", layout);

  return null;
}

/**
 * Vrátí doporučený prst pro zadaný znak s ohledem na rozložení klávesnice.
 */
export function getKeyFinger(char: string, layout: "qwertz" | "qwerty"): Finger | null {
  const def = findKeyDefinition(char, layout);
  return def ? def.finger : null;
}

/**
 * Vrátí český název prstu pro zadaný prstový kód.
 */
export function getFingerDisplayName(finger: Finger | null | undefined): string {
  if (!finger) return "Neznámý";
  return FINGER_NAMES[finger] ?? finger;
}

export interface WeakKeyInfo {
  /** Klíč (např. 'a', 'ů', 'ř') */
  key: string;
  /** Zobrazovaný popisek (např. 'Ů', 'Ř', 'A') */
  displayKey: string;
  /** Úspěšné úhozy */
  hits: number;
  /** Chyby */
  misses: number;
  /** Celkem pokusů */
  total: number;
  /** Chybovost v intervalu 0 až 1 (např. 0.25) */
  errorRate: number;
  /** Chybovost v procentech (např. 25) */
  errorPercent: number;
  /** Úspěšnost v procentech (např. 75) */
  accuracyPercent: number;
  /** Doporučený prst */
  finger: Finger | null;
  /** Český název doporučeného prstu */
  fingerName: string;
  /** Kapitola, ve které byla klávesa představena */
  chapterId: number;
  /** Název kapitoly */
  chapterName: string;
}

/**
 * Najde kapitolu v osnově, kde se daná klávesa poprvé představila.
 */
export function findChapterForKey(char: string): Chapter {
  const norm = normalizeChar(char);
  // Nejprve hledáme v nových klávesách
  const introduced = CHAPTERS.find((c) => c.newKeys.map((k) => k.toLowerCase()).includes(norm));
  if (introduced) return introduced;

  // Dále v kumulativní sadě
  const available = CHAPTERS.find((c) => c.keys.map((k) => k.toLowerCase()).includes(norm));
  if (available) return available;

  // Fallback na kapitolu 1
  return CHAPTERS[0];
}

/**
 * Analyzuje statistiky úhozů (keyStats) a vrátí seznam nejslabších kláves
 * (klávesy s minimálně minAttempts pokusy, seřazené sestupně podle chybovosti).
 */
export function getWeakKeys(
  keyStats: Record<string, KeyStat> | undefined | null,
  layout: "qwertz" | "qwerty" = "qwertz",
  limit = 5,
  minAttempts = 3
): WeakKeyInfo[] {
  if (!keyStats) return [];

  const list: WeakKeyInfo[] = [];

  for (const [k, stat] of Object.entries(keyStats)) {
    // Ignorujeme interní kódy nebo prázdné klávesy
    if (!k || k.length > 2) continue;
    const hits = stat.hits ?? 0;
    const misses = stat.misses ?? 0;
    const total = hits + misses;

    if (total < minAttempts || misses === 0) continue;

    const errorRate = misses / total;
    const errorPercent = Math.round(errorRate * 100);
    const accuracyPercent = Math.max(0, 100 - errorPercent);
    const finger = getKeyFinger(k, layout);
    const fingerName = getFingerDisplayName(finger);
    const chapter = findChapterForKey(k);
    const keyDef = findKeyDefinition(k, layout);

    const displayKey =
      k === " "
        ? "Mezerník"
        : keyDef?.label.split(" ")[0]?.toUpperCase() || k.toUpperCase();

    list.push({
      key: k,
      displayKey,
      hits,
      misses,
      total,
      errorRate,
      errorPercent,
      accuracyPercent,
      finger,
      fingerName,
      chapterId: chapter.id,
      chapterName: chapter.name,
    });
  }

  // Seřadíme: primárně podle chybovosti, sekundárně podle absolutního počtu chyb
  list.sort((a, b) => {
    if (b.errorRate !== a.errorRate) return b.errorRate - a.errorRate;
    if (b.misses !== a.misses) return b.misses - a.misses;
    return b.total - a.total;
  });

  return list.slice(0, limit);
}
