import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { LevelScene, type LevelData } from "./scenes/LevelScene";

export function createGame(parent: HTMLElement, data: LevelData): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: "#1e2a24",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // klávesnici řeší TypingInput (mrtvé klávesy, rozložení), Phaser ji nesmí zachytávat
    input: { keyboard: false },
    scene: [BootScene, LevelScene],
  });
  game.scene.start("Boot", data);
  return game;
}
