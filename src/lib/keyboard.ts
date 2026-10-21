/**
 * Model české klávesnice, prstokladu a analytiky chybovosti podle normy ČSN 36 9050.
 *
 * Sjednocený modul pro diagram prstokladu ve hře (Issue #12) i heatmapu a doporučení
 * slabých kláves na profilu studenta (Issue #13).
 */

import { CHAPTERS, type Chapter } from "../game/content/curriculum";
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
  /** Unikátní klíč nebo primární znak */
  key: string;
  /** Popisek zobrazený na klávese */
  label: string;
  /** Sekundární popisek se Shiftem */
  shiftLabel?: string;
  /** Alternativní znak přiřazený klávese (alias pro shiftLabel pro zpětnou kompatibilitu) */
  altKey?: string;
  /** Znak při stisku Shiftu (alias pro shiftLabel pro zpětnou kompatibilitu) */
  shiftChar?: string;
  /** Přiřazený prst */
  finger: Finger;
  /** Číslo řady 0 až 4 */
  row: number;
  /** Relativní šířka klávesy (výchozí 1) */
  width?: number;
  /** Domovská řada (výchozí pozice: asdf jklů) */
  home?: boolean;
  /** Hmatový výstupek (F a J) */
  nub?: boolean;
  /** Speciální/funkční klávesa */
  special?: boolean;
}

export interface FingerStyle {
  id: Finger;
  hand: "left" | "right";
  label: string;
  shortLabel: string;
  colorName: string;
  badgeClass: string;
  keyBgClass: string;
  keyBorderClass: string;
  keyTextClass: string;
  activeBgClass: string;
  activeRingClass: string;
  accentHex: string;
}

export interface KeyTargetInfo {
  targetChar: string;
  keyDef: KeyDefinition;
  finger: Finger;
  fingerStyle: FingerStyle;
  needsShift: boolean;
  shiftKeyKey?: "ShiftLeft" | "ShiftRight";
  shiftFinger?: Finger;
  shiftFingerStyle?: FingerStyle;
  instruction: string;
}

