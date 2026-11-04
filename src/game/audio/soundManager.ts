/**
 * Procedurální zvukový syntezátor pro Plants vs. Keyboard (Web Audio API).
 * Nevyžaduje žádné externí zvukové soubory — nulová latence, nulové síťové požadavky.
 *
 * Podporuje zvuky:
 * - úhoz klávesy (snappy mechanický klik s jemnou modulací podle komba)
 * - překlep (sestupný sawtooth bonk)
 * - zničení zombíka (bublinový pop + šplouchnutí)
 * - výstřel věže (peashooter chirp 600Hz -> 160Hz)
 * - vniknutí do domu (hluboký varovný úder + tříštění skla)
 * - vítězná fanfára (vzestupné arpeggio C4 -> E4 -> G4 -> C5)
 * - prohra (sestupné smutné arpeggio E4 -> C4 -> A3 -> F#3)
 *
 * Mute stav je perzistován v localStorage pod klíčem "pvk_sfx_muted".
 */

type MuteListener = (muted: boolean) => void;
export type VolumeListener = (volume: number) => void;

export class SoundManager {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted: boolean = false;
  private volume: number = 0.65;
  private masterGain: GainNode | null = null;
  private listeners = new Set<MuteListener>();
  private volumeListeners = new Set<VolumeListener>();
  private unlocked = false;

  constructor() {
    this.muted = this.loadMuted();
    this.volume = this.loadVolume();
    if (typeof window !== "undefined") {
      this.setupAutoUnlock();
    }
  }

  /**
   * Zjistí, zda je zvuk ztlumen.
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Nastaví stav ztlumení a uloží do localStorage.
   */
  setMuted(muted: boolean): void {
    if (this.muted === muted) return;
    this.muted = muted;
    this.saveMuted(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
    this.notifyListeners();
  }

  /**
   * Přepne stav ztlumení (vrací nový stav).
   */
  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Získá aktuálně nastavenou hlasitost (0.0 až 1.0).
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Nastaví hlasitost efektů (0.0 až 1.0) a uloží ji do localStorage.
   */
  setVolume(v: number): void {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.65));
    this.volume = clamped;
    this.saveVolume(clamped);

