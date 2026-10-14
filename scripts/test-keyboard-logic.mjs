/**
 * Plnohodnotný integrační unit test pro logiku klávesnice, prstokladu,
 * doporučení slabých kláves a heatmapy (Issue #13).
 *
 * Spouští se: node scripts/test-keyboard-logic.mjs
 * nebo přes npm script: npm run test:keyboard-logic
 */

import assert from "node:assert/strict";
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";

// Inicializace jiti pro přímý import TypeScript modulů bez předchozí kompilace
const jiti = createJiti(fileURLToPath(import.meta.url));

// Skutečný import z src/lib/keyboard.ts — ŽÁDNÉ MOCKY ANI FASÁDY
const keyboard = jiti("../src/lib/keyboard.ts");

const {
  getWeakKeys,
  findChapterForKey,
  findKeyDefinition,
  getKeyFinger,
  getFingerDisplayName,
  getLayout,
  CZECH_QWERTZ_LAYOUT,
  CZECH_QWERTY_LAYOUT,
  FINGER_NAMES,
  FINGER_SHORT_NAMES,
} = keyboard;

console.log("=== Běh skutečných unit testů pro Issue #13 (Heatmapa a slabé klávesy) ===");

// ---------------------------------------------------------------------------
// 1. Ověření existence a typů všech exportovaných rozhraní
// ---------------------------------------------------------------------------
assert.equal(typeof getWeakKeys, "function", "getWeakKeys musí být exportovaná funkce");
assert.equal(typeof findChapterForKey, "function", "findChapterForKey musí být exportovaná funkce");
assert.equal(typeof findKeyDefinition, "function", "findKeyDefinition musí být exportovaná funkce");
assert.equal(typeof getKeyFinger, "function", "getKeyFinger musí být exportovaná funkce");
assert.equal(typeof getFingerDisplayName, "function", "getFingerDisplayName musí být exportovaná funkce");
assert.equal(typeof getLayout, "function", "getLayout musí být exportovaná funkce");
assert.ok(Array.isArray(CZECH_QWERTZ_LAYOUT), "CZECH_QWERTZ_LAYOUT musí být matice");
assert.ok(Array.isArray(CZECH_QWERTY_LAYOUT), "CZECH_QWERTY_LAYOUT musí být matice");
assert.equal(typeof FINGER_NAMES, "object", "FINGER_NAMES musí být objekt");
console.log("✓ Všechny funkce a datové struktury jsou správně exportovány.");

// ---------------------------------------------------------------------------
// 2. Test logiky getWeakKeys — výpočet, filtrování, řazení a obohacení
// ---------------------------------------------------------------------------
const testStats = {
  a: { hits: 100, misses: 2 }, // celkem 102, chybovost 1.96 %
  u: { hits: 10, misses: 5 },  // celkem 15, chybovost 33.33 % (5 chyb)
  k: { hits: 20, misses: 10 }, // celkem 30, chybovost 33.33 % (10 chyb) -> při shodě má přednost k
  "ů": { hits: 2, misses: 8 }, // celkem 10, chybovost 80.00 % -> nejslabší
  f: { hits: 50, misses: 0 },  // 0 chyb -> NESMÍ být zařazena do slabých kláves
  z: { hits: 1, misses: 1 },   // celkem 2 pokusy < minAttempts (3) -> NESMÍ být zařazena
  " ": { hits: 5, misses: 5 }, // celkem 10, chybovost 50.00 % -> mezerník
};

const weakKeys = getWeakKeys(testStats, "qwertz", 5, 3);

// Ověření správného počtu vrácených kláves
assert.equal(weakKeys.length, 5, "Musí vrátit přesně 5 kláves (f má 0 chyb, z má < 3 pokusy)");

// 1. místo: 'ů' (80 % chyb)
assert.equal(weakKeys[0].key, "ů");
assert.equal(weakKeys[0].displayKey, "Ů");
assert.equal(weakKeys[0].errorPercent, 80);
assert.equal(weakKeys[0].accuracyPercent, 20);
assert.equal(weakKeys[0].chapterId, 2, "'ů' bylo představeno v kapitole 2");
assert.equal(weakKeys[0].finger, "right_pinky");
assert.equal(weakKeys[0].fingerName, "Pravý malíček");

// 2. místo: Mezerník ' ' (50 % chyb)
assert.equal(weakKeys[1].key, " ");
assert.equal(weakKeys[1].displayKey, "Mezerník", "Klávesa mezery musí mít displayKey 'Mezerník'");
assert.equal(weakKeys[1].errorPercent, 50);

// 3. a 4. místo: tie-breaker mezi 'k' a 'u' (obě 33 % chyb, 'k' má 10 chyb, 'u' má 5 chyb)
assert.equal(weakKeys[2].key, "k", "Při shodné chybovosti musí být dříve klávesa s více chybami (k má 10 chyb)");
assert.equal(weakKeys[3].key, "u", "Při shodné chybovosti je u za k (u má 5 chyb)");

// 5. místo: 'a' (2 % chyb)
assert.equal(weakKeys[4].key, "a");
assert.equal(weakKeys[4].errorPercent, 2);

// Test parametru limit
const top2 = getWeakKeys(testStats, "qwertz", 2, 3);
assert.equal(top2.length, 2, "Limit 2 musí vrátit nejvýše 2 klávesy");
assert.equal(top2[0].key, "ů");
assert.equal(top2[1].key, " ");

