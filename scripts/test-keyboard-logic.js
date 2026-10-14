/**
 * Verifikační jednotkový test pro logiku klávesnice, prstokladu, řazení slabých kláves a heatmapy.
 * Spouští se pomocí: npm run test:keyboard-logic (nebo node scripts/test-keyboard-logic.js)
 */

const path = require("node:path");
const assert = require("node:assert/strict");
const jiti = require("jiti")(__filename);

// Přímý import skutečných exportovaných funkcí a konstant ze src/lib/keyboard.ts
const {
  getWeakKeys,
  findChapterForKey,
  findKeyDefinition,
  getKeyFinger,
  getFingerDisplayName,
  FINGER_NAMES,
  FINGER_SHORT_NAMES,
  getLayout,
  CZECH_QWERTZ_LAYOUT,
  CZECH_QWERTY_LAYOUT,
} = jiti("../src/lib/keyboard.ts");

console.log("=== Běh jednotkových testů pro Issue #13 (Heatmapa chybovosti na profilu) ===");

// 1. Ověření layoutu a konzistence domovské řady a výstupků
console.log("1. Ověření layoutu a kláves...");
const qwertzRows = getLayout("qwertz");
assert.equal(qwertzRows.length, 5, "Layout musí mít 5 řad");
const allKeys = qwertzRows.flat();

// Domovská řada: přesně 8 kláves (asdf jklů)
const homeKeys = allKeys.filter((k) => k.home).map((k) => k.key).sort();
assert.equal(homeKeys.length, 8, "Musí existovat přesně 8 domovských kláves");
assert.deepEqual(homeKeys, ["a", "d", "f", "j", "k", "l", "s", "ů"].sort(), "Domovské klávesy musí být asdf jklů");

// Hmatové výstupky: přesně 2 klávesy (f a j)
const nubKeys = allKeys.filter((k) => k.nub).map((k) => k.key).sort();
assert.equal(nubKeys.length, 2, "Musí existovat přesně 2 hmatové výstupky");
assert.deepEqual(nubKeys, ["f", "j"].sort(), "Hmatové výstupky musí být na klávesách F a J");

// 2. QWERTZ vs QWERTY mapování prstů
console.log("2. Ověření prstokladu pro Z/Y a speciální znaky...");
assert.equal(getKeyFinger("z", "qwertz"), "right_index");
assert.equal(getKeyFinger("y", "qwertz"), "left_pinky");
assert.equal(getKeyFinger("y", "qwerty"), "right_index");
assert.equal(getKeyFinger("z", "qwerty"), "left_pinky");
assert.equal(getKeyFinger(" "), "left_thumb");

// Názvy prstů
assert.equal(getFingerDisplayName("left_index"), "Levý ukazováček");
assert.equal(getFingerDisplayName("right_middle"), "Pravý prostředníček");
assert.equal(FINGER_SHORT_NAMES["left_pinky"], "L. malíček");

// 3. Ověření vyhledávání definice klávesy (findKeyDefinition)
console.log("3. Ověření findKeyDefinition...");
const defA = findKeyDefinition("a");
assert.ok(defA);
assert.equal(defA.key, "a");
assert.equal(defA.finger, "left_pinky");
assert.equal(defA.home, true);

const defPlus = findKeyDefinition("1");
assert.ok(defPlus);
assert.equal(defPlus.key, "+");
assert.equal(defPlus.shiftLabel, "1");

const defSpace = findKeyDefinition(" ");
assert.ok(defSpace);
assert.equal(defSpace.label, "Mezerník");

// 4. Ověření mapování kapitol (findChapterForKey)
console.log("4. Ověření findChapterForKey s curriculum...");
const chD = findChapterForKey("d");
assert.equal(chD.id, 1, "'d' musí být představeno v kapitole 1");
const chA = findChapterForKey("a");
assert.equal(chA.id, 2, "'a' musí být představeno v kapitole 2");
const chE = findChapterForKey("e");
assert.equal(chE.id, 4, "'e' musí být představeno v kapitole 4");
const chQ = findChapterForKey("q");
assert.equal(chQ.id, 15, "'q' musí být představeno v kapitole 15");

// 5. Test skutečné funkce getWeakKeys
console.log("5. Test skutečné analytické funkce getWeakKeys...");
const mockStats = {
  a: { hits: 100, misses: 2 }, // 2 % chyby (102 celkem)
  u: { hits: 10, misses: 5 },  // 33 % chyby (15 celkem, 5 chyb)
  k: { hits: 20, misses: 10 }, // 33 % chyby (30 celkem, 10 chyb)
  ů: { hits: 2, misses: 8 },   // 80 % chyby (10 celkem, 8 chyb) -> nejhorší
  f: { hits: 50, misses: 0 },  // 0 chyb -> vyloučeno
  z: { hits: 1, misses: 1 },   // 2 pokusy celkem -> pod minAttempts=3, vyloučeno
  " ": { hits: 5, misses: 5 }, // 50 % chyby (10 celkem, 5 chyb) -> mezerník
};

const weak = getWeakKeys(mockStats, "qwertz", 5, 3);
assert.equal(weak.length, 5, "Mělo být vybráno právě 5 slabých kláves");

// První: 'ů' (80% chyb)
assert.equal(weak[0].key, "ů");
assert.equal(weak[0].errorPercent, 80);
assert.equal(weak[0].finger, "right_pinky");
assert.equal(weak[0].chapterId, 2);
assert.equal(weak[0].fingerName, "Pravý malíček");

// Druhá: Mezerník ' ' (50% chyb)
assert.equal(weak[1].key, " ");
assert.equal(weak[1].displayKey, "Mezerník");
assert.equal(weak[1].errorPercent, 50);

// Třetí a čtvrtá: shoda chybovosti (33 %), rozhoduje počet chyb (k má 10 chyb, u má 5 chyb)
assert.equal(weak[2].key, "k");
assert.equal(weak[2].misses, 10);
assert.equal(weak[3].key, "u");
assert.equal(weak[3].misses, 5);

// Pátá: 'a'
assert.equal(weak[4].key, "a");

// Mezní hodnoty: prázdné statistiky
assert.deepEqual(getWeakKeys(null), []);
assert.deepEqual(getWeakKeys(undefined), []);
assert.deepEqual(getWeakKeys({}), []);

// Omezení počtu (limit)
const limited = getWeakKeys(mockStats, "qwertz", 2, 3);
assert.equal(limited.length, 2);
assert.equal(limited[0].key, "ů");
assert.equal(limited[1].key, " ");

console.log("\n✓ Všechny jednotkové testy pro Issue #13 úspěšně proběhly bez fasád!");