    if (clamped === 0) {
      if (!this.muted) {
        this.setMuted(true);
      }
    } else {
      if (this.muted) {
        this.setMuted(false);
      } else if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      }
    }
    this.notifyVolumeListeners();
  }

  /**
   * Registrace posluchače změn ztlumení (vrací odhlašovací funkci).
   */
  addListener(fn: MuteListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Registrace posluchače změn hlasitosti (vrací odhlašovací funkci).
   */
  addVolumeListener(fn: VolumeListener): () => void {
    this.volumeListeners.add(fn);
    return () => this.volumeListeners.delete(fn);
  }

  private notifyListeners(): void {
    for (const fn of this.listeners) {
      try {
        fn(this.muted);
      } catch (err) {
        console.error("Chyba v SoundManager listeneru:", err);
      }
    }
  }

  private notifyVolumeListeners(): void {
    for (const fn of this.volumeListeners) {
      try {
        fn(this.volume);
      } catch (err) {
        console.error("Chyba v SoundManager volume listeneru:", err);
      }
    }
  }

  private loadMuted(): boolean {
    if (typeof localStorage === "undefined") return false;
    try {
      return localStorage.getItem("pvk_sfx_muted") === "true";
    } catch {
      return false;
    }
  }

  private saveMuted(muted: boolean): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem("pvk_sfx_muted", String(muted));
    } catch {
      // ignore security/quota errors
    }
  }

  private loadVolume(): number {
    if (typeof localStorage === "undefined") return 0.65;
    try {
      const v = localStorage.getItem("pvk_sfx_volume");
      if (v === null) return 0.65;
      const num = parseFloat(v);
      return isNaN(num) ? 0.65 : Math.max(0, Math.min(1, num));
    } catch {
      return 0.65;
    }
  }

  private saveVolume(volume: number): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem("pvk_sfx_volume", String(volume));
    } catch {
      // ignore security/quota errors
    }
  }

  /**
   * Inicializuje AudioContext na první interakci uživatele (autoplay policy).
   */
  private setupAutoUnlock(): void {
    const unlock = () => {
      this.ensureContext();
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      this.unlocked = true;
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("keydown", unlock, { once: true, passive: true });
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
  }

  /**
   * Zajištění běžícího AudioContextu.
   */
  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Generuje a kešuje 1sekundový šumový buffer pro mechanické a perkusní efekty.
   */
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate, sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < sampleRate; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  // ==========================================
  // PROCEDURÁLNÍ ZVUKOVÉ EFEKTY
  // ==========================================

  /**
   * 1. Úhoz klávesy (playKeystroke)
   * Snappy mechanický clack (15-18ms) s mírným vzestupem výšky při vyšším kombu.
   */
  playKeystroke(combo: number = 0): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const duration = 0.016;

    // A) Mechanický klik (vysokofrekvenční šumový transient)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(3200, t);
    noiseFilter.Q.setValueAtTime(2.5, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.16, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + duration);

    // B) Rezonanční tělo klávesy s jemným stoupáním tónu při kombu
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    const baseFreq = 480 + Math.min(combo, 30) * 12;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + duration);

    oscGain.gain.setValueAtTime(0.12, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);

    // Automatický úklid
    setTimeout(() => {
      noise.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
      osc.disconnect();
      oscGain.disconnect();
    }, (duration + 0.05) * 1000);
  }

  /**
   * 2. Překlep (playTypo)
   * Sestupný sawtooth bonk (180Hz -> 80Hz, 90ms).
   */
  playTypo(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const duration = 0.09;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + duration);

    // Lowpass filtr pro změkčení příliš ostrého sawtooth tónu na dutý bonk
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(520, t);
    filter.Q.setValueAtTime(3, t);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);

    setTimeout(() => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    }, (duration + 0.05) * 1000);
  }

  /**
   * 3. Zničení zombíka (playZombieDefeat)
   * Šťavnaté prasknutí bubliny + šplouchnutí / noise burst (120ms).
   */
  playZombieDefeat(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const duration = 0.12;

    // A) Bublinový pop (sine sweep nahoru a mírně dolů)
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();

    popOsc.type = "sine";
    popOsc.frequency.setValueAtTime(240, t);
    popOsc.frequency.exponentialRampToValueAtTime(620, t + 0.035);
    popOsc.frequency.exponentialRampToValueAtTime(160, t + duration);

    popGain.gain.setValueAtTime(0.22, t);
    popGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    popOsc.connect(popGain);
    popGain.connect(this.masterGain);

    popOsc.start(t);
    popOsc.stop(t + duration);

    // B) Šplouchnutí (filtrovaný šum)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(950, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(350, t + duration);
    noiseFilter.Q.setValueAtTime(2, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.14, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + duration);

    setTimeout(() => {
      popOsc.disconnect();
      popGain.disconnect();
      noise.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    }, (duration + 0.05) * 1000);
  }

  /**
   * 4. Výstřel věže (playTowerShot)
   * Peashooter chirp (600Hz -> 160Hz, 70ms).
   */
  playTowerShot(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const duration = 0.07;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + duration);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);

    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
    }, (duration + 0.05) * 1000);
  }

  /**
   * 5. Vniknutí do domu (playHouseBreach)
   * Hluboký varovný úder (thud) + tříštění skla (280ms).
   */
  playHouseBreach(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const duration = 0.28;

    // A) Hluboký úder (thud)
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();

    thudOsc.type = "sine";
    thudOsc.frequency.setValueAtTime(140, t);
    thudOsc.frequency.exponentialRampToValueAtTime(36, t + 0.24);

    thudGain.gain.setValueAtTime(0.38, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    thudOsc.connect(thudGain);
    thudGain.connect(this.masterGain);

    thudOsc.start(t);
    thudOsc.stop(t + 0.24);

    // B) Tříštění skla (vysokofrekvenční křaplavý šum)
    const shatter = ctx.createBufferSource();
    shatter.buffer = this.getNoiseBuffer(ctx);

    const shatterFilter = ctx.createBiquadFilter();
    shatterFilter.type = "highpass";
    shatterFilter.frequency.setValueAtTime(2400, t);
    shatterFilter.Q.setValueAtTime(3.5, t);

    const shatterGain = ctx.createGain();
    shatterGain.gain.setValueAtTime(0.22, t);
    shatterGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    shatter.connect(shatterFilter);
    shatterFilter.connect(shatterGain);
    shatterGain.connect(this.masterGain);

    shatter.start(t);
    shatter.stop(t + duration);

    setTimeout(() => {
      thudOsc.disconnect();
      thudGain.disconnect();
      shatter.disconnect();
      shatterFilter.disconnect();
      shatterGain.disconnect();
    }, (duration + 0.05) * 1000);
  }

  /**
   * 6. Vítězná fanfára (playVictory)
   * Vzestupné jasné arpeggio (C4 -> E4 -> G4 -> C5).
   */
  playVictory(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const notes = [
      { freq: 261.63, start: 0.0, dur: 0.12 }, // C4
      { freq: 329.63, start: 0.1, dur: 0.12 }, // E4
      { freq: 392.0, start: 0.2, dur: 0.14 }, // G4
      { freq: 523.25, start: 0.32, dur: 0.55 }, // C5
    ];

    const baseTime = ctx.currentTime;

    for (const n of notes) {
      const t = baseTime + n.start;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + n.dur);

      setTimeout(() => {
        osc.disconnect();
        gain.disconnect();
      }, (n.start + n.dur + 0.1) * 1000);
    }
  }

  /**
   * 7. Prohra (playDefeat)
   * Sestupné melancholické arpeggio (E4 -> C4 -> A3 -> F#3).
   */
  playDefeat(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const notes = [
      { freq: 329.63, start: 0.0, dur: 0.14 }, // E4
      { freq: 261.63, start: 0.13, dur: 0.14 }, // C4
      { freq: 220.0, start: 0.26, dur: 0.16 }, // A3
      { freq: 185.0, start: 0.4, dur: 0.6 }, // F#3
    ];

    const baseTime = ctx.currentTime;

    for (const n of notes) {
      const t = baseTime + n.start;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(n.freq, t);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(500, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + n.dur);

      setTimeout(() => {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      }, (n.start + n.dur + 0.1) * 1000);
    }
  }

  /**
   * 8. Milník komba (playComboMilestone)
   * Rychlé třpytivé vzestupné arpeggio (sine/triangle) oslavující sérii správně napsaných slov (5, 10, 20...).
   */
  playComboMilestone(milestone: number = 5): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const baseTime = ctx.currentTime;
    const notes =
      milestone >= 20
        ? [
            { freq: 783.99, start: 0.0, dur: 0.12 }, // G5
            { freq: 1046.5, start: 0.06, dur: 0.12 }, // C6
            { freq: 1318.5, start: 0.12, dur: 0.14 }, // E6
            { freq: 1567.98, start: 0.18, dur: 0.28 }, // G6
          ]
        : milestone >= 10
        ? [
            { freq: 659.25, start: 0.0, dur: 0.11 }, // E5
            { freq: 880.0, start: 0.07, dur: 0.12 }, // A5
            { freq: 1108.73, start: 0.14, dur: 0.24 }, // C#6
          ]
        : [
            { freq: 587.33, start: 0.0, dur: 0.1 }, // D5
            { freq: 880.0, start: 0.07, dur: 0.2 }, // A5
          ];

    for (const n of notes) {
      const t = baseTime + n.start;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + n.dur);

      setTimeout(() => {
        osc.disconnect();
        gain.disconnect();
      }, (n.start + n.dur + 0.05) * 1000);
    }
  }
  /**
   * Krátký výstražný tón při kritickém přiblížení zombíka k domu.
   */
  playDangerWarning(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.22);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);

    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
    }, 300);
  }
}
export const soundManager = new SoundManager();
