import { test, describe } from "node:test";
import assert from "node:assert";

describe("Word typing progress and error reset (Issue #19)", () => {
  interface SimulatedZombie {
    word: string;
    typed: number;
    dead: boolean;
  }

  function simulateTypingKey(
    zombie: SimulatedZombie,
    char: string,
    resetOnError: boolean = true
  ): { ok: boolean; wordFinished: boolean } {
    const expected = zombie.word[zombie.typed];
    if (char === expected) {
      zombie.typed++;
      const wordFinished = zombie.typed >= zombie.word.length;
      if (wordFinished) {
        zombie.dead = true;
      }
      return { ok: true, wordFinished };
    } else {
      if (resetOnError) {
        // Issue #19: reset na začátek
        zombie.typed = 0;
      }
      return { ok: false, wordFinished: false };
    }
  }

  test("typing correct characters sequentially advances progress", () => {
    const z: SimulatedZombie = { word: "praha", typed: 0, dead: false };

    assert.strictEqual(simulateTypingKey(z, "p").ok, true);
    assert.strictEqual(z.typed, 1);
    assert.strictEqual(simulateTypingKey(z, "r").ok, true);
    assert.strictEqual(z.typed, 2);
  });

  test("making a typo resets typed counter back to 0 (Issue #19)", () => {
    const z: SimulatedZombie = { word: "praha", typed: 0, dead: false };

    simulateTypingKey(z, "p");
    simulateTypingKey(z, "r");
    simulateTypingKey(z, "a");
    assert.strictEqual(z.typed, 3);

    // Překlep na 4. písmenu (místo 'h' hráč zmáčkne 'x')
    const missResult = simulateTypingKey(z, "x");
    assert.strictEqual(missResult.ok, false);
    assert.strictEqual(z.typed, 0, "Rozepsané slovo musí být po chybě resetováno na 0");

    // Hráč nyní musí slovo napsat celé znovu od 'p'
    const wrongNext = simulateTypingKey(z, "h");
    assert.strictEqual(wrongNext.ok, false, "Pokračování v původním místě slova nesmí projít");
    assert.strictEqual(z.typed, 0);

    const restartOk = simulateTypingKey(z, "p");
    assert.strictEqual(restartOk.ok, true, "Znovunapsání od prvního písmene musí projít");
    assert.strictEqual(z.typed, 1);
  });

  test("word finishes only when typed continuously without unrecovered errors", () => {
    const z: SimulatedZombie = { word: "pes", typed: 0, dead: false };

    simulateTypingKey(z, "p");
    simulateTypingKey(z, "k"); // chyba -> reset na 0
    assert.strictEqual(z.typed, 0);

    simulateTypingKey(z, "p");
    simulateTypingKey(z, "e");
    const end = simulateTypingKey(z, "s");
    assert.strictEqual(end.wordFinished, true);
    assert.strictEqual(z.dead, true);
  });
});
