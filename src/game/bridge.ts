/**
 * Most mezi Reactem a Phaserem. Hra do Reactu posílá jen hrubozrnné události
 * (HUD několikrát za sekundu, výsledek kola), React do hry jen povely.
 */
import type { HudState, RunResult } from "./types";

export interface BridgeEvents {
  "hud": (state: HudState) => void;
  "run-finished": (result: RunResult) => void;
  "level-ready": () => void;
  "exit": () => void;
  "restart-level": () => void;
}

type Listener = (...args: unknown[]) => void;

class Bridge {
  private listeners: Map<string, Set<Listener>> = new Map();

  emitTyped<K extends keyof BridgeEvents>(event: K, ...args: Parameters<BridgeEvents[K]>): boolean {
    const set = this.listeners.get(event as string);
    if (!set || set.size === 0) return false;
    for (const fn of Array.from(set)) {
      fn(...args);
    }
    return true;
  }

  onTyped<K extends keyof BridgeEvents>(event: K, fn: BridgeEvents[K]): () => void {
    let set = this.listeners.get(event as string);
    if (!set) {
      set = new Set();
      this.listeners.set(event as string, set);
    }
    set.add(fn as Listener);
    return () => {
      set?.delete(fn as Listener);
    };
  }

  emit(event: string, ...args: unknown[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return false;
    for (const fn of Array.from(set)) {
      fn(...args);
    }
    return true;
  }

  on(event: string, fn: Listener): this {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn);
    return this;
  }

  off(event: string, fn: Listener): this {
    this.listeners.get(event)?.delete(fn);
    return this;
  }
}

export const bridge = new Bridge();
