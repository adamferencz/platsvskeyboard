import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
// @ts-expect-error Node native ESM test runner requires explicit extension
import { SoundManager } from "./soundManager.ts";

describe("SoundManager", () => {
  let originalWindow: typeof globalThis.window;
  let originalLocalStorage: typeof globalThis.localStorage;
  let storageMap: Map<string, string>;

  beforeEach(() => {
    storageMap = new Map();
    const mockStorage = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => {
        storageMap.set(key, val);
      },
      removeItem: (key: string) => {
        storageMap.delete(key);
      },
      clear: () => storageMap.clear(),
      key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
      length: 0,
    } as Storage;

    originalWindow = globalThis.window;
    originalLocalStorage = globalThis.localStorage;

    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
  });

  afterEach(() => {
    (globalThis as unknown as { localStorage: typeof originalLocalStorage }).localStorage = originalLocalStorage;
    (globalThis as unknown as { window: typeof originalWindow }).window = originalWindow;
  });

  test("initializes with unmuted state by default", () => {
    const sm = new SoundManager();
    assert.strictEqual(sm.isMuted(), false);
  });

  test("loads muted preference from localStorage if set to 'true'", () => {
    globalThis.localStorage.setItem("pvk_sfx_muted", "true");
    const sm = new SoundManager();
    assert.strictEqual(sm.isMuted(), true);
  });

  test("setMuted updates state and persists to localStorage", () => {
    const sm = new SoundManager();
    assert.strictEqual(sm.isMuted(), false);

    sm.setMuted(true);
    assert.strictEqual(sm.isMuted(), true);
    assert.strictEqual(globalThis.localStorage.getItem("pvk_sfx_muted"), "true");

    sm.setMuted(false);
    assert.strictEqual(sm.isMuted(), false);
    assert.strictEqual(globalThis.localStorage.getItem("pvk_sfx_muted"), "false");
  });

  test("toggleMute flips state and returns updated value", () => {
    const sm = new SoundManager();
    assert.strictEqual(sm.isMuted(), false);

    const muted1 = sm.toggleMute();
    assert.strictEqual(muted1, true);
    assert.strictEqual(sm.isMuted(), true);
    assert.strictEqual(globalThis.localStorage.getItem("pvk_sfx_muted"), "true");

    const muted2 = sm.toggleMute();
    assert.strictEqual(muted2, false);
    assert.strictEqual(sm.isMuted(), false);
    assert.strictEqual(globalThis.localStorage.getItem("pvk_sfx_muted"), "false");
  });

  test("notifies listeners on mute change and allows unregistering", () => {
    const sm = new SoundManager();
    const calls: boolean[] = [];
    const unsubscribe = sm.addListener((val) => {
      calls.push(val);
    });

    sm.setMuted(true);
    sm.toggleMute();
    assert.deepStrictEqual(calls, [true, false]);

    unsubscribe();
    sm.setMuted(true);
    // No additional calls after unsubscribe
    assert.deepStrictEqual(calls, [true, false]);
  });

  test("safely handles sound calls when muted (early return with zero node creation)", () => {
    const sm = new SoundManager();
    sm.setMuted(true);

    // None of these should throw or fail
    assert.doesNotThrow(() => {
      sm.playKeystroke(5);
      sm.playTypo();
      sm.playZombieDefeat();
      sm.playTowerShot();
      sm.playHouseBreach();
      sm.playVictory();
      sm.playDefeat();
    });
  });

  test("safely handles Web Audio API node creation when AudioContext is available", () => {
    // Setup minimal AudioContext mock
    let nodesCreated = 0;
    class MockGainNode {
      gain = {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      };
      connect() {}
      disconnect() {}
    }
    class MockOscillatorNode {
      type = "sine";
      frequency = {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      };
      connect() {}
      disconnect() {}
      start() {
        nodesCreated++;
      }
      stop() {}
    }
    class MockBiquadFilterNode {
      type = "lowpass";
      frequency = {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      };
      Q = { setValueAtTime: () => {} };
      connect() {}
      disconnect() {}
    }
    class MockBufferSourceNode {
      buffer: unknown = null;
      connect() {}
      disconnect() {}
      start() {
        nodesCreated++;
      }
      stop() {}
    }
    class MockAudioContext {
      currentTime = 0;
      sampleRate = 44100;
      state = "running";
      destination = {};
      createGain() {
        return new MockGainNode();
      }
      createOscillator() {
        return new MockOscillatorNode();
      }
      createBiquadFilter() {
        return new MockBiquadFilterNode();
      }
      createBuffer(channels: number, length: number) {
        return {
          getChannelData: () => new Float32Array(length),
        };
      }
      createBufferSource() {
        return new MockBufferSourceNode();
      }
      resume() {
        return Promise.resolve();
      }
    }

    (globalThis as unknown as { window: unknown }).window = {
      AudioContext: MockAudioContext,
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    const sm = new SoundManager();
    assert.doesNotThrow(() => {
      sm.playKeystroke(0);
      sm.playKeystroke(15);
      sm.playTypo();
      sm.playZombieDefeat();
      sm.playTowerShot();
      sm.playHouseBreach();
      sm.playVictory();
      sm.playDefeat();
    });

    assert(nodesCreated > 0, "Nodes should have been created and started for procedural sounds");
  });
});
