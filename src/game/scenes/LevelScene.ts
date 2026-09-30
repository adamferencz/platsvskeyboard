/**
 * Hlavní herní scéna: dráhy, zombíci s textem, lock-on psaní, životy, věže, boss.
 */
import Phaser from "phaser";
import { bridge } from "../bridge";
import { chapterById, levelId } from "../content/curriculum";
import { roundConfig, type RoundConfig, type ZombieKind } from "../content/levels";
import { WordGenerator, type KeyStat, type WordList } from "../content/words";
import { TypingInput } from "../input/TypingInput";
import { accuracy, grossCpm, netCpm, stars } from "@/lib/scoring";
import type { HudState, RunResult } from "../types";
import { TEX } from "./BootScene";

export interface LevelData {
  chapter: number;
  round: number;
  words: WordList;
  keyStats: Record<string, KeyStat>;
  playerCpm: number;
  parent: HTMLElement;
}

const W = 1280;
const H = 720;
const LANES = 4;
const LANE_TOP = 150;
const LANE_H = 142;
const HOUSE_X = 130;
const SPAWN_X = W + 60;

interface Zombie {
  kind: ZombieKind;
  lane: number;
  sprite: Phaser.GameObjects.Image;
  container: Phaser.GameObjects.Container;
  typedText: Phaser.GameObjects.Text;
  restText: Phaser.GameObjects.Text;
  word: string;
  typed: number;
  speed: number; // px/s
  /** zbývající slova (boss / obrněný) */
  queue: string[];
  hp: number;
  maxHp: number;
  dead: boolean;
}

interface Tower {
  lane: number;
  sprite: Phaser.GameObjects.Image;
  expiresAt: number;
  nextShotAt: number;
}

export class LevelScene extends Phaser.Scene {
  private data_!: LevelData;
  private cfg!: RoundConfig;
  private gen!: WordGenerator;
  private input_!: TypingInput;

  private zombies: Zombie[] = [];
  private towers: Tower[] = [];
  private locked: Zombie | null = null;
  private spawned = 0;
  private bossSpawned = false;
  private finished = false;
  private started = false;
  private startAt = 0;

  private lives = 5;
  private livesLost = 0;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private kills = 0;
  private correct = 0;
  private errors = 0;
  private keystrokes: [number, 0 | 1][] = [];
  private keyStats: Record<string, KeyStat> = {};

  private bonusWord: string | null = null;
  private bonusTyped = 0;
  private bonusLock = false;
  private killsSinceBonus = 0;

  private hudTimer = 0;
  private spawnEvent?: Phaser.Time.TimerEvent;
  private ground!: Phaser.GameObjects.Graphics;

  constructor() {
    super("Level");
  }

  init(data: LevelData) {
    this.data_ = data;
    this.cfg = roundConfig(data.chapter, data.round, data.playerCpm);
    this.lives = this.cfg.lives;
    this.keyStats = { ...data.keyStats };
    this.zombies = [];
    this.towers = [];
    this.locked = null;
    this.spawned = 0;
    this.bossSpawned = false;
    this.finished = false;
    this.started = false;
    this.livesLost = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.kills = 0;
    this.correct = 0;
    this.errors = 0;
    this.keystrokes = [];
    this.bonusWord = null;
    this.bonusTyped = 0;
    this.bonusLock = false;
    this.killsSinceBonus = 0;
  }