// Test prázdných / neplatných vstupů
assert.deepEqual(getWeakKeys(null), [], "getWeakKeys(null) musí vrátit prázdné pole");
assert.deepEqual(getWeakKeys(undefined), [], "getWeakKeys(undefined) musí vrátit prázdné pole");
assert.deepEqual(getWeakKeys({}), [], "getWeakKeys({}) musí vrátit prázdné pole");
console.log("✓ Logika getWeakKeys úspěšně ověřena (výpočet, tie-break, limit, mezerník, null-safety).");

// ---------------------------------------------------------------------------
// 3. Test findChapterForKey — mapování kláves na osnovu kurzu
// ---------------------------------------------------------------------------
assert.equal(findChapterForKey("d").id, 1, "'d' je v kapitole 1");
assert.equal(findChapterForKey("f").id, 1, "'f' je v kapitole 1");
assert.equal(findChapterForKey("j").id, 1, "'j' je v kapitole 1");
assert.equal(findChapterForKey("k").id, 1, "'k' je v kapitole 1");
assert.equal(findChapterForKey("a").id, 2, "'a' je v kapitole 2");
assert.equal(findChapterForKey("s").id, 2, "'s' je v kapitole 2");
assert.equal(findChapterForKey("l").id, 2, "'l' je v kapitole 2");
assert.equal(findChapterForKey("ů").id, 2, "'ů' je v kapitole 2");
assert.equal(findChapterForKey("e").id, 4, "'e' je v kapitole 4");
assert.equal(findChapterForKey("i").id, 4, "'i' je v kapitole 4");
assert.equal(findChapterForKey("p").id, 8, "'p' je v kapitole 8");
assert.equal(findChapterForKey(".").id, 13, "'.' je v kapitole 13");
assert.equal(findChapterForKey("č").id, 18, "'č' je v kapitole 18");
assert.equal(findChapterForKey("ž").id, 21, "'ž' je v kapitole 21");

// Neznámý znak nesmí vyhodit výjimku, ale bezpečně vrátit kapitolu 1
const fallbackChapter = findChapterForKey("@");
assert.equal(fallbackChapter.id, 1, "Neznámý znak musí bezpečně spadnout na kapitolu 1");
console.log("✓ findChapterForKey spolehlivě mapuje znaky na kapitoly kurzu.");

// ---------------------------------------------------------------------------
// 4. Test prstokladu pro QWERTZ vs QWERTY (getKeyFinger a FINGER_NAMES)
// ---------------------------------------------------------------------------
assert.equal(getKeyFinger("z", "qwertz"), "right_index", "z v qwertz = pravý ukazováček");
assert.equal(getKeyFinger("y", "qwertz"), "left_pinky", "y v qwertz = levý malíček");
assert.equal(getKeyFinger("y", "qwerty"), "right_index", "y v qwerty = pravý ukazováček");
assert.equal(getKeyFinger("z", "qwerty"), "left_pinky", "z v qwerty = levý malíček");

// České názvy prstů
assert.equal(getFingerDisplayName("left_pinky"), "Levý malíček");
assert.equal(getFingerDisplayName("right_middle"), "Pravý prostředníček");
assert.equal(getFingerDisplayName(null), "Neznámý");
assert.equal(getFingerDisplayName(undefined), "Neznámý");
console.log("✓ Mapování prstů a české popisky fungují pro QWERTZ i QWERTY.");

// ---------------------------------------------------------------------------
// 5. Test vyhledání definice klávesy (findKeyDefinition)
// ---------------------------------------------------------------------------
const defF = findKeyDefinition("f", "qwertz");
assert.ok(defF, "Klávesa 'f' musí být nalezena");
assert.equal(defF.key, "f");
assert.equal(defF.finger, "left_index");

const defSpace = findKeyDefinition(" ", "qwertz");
assert.ok(defSpace, "Klávesa mezery musí být nalezena");
assert.equal(defSpace.key, " ");

// Diakritické měkčení — fallback pro znaky bez přímé fyzické klávesy
const defDSoft = findKeyDefinition("ď", "qwertz");
assert.ok(defDSoft, "Znak 'ď' se mapuje na klávesu 'd'");
assert.equal(defDSoft.key, "d");
console.log("✓ findKeyDefinition spolehlivě vyhledává klávesy včetně fallbacků diakritiky.");

// ---------------------------------------------------------------------------
// 6. Test domovské řady a hmatových výstupků (sjednocený model)
// ---------------------------------------------------------------------------
const homeKeys = CZECH_QWERTZ_LAYOUT.flat().filter((k) => k.home);
assert.equal(homeKeys.length, 8, "Domovská řada musí mít přesně 8 kláves (asdf jklů)");
const homeKeyNames = homeKeys.map((k) => k.key.toLowerCase()).sort();
assert.deepEqual(homeKeyNames, ["a", "d", "f", "j", "k", "l", "s", "ů"].sort());

const nubKeys = CZECH_QWERTZ_LAYOUT.flat().filter((k) => k.nub);
assert.equal(nubKeys.length, 2, "Hmatové výstupky musí být pouze 2 (na F a J)");
assert.deepEqual(nubKeys.map((k) => k.key.toLowerCase()).sort(), ["f", "j"].sort());
console.log("✓ Domovská řada (8 kláves) a hmatové výstupky (2 klávesy) odpovídají standardu.");

console.log("\n=== VŠECHNY UNIT TESTY PRO ISSUE #13 ÚSPĚŠNĚ PROBĚHLY! ===");