export interface WeakKeyInfo {
  /** Klíč (např. 'a', 'ů', 'ř') */
  key: string;
  /** Zobrazovaný popisek (např. 'Ů', 'Ř', 'A', 'Mezerník') */
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

export const FINGER_DATA: Record<Finger, FingerStyle> = {
  left_pinky: {
    id: "left_pinky",
    hand: "left",
    label: "Levý malíček",
    shortLabel: "L. malíček",
    colorName: "Fialovo-růžová",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    keyBgClass: "bg-rose-950/20",
    keyBorderClass: "border-rose-700/40",
    keyTextClass: "text-rose-200",
    activeBgClass: "bg-rose-600 text-white font-bold ring-4 ring-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.85)]",
    activeRingClass: "ring-rose-400",
    accentHex: "#f43f5e",
  },
  left_ring: {
    id: "left_ring",
    hand: "left",
    label: "Levý prsteníček",
    shortLabel: "L. prsteníček",
    colorName: "Oranžová",
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    keyBgClass: "bg-orange-950/20",
    keyBorderClass: "border-orange-700/40",
    keyTextClass: "text-orange-200",
    activeBgClass: "bg-orange-600 text-white font-bold ring-4 ring-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.85)]",
    activeRingClass: "ring-orange-400",
    accentHex: "#f97316",
  },
  left_middle: {
    id: "left_middle",
    hand: "left",
    label: "Levý prostředníček",
    shortLabel: "L. prostředníček",
    colorName: "Jantarová",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    keyBgClass: "bg-amber-950/20",
    keyBorderClass: "border-amber-700/40",
    keyTextClass: "text-amber-200",
    activeBgClass: "bg-amber-500 text-black font-bold ring-4 ring-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.85)]",
    activeRingClass: "ring-amber-300",
    accentHex: "#f59e0b",
  },
  left_index: {
    id: "left_index",
    hand: "left",
    label: "Levý ukazováček",
    shortLabel: "L. ukazováček",
    colorName: "Zelená",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    keyBgClass: "bg-emerald-950/20",
    keyBorderClass: "border-emerald-700/40",
    keyTextClass: "text-emerald-200",
    activeBgClass: "bg-emerald-500 text-black font-bold ring-4 ring-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.85)]",
    activeRingClass: "ring-emerald-300",
    accentHex: "#10b981",
  },
  left_thumb: {
    id: "left_thumb",
    hand: "left",
    label: "Palec",
    shortLabel: "Palec",
    colorName: "Šedá",
    badgeClass: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    keyBgClass: "bg-slate-900/40",
    keyBorderClass: "border-slate-600/40",
    keyTextClass: "text-slate-200",
    activeBgClass: "bg-slate-200 text-black font-bold ring-4 ring-slate-100 shadow-[0_0_20px_rgba(203,213,225,0.85)]",
    activeRingClass: "ring-slate-200",
    accentHex: "#94a3b8",
  },
  right_thumb: {
    id: "right_thumb",
    hand: "right",
    label: "Palec",
    shortLabel: "Palec",
    colorName: "Šedá",
    badgeClass: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    keyBgClass: "bg-slate-900/40",
    keyBorderClass: "border-slate-600/40",
    keyTextClass: "text-slate-200",
    activeBgClass: "bg-slate-200 text-black font-bold ring-4 ring-slate-100 shadow-[0_0_20px_rgba(203,213,225,0.85)]",
    activeRingClass: "ring-slate-200",
    accentHex: "#94a3b8",
  },
  right_index: {
    id: "right_index",
    hand: "right",
    label: "Pravý ukazováček",
    shortLabel: "P. ukazováček",
    colorName: "Tyrkysová",
    badgeClass: "bg-teal-500/20 text-teal-300 border-teal-500/40",
    keyBgClass: "bg-teal-950/20",
    keyBorderClass: "border-teal-700/40",
    keyTextClass: "text-teal-200",
    activeBgClass: "bg-teal-500 text-black font-bold ring-4 ring-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.85)]",
    activeRingClass: "ring-teal-300",
    accentHex: "#14b8a6",
  },
  right_middle: {
    id: "right_middle",
    hand: "right",
    label: "Pravý prostředníček",
    shortLabel: "P. prostředníček",
    colorName: "Blankytná",
    badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    keyBgClass: "bg-sky-950/20",
    keyBorderClass: "border-sky-700/40",
    keyTextClass: "text-sky-200",
    activeBgClass: "bg-sky-500 text-black font-bold ring-4 ring-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.85)]",
    activeRingClass: "ring-sky-300",
    accentHex: "#0ea5e9",
  },
  right_ring: {
    id: "right_ring",
    hand: "right",
    label: "Pravý prsteníček",
    shortLabel: "P. prsteníček",
    colorName: "Modrá",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    keyBgClass: "bg-blue-950/20",
    keyBorderClass: "border-blue-700/40",
    keyTextClass: "text-blue-200",
    activeBgClass: "bg-blue-600 text-white font-bold ring-4 ring-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.85)]",
    activeRingClass: "ring-blue-400",
    accentHex: "#3b82f6",
  },
  right_pinky: {
    id: "right_pinky",
    hand: "right",
    label: "Pravý malíček",
    shortLabel: "P. malíček",
    colorName: "Fialová",
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    keyBgClass: "bg-purple-950/20",
    keyBorderClass: "border-purple-700/40",
    keyTextClass: "text-purple-200",
    activeBgClass: "bg-purple-600 text-white font-bold ring-4 ring-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.85)]",
    activeRingClass: "ring-purple-400",
    accentHex: "#a855f7",
  },
};

export const FINGER_NAMES: Record<Finger, string> = {
  left_pinky: "Levý malíček",
  left_ring: "Levý prsteníček",
  left_middle: "Levý prostředníček",
  left_index: "Levý ukazováček",
  left_thumb: "Palec",
  right_thumb: "Palec",
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

export function getFingerDisplayName(finger: Finger | null | undefined): string {
  if (!finger) return "Neznámý";
  return FINGER_NAMES[finger] ?? FINGER_DATA[finger]?.label ?? finger;
}

function createKey(def: {
  key: string;
  label: string;
  shiftLabel?: string;
  finger: Finger;
  row: number;
  width?: number;
  home?: boolean;
  nub?: boolean;
  special?: boolean;
}): KeyDefinition {
  return {
    ...def,
    altKey: def.shiftLabel,
    shiftChar: def.shiftLabel,
  };
}

function buildLayout(qwertz: boolean): KeyDefinition[][] {
  const row0: KeyDefinition[] = [
    createKey({ key: ";", label: ";", shiftLabel: "°", finger: "left_pinky", row: 0 }),
    createKey({ key: "+", label: "+", shiftLabel: "1", finger: "left_pinky", row: 0 }),
    createKey({ key: "ě", label: "ě", shiftLabel: "2", finger: "left_ring", row: 0 }),
    createKey({ key: "š", label: "š", shiftLabel: "3", finger: "left_middle", row: 0 }),
    createKey({ key: "č", label: "č", shiftLabel: "4", finger: "left_index", row: 0 }),
    createKey({ key: "ř", label: "ř", shiftLabel: "5", finger: "left_index", row: 0 }),
    createKey({ key: "ž", label: "ž", shiftLabel: "6", finger: "right_index", row: 0 }),
    createKey({ key: "ý", label: "ý", shiftLabel: "7", finger: "right_index", row: 0 }),
    createKey({ key: "á", label: "á", shiftLabel: "8", finger: "right_middle", row: 0 }),
    createKey({ key: "í", label: "í", shiftLabel: "9", finger: "right_ring", row: 0 }),
    createKey({ key: "é", label: "é", shiftLabel: "0", finger: "right_pinky", row: 0 }),
    createKey({ key: "=", label: "=", shiftLabel: "%", finger: "right_pinky", row: 0 }),
    createKey({ key: "´", label: "´", shiftLabel: "ˇ", finger: "right_pinky", row: 0 }),
    createKey({ key: "Backspace", label: "⌫", finger: "right_pinky", row: 0, width: 1.8, special: true }),
  ];

  const row1KeyZorY: KeyDefinition = qwertz
    ? createKey({ key: "z", label: "Z", finger: "right_index", row: 1 })
    : createKey({ key: "y", label: "Y", finger: "right_index", row: 1 });

  const row1: KeyDefinition[] = [
    createKey({ key: "Tab", label: "Tab", finger: "left_pinky", row: 1, width: 1.4, special: true }),
    createKey({ key: "q", label: "Q", finger: "left_pinky", row: 1 }),
    createKey({ key: "w", label: "W", finger: "left_ring", row: 1 }),
    createKey({ key: "e", label: "E", finger: "left_middle", row: 1 }),
    createKey({ key: "r", label: "R", finger: "left_index", row: 1 }),
    createKey({ key: "t", label: "T", finger: "left_index", row: 1 }),
    row1KeyZorY,
    createKey({ key: "u", label: "U", finger: "right_index", row: 1 }),
    createKey({ key: "i", label: "I", finger: "right_middle", row: 1 }),
    createKey({ key: "o", label: "O", finger: "right_ring", row: 1 }),
    createKey({ key: "p", label: "P", finger: "right_pinky", row: 1 }),
    createKey({ key: "ú", label: "Ú", shiftLabel: "/", finger: "right_pinky", row: 1 }),
    createKey({ key: ")", label: ")", shiftLabel: "(", finger: "right_pinky", row: 1 }),
    createKey({ key: "\\", label: "\\", shiftLabel: "|", finger: "right_pinky", row: 1, width: 1.3, special: true }),
  ];

  const row2: KeyDefinition[] = [
    createKey({ key: "CapsLock", label: "Caps", finger: "left_pinky", row: 2, width: 1.7, special: true }),
    createKey({ key: "a", label: "A", finger: "left_pinky", row: 2, home: true }),
    createKey({ key: "s", label: "S", finger: "left_ring", row: 2, home: true }),
    createKey({ key: "d", label: "D", finger: "left_middle", row: 2, home: true }),
    createKey({ key: "f", label: "F", finger: "left_index", row: 2, home: true, nub: true }),
    createKey({ key: "g", label: "G", finger: "left_index", row: 2 }),
    createKey({ key: "h", label: "H", finger: "right_index", row: 2 }),
    createKey({ key: "j", label: "J", finger: "right_index", row: 2, home: true, nub: true }),
    createKey({ key: "k", label: "K", finger: "right_middle", row: 2, home: true }),
    createKey({ key: "l", label: "L", finger: "right_ring", row: 2, home: true }),
    createKey({ key: "ů", label: "Ů", shiftLabel: "\"", finger: "right_pinky", row: 2, home: true }),
    createKey({ key: "§", label: "§", shiftLabel: "!", finger: "right_pinky", row: 2 }),
    createKey({ key: "Enter", label: "Enter", finger: "right_pinky", row: 2, width: 2.1, special: true }),
  ];

  const row3KeyYorZ: KeyDefinition = qwertz
    ? createKey({ key: "y", label: "Y", finger: "left_pinky", row: 3 })
    : createKey({ key: "z", label: "Z", finger: "left_pinky", row: 3 });

  const row3: KeyDefinition[] = [
    createKey({ key: "ShiftLeft", label: "Shift", finger: "left_pinky", row: 3, width: 2.2, special: true }),
    row3KeyYorZ,
    createKey({ key: "x", label: "X", finger: "left_ring", row: 3 }),
    createKey({ key: "c", label: "C", finger: "left_middle", row: 3 }),
    createKey({ key: "v", label: "V", finger: "left_index", row: 3 }),
    createKey({ key: "b", label: "B", finger: "left_index", row: 3 }),
    createKey({ key: "n", label: "N", finger: "right_index", row: 3 }),
    createKey({ key: "m", label: "M", finger: "right_index", row: 3 }),
    createKey({ key: ",", label: ",", shiftLabel: "?", finger: "right_middle", row: 3 }),
    createKey({ key: ".", label: ".", shiftLabel: ":", finger: "right_ring", row: 3 }),
    createKey({ key: "-", label: "-", shiftLabel: "_", finger: "right_pinky", row: 3 }),
    createKey({ key: "ShiftRight", label: "Shift", finger: "right_pinky", row: 3, width: 2.6, special: true }),
  ];

  const row4: KeyDefinition[] = [
    createKey({ key: " ", label: "Mezerník", finger: "left_thumb", row: 4, width: 7.2 }),
  ];

  return [row0, row1, row2, row3, row4];
}

export const CZECH_QWERTZ_LAYOUT: KeyDefinition[][] = buildLayout(true);
export const CZECH_QWERTY_LAYOUT: KeyDefinition[][] = buildLayout(false);

export function getLayout(layout: "qwertz" | "qwerty" = "qwertz"): KeyDefinition[][] {
  return layout === "qwerty" ? CZECH_QWERTY_LAYOUT : CZECH_QWERTZ_LAYOUT;
}

/** Mapování shifted čísel/symbolů na českou klávesu a nutnost Shiftu */
const CZECH_CHAR_TO_KEY_MAP: Record<string, { baseKey: string; shift: boolean }> = {
  // čísla se píší se Shiftem
  "1": { baseKey: "+", shift: true },
  "2": { baseKey: "ě", shift: true },
  "3": { baseKey: "š", shift: true },
  "4": { baseKey: "č", shift: true },
  "5": { baseKey: "ř", shift: true },
  "6": { baseKey: "ž", shift: true },
  "7": { baseKey: "ý", shift: true },
  "8": { baseKey: "á", shift: true },
  "9": { baseKey: "í", shift: true },
  "0": { baseKey: "é", shift: true },
  "%": { baseKey: "=", shift: true },
  "ˇ": { baseKey: "´", shift: true },
  "/": { baseKey: "ú", shift: true },
  "(": { baseKey: ")", shift: true },
  "\"": { baseKey: "ů", shift: true },
  "!": { baseKey: "§", shift: true },
  "?": { baseKey: ",", shift: true },
  ":": { baseKey: ".", shift: true },
  "_": { baseKey: "-", shift: true },
  "°": { baseKey: ";", shift: true },
  // základní české diakritické klávesy v číslicové řadě
  "ě": { baseKey: "ě", shift: false },
  "š": { baseKey: "š", shift: false },
  "č": { baseKey: "č", shift: false },
  "ř": { baseKey: "ř", shift: false },
  "ž": { baseKey: "ž", shift: false },
  "ý": { baseKey: "ý", shift: false },
  "á": { baseKey: "á", shift: false },
  "í": { baseKey: "í", shift: false },
  "é": { baseKey: "é", shift: false },
  "ú": { baseKey: "ú", shift: false },
  "ů": { baseKey: "ů", shift: false },
  // velká diakritická písmena
  "Ě": { baseKey: "ě", shift: true },
  "Š": { baseKey: "š", shift: true },
  "Č": { baseKey: "č", shift: true },
  "Ř": { baseKey: "ř", shift: true },
  "Ž": { baseKey: "ž", shift: true },
  "Ý": { baseKey: "ý", shift: true },
  "Á": { baseKey: "á", shift: true },
  "Í": { baseKey: "í", shift: true },
  "É": { baseKey: "é", shift: true },
  "Ú": { baseKey: "ú", shift: true },
  "Ů": { baseKey: "ů", shift: true },
  // méně častá česká písmena
  "ď": { baseKey: "d", shift: false },
  "Ď": { baseKey: "d", shift: true },
  "ť": { baseKey: "t", shift: false },
  "Ť": { baseKey: "t", shift: true },
  "ň": { baseKey: "n", shift: false },
  "Ň": { baseKey: "n", shift: true },
  "ó": { baseKey: "o", shift: false },
  "Ó": { baseKey: "o", shift: true },
};

/**
 * Najde definici klávesy a informaci o Shiftu pro daný znak.
 */
export function findKeyForChar(
  char: string,
  layoutName: "qwertz" | "qwerty" = "qwertz",
): { keyDef: KeyDefinition; needsShift: boolean } | null {
  if (!char) return null;
  const layout = getLayout(layoutName);

  // Mezera
  if (char === " ") {
    const spaceKey = layout[4]?.[0];
    return spaceKey ? { keyDef: spaceKey, needsShift: false } : null;
  }

  // Přímé namapování nebo speciální znak
  const mapped = CZECH_CHAR_TO_KEY_MAP[char];
  const searchKey = mapped ? mapped.baseKey : char.toLowerCase();
  const needsShift = mapped ? mapped.shift : char !== char.toLowerCase() && char.toUpperCase() === char;

  for (const row of layout) {
    for (const kd of row) {
      if (kd.key.toLowerCase() === searchKey.toLowerCase()) {
        return { keyDef: kd, needsShift };
      }
    }
  }

  return null;
}

/**
 * Najde definici klávesy podle znaku nebo alternativního znaku.
 */
export function findKeyDefinition(
  char: string,
  layout: "qwertz" | "qwerty" = "qwertz"
): KeyDefinition | null {
  if (!char) return null;
  const found = findKeyForChar(char, layout);
  if (found) return found.keyDef;

  const norm = char.toLowerCase();
  const rows = getLayout(layout);
  for (const row of rows) {
    for (const kd of row) {
      if (
        kd.key.toLowerCase() === norm ||
        kd.altKey?.toLowerCase() === norm ||
        kd.shiftChar?.toLowerCase() === norm ||
        kd.shiftLabel?.toLowerCase() === norm
      ) {
        return kd;
      }
    }
  }
  return null;
}

/**
 * Vrátí prst pro daný znak.
 */
export function getKeyFinger(char: string, layout: "qwertz" | "qwerty" = "qwertz"): Finger | null {
  const found = findKeyForChar(char, layout);
  return found ? found.keyDef.finger : null;
}

/**
 * Vrátí kompletní informace o cílové klávese, prstu a instrukci pro psaní.
 */
export function getKeyTargetInfo(char: string, layout: "qwertz" | "qwerty" = "qwertz"): KeyTargetInfo | null {
  const found = findKeyForChar(char, layout);
  if (!found) return null;

  const { keyDef, needsShift } = found;
  const fingerStyle = FINGER_DATA[keyDef.finger];

  if (char === " ") {
    return {
      targetChar: " ",
      keyDef,
      finger: keyDef.finger,
      fingerStyle,
      needsShift: false,
      instruction: "Stiskni Mezerník ➔ Palec",
    };
  }

  if (needsShift) {
    // Pravidlo opačné ruky pro Shift:
    const isLeftHand = fingerStyle.hand === "left";
    const shiftKeyKey: "ShiftLeft" | "ShiftRight" = isLeftHand ? "ShiftRight" : "ShiftLeft";
    const shiftFinger: Finger = isLeftHand ? "right_pinky" : "left_pinky";
    const shiftFingerStyle = FINGER_DATA[shiftFinger];

    const displayChar = char.toUpperCase();
    const instruction = `Shift (${shiftFingerStyle.shortLabel.toLowerCase()}) + ${displayChar} (${fingerStyle.shortLabel.toLowerCase()})`;

    return {
      targetChar: char,
      keyDef,
      finger: keyDef.finger,
      fingerStyle,
      needsShift: true,
      shiftKeyKey,
      shiftFinger,
      shiftFingerStyle,
      instruction,
    };
  }

  const displayChar = keyDef.label;
  return {
    targetChar: char,
    keyDef,
    finger: keyDef.finger,
    fingerStyle,
    needsShift: false,
    instruction: `Stiskni „${displayChar}“ ➔ ${fingerStyle.label}`,
  };
}

/**
 * Najde kapitolu v osnově, kde se daná klávesa poprvé představila.
 */
export function findChapterForKey(char: string): Chapter {
  if (!char) return CHAPTERS[0];
  const norm = char.toLowerCase();
  const introduced = CHAPTERS.find((c) => c.newKeys.map((k) => k.toLowerCase()).includes(norm));
  if (introduced) return introduced;

  const available = CHAPTERS.find((c) => c.keys.map((k) => k.toLowerCase()).includes(norm));
  if (available) return available;

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

  // Seřadíme: primárně podle chybovosti, sekundárně podle počtu chyb, terciárně podle celkového počtu
  list.sort((a, b) => {
    if (b.errorRate !== a.errorRate) return b.errorRate - a.errorRate;
    if (b.misses !== a.misses) return b.misses - a.misses;
    return b.total - a.total;
  });

  return list.slice(0, limit);
}
