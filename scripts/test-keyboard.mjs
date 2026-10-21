import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  CZECH_QWERTZ_LAYOUT,
  CZECH_QWERTY_LAYOUT,
  getKeyFinger,
  getKeyTargetInfo,
  findKeyForChar,
  FINGER_DATA,
} = jiti("../src/lib/keyboard.ts");

console.log("=== Testing Keyboard Layout & Fingering ===");

// 1. Home row verification
const homeKeysQwertz = CZECH_QWERTZ_LAYOUT.flat().filter((k) => k.home);
assert.equal(homeKeysQwertz.length, 8, "Must have exactly 8 home row keys");
const homeKeyNames = homeKeysQwertz.map((k) => k.key).sort();
assert.deepEqual(homeKeyNames, ["a", "d", "f", "j", "k", "l", "s", "ů"].sort(), "Home row must be asdf jklů");

// 2. Nub keys on F and J
const nubKeys = CZECH_QWERTZ_LAYOUT.flat().filter((k) => k.nub);
assert.equal(nubKeys.length, 2, "Must have exactly 2 tactile nubs");
assert.deepEqual(nubKeys.map((k) => k.key).sort(), ["f", "j"], "Nubs must be on f and j");

// 3. QWERTZ vs QWERTY differences
// In QWERTZ: row 1 has 'z' (right_index), row 3 has 'y' (left_pinky)
assert.equal(getKeyFinger("z", "qwertz"), "right_index", "z in qwertz should be right index");
assert.equal(getKeyFinger("y", "qwertz"), "left_pinky", "y in qwertz should be left pinky");

// In QWERTY: row 1 has 'y' (right_index), row 3 has 'z' (left_pinky)
assert.equal(getKeyFinger("y", "qwerty"), "right_index", "y in qwerty should be right index");
assert.equal(getKeyFinger("z", "qwerty"), "left_pinky", "z in qwerty should be left pinky");

// 4. Diacritics row mapping
assert.equal(getKeyFinger("ě"), "left_ring", "ě must be left ring");
assert.equal(getKeyFinger("š"), "left_middle", "š must be left middle");
assert.equal(getKeyFinger("č"), "left_index", "č must be left index");
assert.equal(getKeyFinger("ř"), "left_index", "ř must be left index");
assert.equal(getKeyFinger("ž"), "right_index", "ž must be right index");
assert.equal(getKeyFinger("ý"), "right_index", "ý must be right index");
assert.equal(getKeyFinger("á"), "right_middle", "á must be right middle");
assert.equal(getKeyFinger("í"), "right_ring", "í must be right ring");
assert.equal(getKeyFinger("é"), "right_pinky", "é must be right pinky");
assert.equal(getKeyFinger("ú"), "right_pinky", "ú must be right pinky");
assert.equal(getKeyFinger("ů"), "right_pinky", "ů must be right pinky");

// 5. Space
assert.equal(getKeyFinger(" "), "left_thumb", "space must be thumb");

// 6. Target info and opposite Shift rule
// 'k' -> right_middle, no shift
const targetK = getKeyTargetInfo("k", "qwertz");
assert(targetK);
assert.equal(targetK.needsShift, false);
assert.equal(targetK.finger, "right_middle");
assert.equal(targetK.instruction, "Stiskni „K“ ➔ Pravý prostředníček");

// 'K' -> right_middle, needs Shift from opposite hand (left_pinky -> ShiftLeft)
const targetCapK = getKeyTargetInfo("K", "qwertz");
assert(targetCapK);
assert.equal(targetCapK.needsShift, true);
assert.equal(targetCapK.finger, "right_middle");
assert.equal(targetCapK.shiftFinger, "left_pinky");
assert.equal(targetCapK.shiftKeyKey, "ShiftLeft");

// 'F' -> left_index, needs Shift from opposite hand (right_pinky -> ShiftRight)
const targetCapF = getKeyTargetInfo("F", "qwertz");
assert(targetCapF);
assert.equal(targetCapF.needsShift, true);
assert.equal(targetCapF.finger, "left_index");
assert.equal(targetCapF.shiftFinger, "right_pinky");
assert.equal(targetCapF.shiftKeyKey, "ShiftRight");

// 7. Finger styles completeness
for (const finger of [
  "left_pinky",
  "left_ring",
  "left_middle",
  "left_index",
  "left_thumb",
  "right_thumb",
  "right_index",
  "right_middle",
  "right_ring",
  "right_pinky",
]) {
  assert(FINGER_DATA[finger], `Missing style data for ${finger}`);
  assert(FINGER_DATA[finger].label, `Missing label for ${finger}`);
  assert(FINGER_DATA[finger].activeBgClass, `Missing activeBgClass for ${finger}`);
}

console.log("All keyboard unit tests PASSED!");
