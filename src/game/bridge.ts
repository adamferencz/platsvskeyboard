/**
 * Most mezi Reactem a Phaserem. Hra do Reactu posílá jen hrubozrnné události
 * (HUD několikrát za sekundu, výsledek kola), React do hry jen povely.
 */
import Phaser from "phaser";
import type { HudState, RunResult } from "./types";

export interface BridgeEvents {
  "hud": (state: HudState) => void;
  "run-finished": (result: RunResult) => void;
  "level-ready": () => void;
  "exit": () => void;
}

class Bridge extends Phaser.Events.EventEmitter {
  emitTyped<K extends keyof BridgeEvents>(event: K, ...args: Parameters<BridgeEvents[K]>) {
    return this.emit(event, ...args);
  }
  onTyped<K extends keyof BridgeEvents>(event: K, fn: BridgeEvents[K]) {
    this.on(event, fn);
    return () => this.off(event, fn);
  }
}

export const bridge = new Bridge();
