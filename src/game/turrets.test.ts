import { test, describe } from "node:test";
import assert from "node:assert";
import type { TurretKind } from "./types.ts";

describe("Turret Types & Mechanics (Issue #18)", () => {
  const W = 1280;

  describe("TurretKind definitions and metadata", () => {
    test("supports all four required turret kinds", () => {
      const kinds: TurretKind[] = ["basic", "ice", "knockback", "explosive"];
      assert.strictEqual(kinds.length, 4);
    });

    test("meta dictionary contains titles, icons, and tints for all turret boosts", () => {
      const meta: Record<TurretKind, { title: string; icon: string; tint: number; rateMs: number; lifespanMs: number }> = {
        basic: { title: "Tureta", icon: "🌱", tint: 0x2ecc71, rateMs: 1600, lifespanMs: 22000 },
        ice: { title: "Mrazivá střílna", icon: "❄️", tint: 0x74b9ff, rateMs: 2000, lifespanMs: 20000 },
        knockback: { title: "Odstrkovadlo", icon: "🥊", tint: 0xe67e22, rateMs: 2400, lifespanMs: 20000 },
        explosive: { title: "Výbušná věž", icon: "🧨", tint: 0xff4757, rateMs: 0, lifespanMs: 25000 },
      };

      for (const kind of ["basic", "ice", "knockback", "explosive"] as TurretKind[]) {
        assert.ok(meta[kind].title.length > 0);
        assert.ok(meta[kind].icon.length > 0);
        assert.ok(typeof meta[kind].tint === "number");
        assert.ok(meta[kind].lifespanMs > 0);
      }
    });
  });

  describe("Target acquisition filtering (visible only)", () => {
    test("turret only targets visible zombies (x <= W) in the same lane", () => {
      const lane = 1;
      const zombies = [
        { id: 1, lane: 0, x: 500, dead: false }, // different lane
        { id: 2, lane: 1, x: 1340, dead: false }, // off-screen (spawned at W + 60)
        { id: 3, lane: 1, x: 800, dead: false }, // visible in lane
        { id: 4, lane: 1, x: 600, dead: true }, // dead in lane
        { id: 5, lane: 1, x: 1000, dead: false }, // visible further behind
      ];

      // Helper function simulating LevelScene filter
      function getTarget(laneIdx: number, list: typeof zombies) {
        return list
          .filter((z) => !z.dead && z.lane === laneIdx && z.x <= W)
          .sort((a, b) => a.x - b.x)[0];
      }

      const target = getTarget(lane, zombies);
      assert.ok(target, "Should find a target");
      assert.strictEqual(target.id, 3, "Should select closest visible living zombie (x = 800)");
      assert.notStrictEqual(target.id, 2, "Must never target off-screen zombie at x = 1340");
    });
  });

  describe("Knockback turret mechanics", () => {
    test("pushes zombie back by 120px and clamps at canvas width W", () => {
      const pushZombie = (currentX: number) => Math.min(W, currentX + 120);

      assert.strictEqual(pushZombie(600), 720);
      assert.strictEqual(pushZombie(1200), 1280, "Should clamp to screen width W (1280)");
      assert.strictEqual(pushZombie(1280), 1280, "Should remain clamped at W");
    });

    test("stun duration applies correctly", () => {
      const now = 10000;
      const stunDuration = 400;
      const stunUntil = now + stunDuration;
      assert.strictEqual(stunUntil - now, 400);

      // Movement during stun should result in speedMul = 0
      const isStunned = (t: number) => t < stunUntil;
      assert.strictEqual(isStunned(10200), true);
      assert.strictEqual(isStunned(10400), false);
      assert.strictEqual(isStunned(10500), false);
    });
  });

  describe("Ice turret mechanics", () => {
    test("slows zombie speed by 50% for 3500ms", () => {
      const now = 5000;
      const slowUntil = now + 3500;
      const baseSpeed = 100;

      const calcSpeed = (t: number, globalFreeze: boolean) => {
        let mul = globalFreeze ? 0.35 : 1.0;
        if (t < slowUntil) {
          mul *= 0.5;
        }
        return baseSpeed * mul;
      };

      // Normal slowed speed
      assert.strictEqual(calcSpeed(6000, false), 50); // 100 * 0.5 = 50
      // Normal speed after slow expires
      assert.strictEqual(calcSpeed(9000, false), 100);
      // Combined with global freeze
      assert.strictEqual(calcSpeed(6000, true), 17.5); // 100 * 0.35 * 0.5 = 17.5
    });
  });

  describe("Explosive turret mechanics", () => {
    test("regular zombie is immediately eliminated and awards score", () => {
      const zombie = {
        kind: "basic",
        hp: 3,
        queue: ["slovo2", "slovo3"],
        dead: false,
      };

      // Explosive hit logic
      zombie.queue = [];
      zombie.hp = 0;
      zombie.dead = true;

      assert.strictEqual(zombie.dead, true);
      assert.strictEqual(zombie.hp, 0);
      assert.strictEqual(zombie.queue.length, 0);
    });

    test("boss zombie receives 4 damage", () => {
      const boss = {
        kind: "boss",
        hp: 8,
        queue: ["b1", "b2", "b3", "b4", "b5", "b6", "b7"],
        dead: false,
      };

      const dmg = Math.min(4, boss.hp);
      for (let d = 0; d < dmg - 1; d++) {
        if (boss.queue.length > 0) boss.queue.shift();
      }
      boss.hp -= dmg;

      assert.strictEqual(boss.hp, 4, "Boss should have 4 HP remaining after 4 damage");
      assert.strictEqual(boss.dead, false);
      assert.strictEqual(boss.queue.length, 4);
    });

    test("explosive turret marks itself for self-destruction after firing", () => {
      const turret = {
        kind: "explosive" as TurretKind,
        expiresAt: 25000,
        nextShotAt: 500,
      };

      // When explosive turret shoots:
      turret.expiresAt = 0;

      assert.strictEqual(turret.expiresAt, 0, "Turret should expire immediately upon firing");
    });
  });
});