  create() {
    const chapter = chapterById(this.data_.chapter)!;
    this.gen = new WordGenerator({
      chapter,
      round: this.data_.round,
      words: this.data_.words,
      keyStats: this.keyStats,
    });

    this.drawBackground();
    const house = this.add.image(-10, LANE_TOP + LANES * LANE_H + 4, TEX.house).setOrigin(0, 1).setDepth(1);
    house.setScale(Math.min(250 / house.width, (LANES * LANE_H) / house.height));

    const title = this.add
      .text(W / 2, H / 2 - 40, `${chapter.name}\nkolo ${this.data_.round}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "44px",
        color: "#ffffff",
        align: "center",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(100);
    const hint = this.add
      .text(W / 2, H / 2 + 50, "Piš písmena na zombících. Začni psát…", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "24px",
        color: "#ffe066",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.input_ = new TypingInput(this.data_.parent, {
      onChar: (ch, t) => this.onChar(ch, t),
      onEscape: () => this.exit(),
    });

    const startGame = () => {
      if (this.started) return;
      this.started = true;
      this.startAt = performance.now();
      title.destroy();
      hint.destroy();
      this.spawnEvent = this.time.addEvent({
        delay: this.cfg.spawnMs,
        loop: true,
        callback: () => this.spawnZombie(),
      });
      this.spawnZombie();
    };
    // hra začne prvním úhozem nebo po 3 s
    this.time.delayedCall(3000, startGame);
    this.events.once("first-key", startGame);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input_.dispose();
      this.spawnEvent?.remove();
    });

    bridge.emitTyped("level-ready");
    this.emitHud();
  }

  private drawBackground() {
    this.ground = this.add.graphics();
    if (this.textures.exists(TEX.background)) {
      // pozadí má 4 pruhy trávníku od ~23 % výšky dolů; napasujeme je na naše dráhy
      const img = this.textures.get(TEX.background).getSourceImage() as HTMLImageElement;
      const lanesTopRatio = 0.235;
      const s = (LANES * LANE_H) / (img.height * (1 - lanesTopRatio));
      this.add
        .image(0, LANE_TOP - img.height * lanesTopRatio * s, TEX.background)
        .setOrigin(0, 0)
        .setDisplaySize(W, img.height * s)
        .setDepth(0);
      return;
    }
    const colors = [0x4a7c59, 0x3e6b4c];
    for (let i = 0; i < LANES; i++) {
      this.ground.fillStyle(colors[i % 2], 1);
      this.ground.fillRect(0, LANE_TOP + i * LANE_H, W, LANE_H);
    }
    this.ground.fillStyle(0x1e2a24, 1).fillRect(0, 0, W, LANE_TOP);
    this.ground.fillStyle(0x2c3e50, 1).fillRect(0, LANE_TOP + LANES * LANE_H, W, H - LANE_TOP - LANES * LANE_H);
  }

  // ---------- spawn ----------

  private spawnZombie() {
    if (this.finished) return;
    if (this.spawned >= this.cfg.count) {
      this.spawnEvent?.remove();
      if (this.cfg.boss && !this.bossSpawned) this.spawnBoss();
      return;
    }
    this.spawned++;
    const r = Math.random();
    const kind: ZombieKind = r < this.cfg.armoredRatio ? "armored" : r < this.cfg.armoredRatio + this.cfg.fastRatio ? "fast" : "basic";
    const word = this.uniqueWord();
    const queue = kind === "armored" ? [this.uniqueWord()] : [];
    this.addZombie(kind, word, queue);
  }

  private spawnBoss() {
    this.bossSpawned = true;
    const words = Array.from({ length: this.cfg.bossHp }, () => this.uniqueWord());
    this.addZombie("boss", words[0], words.slice(1));
  }

  /** V jedné chvíli nemají dva zombíci stejné první písmeno (ZType). */
  private uniqueWord(): string {
    const taken = new Set(this.zombies.filter((z) => !z.dead).map((z) => z.word[0]?.toLowerCase()));
    if (this.bonusWord) taken.add(this.bonusWord[0]);
    for (let i = 0; i < 25; i++) {
      const w = this.gen.next();
      if (!taken.has(w[0].toLowerCase())) return w;
    }
    return this.gen.next();
  }

  private addZombie(kind: ZombieKind, word: string, queue: string[]) {
    const lane = this.pickLane();
    const y = LANE_TOP + lane * LANE_H + LANE_H - 6;
    const texKey =
      kind === "basic"
        ? Math.random() < 0.5 && this.textures.exists(TEX.zombieStudent)
          ? TEX.zombieStudent
          : TEX.zombieBasic
        : { fast: TEX.zombieFast, armored: TEX.zombieArmored, boss: TEX.boss }[kind];
    const sprite = this.add.image(0, 0, texKey).setOrigin(0.5, 1);
    if (kind === "armored") sprite.setFlipX(true); // želva je nakreslená doprava
    // jednotná výška postav bez ohledu na rozlišení zdrojového obrázku
    const targetH = { basic: 112, fast: 98, armored: 118, boss: 210 }[kind];
    sprite.setScale(targetH / sprite.height);
    const fontSize = kind === "boss" ? 40 : 30;
    const style = {
      fontFamily: "Consolas, 'Courier New', monospace",
      fontSize: `${fontSize}px`,
      stroke: "#000000",
      strokeThickness: 5,
    };
    const typedText = this.add.text(0, 0, "", { ...style, color: "#2ecc71" }).setOrigin(0, 1);
    const restText = this.add.text(0, 0, word, { ...style, color: "#ffffff" }).setOrigin(0, 1);
    const container = this.add.container(SPAWN_X, y, [sprite, typedText, restText]);
    container.setDepth(10 + lane);

    const speedMul = kind === "fast" ? 1.55 : kind === "boss" ? 0.55 : kind === "armored" ? 0.85 : 1;
    const z: Zombie = {
      kind,
      lane,
      sprite,
      container,
      typedText,
      restText,
      word,
      typed: 0,
      speed: ((SPAWN_X - HOUSE_X) / this.cfg.crossSec) * speedMul,
      queue,
      hp: 1 + queue.length,
      maxHp: 1 + queue.length,
      dead: false,
    };
    this.layoutLabel(z);
    this.zombies.push(z);

    // houpání při chůzi (procedurální animace místo snímků)
    this.tweens.add({
      targets: sprite,
      angle: { from: -4, to: 4 },
      duration: kind === "fast" ? 220 : 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    if (kind === "boss") this.cameras.main.shake(300, 0.004);
    this.emitHud();
  }

  private pickLane(): number {
    // dráha s nejmenším počtem živých zombíků, při shodě náhodně
    const counts = Array.from({ length: LANES }, (_, i) => this.zombies.filter((z) => !z.dead && z.lane === i).length);
    const min = Math.min(...counts);
    const candidates = counts.map((c, i) => (c === min ? i : -1)).filter((i) => i >= 0);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private layoutLabel(z: Zombie) {
    const typed = z.word.slice(0, z.typed);
    const rest = z.word.slice(z.typed);
    z.typedText.setText(typed);
    z.restText.setText(rest);
    const total = z.typedText.width + z.restText.width;
    const top = -z.sprite.displayHeight - 8;
    z.typedText.setPosition(-total / 2, top);
    z.restText.setPosition(-total / 2 + z.typedText.width, top);
  }

  // ---------- vstup ----------

  private onChar(ch: string, tAbs: number) {
    if (this.finished) return;
    if (!this.started) this.events.emit("first-key");
    const t = Math.round(tAbs - this.startAt);
    if (ch === " ") return; // mezera zatím nic (slova jsou jednotlivá)

    // 1) zamčený zombík
    if (this.locked && !this.locked.dead) {
      this.hit(this.locked, ch, t);
      return;
    }
    // 2) bonusové slovo rozepsané
    if (this.bonusLock && this.bonusWord) {
      this.hitBonus(ch, t);
      return;
    }
    // 3) nový cíl: nejbližší zombík začínající znakem
    const target = this.zombies
      .filter((z) => !z.dead && z.word[0] === ch)
      .sort((a, b) => a.container.x - b.container.x)[0];
    if (target) {
      this.locked = target;
      this.hit(target, ch, t);
      return;
    }
    // 4) bonusové slovo
    if (this.bonusWord && this.bonusWord[0] === ch) {
      this.bonusLock = true;
      this.hitBonus(ch, t);
      return;
    }
    this.miss(ch, t);
  }

  private hit(z: Zombie, ch: string, t: number) {
    const expected = z.word[z.typed];
    if (ch === expected) {
      this.registerKey(expected, true, t);
      z.typed++;
      this.layoutLabel(z);
      this.tweens.add({ targets: z.sprite, scaleX: 0.9, scaleY: 1.08, duration: 60, yoyo: true });
      if (z.typed >= z.word.length) this.wordDone(z);
    } else {
      this.registerKey(expected, false, t);
      this.tweens.add({ targets: z.container, x: z.container.x + 6, duration: 40, yoyo: true, repeat: 2 });
    }
  }

  private wordDone(z: Zombie) {
    const base = 10 * z.word.length;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += base + Math.min(this.combo, 10) * 5;
    z.hp--;
    if (z.queue.length > 0) {
      // boss / obrněný: další slovo
      z.word = z.queue.shift()!;
      z.typed = 0;
      this.layoutLabel(z);
      this.flash(z);
      this.locked = null;
      return;
    }
    this.kill(z);
    this.locked = null;
    this.killsSinceBonus++;
    if (this.cfg.bonusEvery && !this.bonusWord && this.killsSinceBonus >= this.cfg.bonusEvery) {
      this.killsSinceBonus = 0;
      this.offerBonus();
    }
  }

  private kill(z: Zombie) {
    z.dead = true;
    this.kills++;
    this.tweens.killTweensOf(z.sprite);
    this.tweens.add({
      targets: z.container,
      angle: 90,
      alpha: 0,
      y: z.container.y + 30,
      duration: 350,
      ease: "Quad.in",
      onComplete: () => z.container.destroy(),
    });
    this.emitHud();
    this.checkEnd();
  }

  private flash(z: Zombie) {
    z.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(80, () => {
      if (z.sprite.active) z.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    });
  }

  private miss(ch: string, t: number) {
    this.registerKey(ch, false, t);
    this.combo = 0;
    this.cameras.main.shake(80, 0.002);
  }

  private registerKey(key: string, ok: boolean, t: number) {
    const k = key.toLowerCase();
    const s = (this.keyStats[k] ??= { hits: 0, misses: 0 });
    if (ok) {
      s.hits++;
      this.correct++;
    } else {
      s.misses++;
      this.errors++;
      this.combo = 0;
    }
    this.keystrokes.push([t, ok ? 1 : 0]);
  }

  // ---------- bonus a věže ----------

  private offerBonus() {
    this.bonusWord = this.gen.bonusWord();
    this.bonusTyped = 0;
    this.bonusLock = false;
    this.emitHud();
  }

  private hitBonus(ch: string, t: number) {
    const expected = this.bonusWord![this.bonusTyped];
    if (ch === expected) {
      this.registerKey(expected, true, t);
      this.bonusTyped++;
      if (this.bonusTyped >= this.bonusWord!.length) {
        this.placeTower();
        this.bonusWord = null;
        this.bonusTyped = 0;
        this.bonusLock = false;
      }
    } else {
      this.registerKey(expected, false, t);
      this.bonusTyped = 0;
      this.bonusLock = false;
    }
    this.emitHud();
  }

  private placeTower() {
    // do dráhy, kde je nejvíc živých zombíků
    const counts = Array.from({ length: LANES }, (_, i) => this.zombies.filter((z) => !z.dead && z.lane === i).length);
    const lane = counts.indexOf(Math.max(...counts));
    const y = LANE_TOP + lane * LANE_H + LANE_H - 6;
    const sprite = this.add.image(HOUSE_X + 70, y, TEX.tower).setOrigin(0.5, 1).setDepth(5);
    const towerScale = 78 / sprite.height;
    this.tweens.add({ targets: sprite, scale: { from: 0, to: towerScale }, duration: 250, ease: "Back.out" });
    this.towers.push({ lane, sprite, expiresAt: this.time.now + 20000, nextShotAt: this.time.now + 800 });
    this.score += 50;
  }

  private updateTowers() {
    for (const tw of this.towers) {
      if (this.time.now >= tw.expiresAt) {
        this.tweens.add({ targets: tw.sprite, alpha: 0, duration: 300, onComplete: () => tw.sprite.destroy() });
        continue;
      }
      if (this.time.now < tw.nextShotAt) continue;
      const target = this.zombies
        .filter((z) => !z.dead && z.lane === tw.lane)
        .sort((a, b) => a.container.x - b.container.x)[0];
      if (!target) continue;
      tw.nextShotAt = this.time.now + 2500;
      const bullet = this.add.image(tw.sprite.x + 20, tw.sprite.y - tw.sprite.displayHeight * 0.65, TEX.bullet).setDepth(20);
      this.tweens.add({
        targets: bullet,
        x: target.container.x,
        duration: 250,
        onComplete: () => {
          bullet.destroy();
          if (target.dead) return;
          // střela smaže jeden znak z konce slova
          if (target.word.length - target.typed > 1) {
            target.word = target.word.slice(0, -1);
            this.layoutLabel(target);
            this.flash(target);
          } else {
            this.score += 5;
            this.wordDone(target);
          }
        },
      });
    }
    this.towers = this.towers.filter((tw) => this.time.now < tw.expiresAt);
  }

  // ---------- smyčka ----------

  update(_time: number, delta: number) {
    if (this.finished || !this.started) return;
    const dt = delta / 1000;
    for (const z of this.zombies) {
      if (z.dead) continue;
      z.container.x -= z.speed * dt;
      if (z.container.x <= HOUSE_X) this.reachedHouse(z);
    }
    this.updateTowers();
    this.hudTimer += delta;
    if (this.hudTimer > 200) {
      this.hudTimer = 0;
      this.emitHud();
    }
  }

  private reachedHouse(z: Zombie) {
    const damage = z.kind === "boss" ? 3 : 1;
    this.lives = Math.max(0, this.lives - damage);
    this.livesLost += damage;
    this.combo = 0;
    if (this.locked === z) this.locked = null;
    z.dead = true;
    this.tweens.killTweensOf(z.sprite);
    z.container.destroy();
    this.cameras.main.shake(200, 0.01);
    this.cameras.main.flash(150, 200, 30, 30);
    this.emitHud();
    if (this.lives <= 0) this.finish(false);
    else this.checkEnd();
  }

  private checkEnd() {
    if (this.finished) return;
    const alive = this.zombies.some((z) => !z.dead);
    const moreToSpawn = this.spawned < this.cfg.count || (this.cfg.boss && !this.bossSpawned);
    if (!alive && !moreToSpawn) this.finish(true);
  }

  private finish(won: boolean) {
    if (this.finished) return;
    this.finished = true;
    this.spawnEvent?.remove();
    const durationMs = Math.max(1, Math.round(performance.now() - this.startAt));
    const m = { correct: this.correct, errors: this.errors, durationMs };
    const acc = accuracy(m);
    const result: RunResult = {
      levelId: levelId(this.data_.chapter, this.data_.round),
      chapter: this.data_.chapter,
      round: this.data_.round,
      won,
      correct: this.correct,
      errors: this.errors,
      durationMs,
      cpm: grossCpm(m),
      netCpm: netCpm(m),
      accuracy: acc,
      stars: stars(won, acc),
      score: this.score + (won ? 100 + this.lives * 20 : 0),
      livesLost: this.livesLost,
      kills: this.kills,
      maxCombo: this.maxCombo,
      keyStats: this.keyStats,
      keystrokes: this.keystrokes,
    };
    this.add
      .text(W / 2, H / 2, won ? "Kolo vyhráno!" : "Zombíci prošli…", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "56px",
        color: won ? "#2ecc71" : "#e74c3c",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.emitHud();
    bridge.emitTyped("run-finished", result);
  }

  private exit() {
    bridge.emitTyped("exit");
  }

  private emitHud() {
    const boss = this.zombies.find((z) => z.kind === "boss" && !z.dead);
    const state: HudState = {
      lives: this.lives,
      score: this.score,
      combo: this.combo,
      remaining: this.cfg.count - this.spawned + this.zombies.filter((z) => !z.dead).length + (this.cfg.boss && !this.bossSpawned ? 1 : 0),
      bonusWord: this.bonusWord,
      bonusTyped: this.bonusTyped,
      boss: boss ? { hp: boss.hp, maxHp: boss.maxHp } : null,
    };
    bridge.emitTyped("hud", state);
  }
}
