/**
 * Vygeneruje placeholder textury (žádné obrázky zatím nemáme — OTAZKY B9).
 * Až budou sprity, nahradí se `this.load.atlas(...)` a klíče zůstanou stejné.
 */
import Phaser from "phaser";

export const TEX = {
  zombieBasic: "zombie-basic",
  zombieFast: "zombie-fast",
  zombieArmored: "zombie-armored",
  boss: "zombie-boss",
  tower: "tower",
  house: "house",
  bullet: "bullet",
} as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Skutečné sprity: zatím jen zombie učitel (management-a-zdroje/inbox). Ostatní jsou placeholdery.
    this.load.image(TEX.zombieBasic, "/game/zombie-teacher.png");
  }

  create() {
    if (!this.textures.exists(TEX.zombieBasic)) this.makeZombie(TEX.zombieBasic, 0x6ab04c, 64, 84);
    this.makeZombie(TEX.zombieFast, 0xf9ca24, 52, 72);
    this.makeZombie(TEX.zombieArmored, 0x7f8c8d, 72, 90);
    this.makeZombie(TEX.boss, 0x8e44ad, 140, 170);

    const g = this.add.graphics();
    // věž
    g.fillStyle(0x2ecc71, 1).fillRoundedRect(0, 0, 56, 70, 10);
    g.fillStyle(0x145a32, 1).fillRect(20, 0, 16, 26);
    g.generateTexture(TEX.tower, 56, 70);
    g.clear();
    // dům (levý okraj)
    g.fillStyle(0xd35400, 1).fillRect(0, 40, 90, 120);
    g.fillStyle(0xe67e22, 1).fillTriangle(0, 40, 90, 40, 45, 0);
    g.fillStyle(0xf1c40f, 1).fillRect(30, 90, 30, 70);
    g.generateTexture(TEX.house, 90, 160);
    g.clear();
    // střela
    g.fillStyle(0xffffff, 1).fillCircle(6, 6, 6);
    g.generateTexture(TEX.bullet, 12, 12);
    g.destroy();

    this.scene.start("Level", this.scene.settings.data);
  }

  private makeZombie(key: string, color: number, w: number, h: number) {
    const g = this.add.graphics();
    const headR = w * 0.32;
    g.fillStyle(color, 1);
    g.fillRoundedRect(w * 0.15, headR * 1.6, w * 0.7, h - headR * 1.6, 8); // tělo
    g.fillCircle(w / 2, headR, headR); // hlava
    g.fillStyle(0x000000, 0.35);
    g.fillCircle(w / 2 - headR * 0.35, headR * 0.9, headR * 0.18);
    g.fillCircle(w / 2 + headR * 0.35, headR * 0.9, headR * 0.18);
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, headR * 1.8, w * 0.3, 10, 4); // ruce dopředu (jde doleva)
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
