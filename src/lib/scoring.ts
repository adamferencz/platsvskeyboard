/**
 * Metriky psaní. České konvence: hrubé úhozy, čisté úhozy (penalizace za chybu), ČÚ/min.
 */

export const ERROR_PENALTY = 10; // úhozů za chybu (starší státní norma; ZAV používá 50)

export interface RunMetrics {
  /** správně napsané znaky (hrubé úhozy) */
  correct: number;
  /** chybné úhozy */
  errors: number;
  durationMs: number;
}

/** Hrubé úhozy za minutu. */
export function grossCpm({ correct, durationMs }: RunMetrics): number {
  if (durationMs <= 0) return 0;
  return Math.round((correct / durationMs) * 60000);
}

/** Čisté úhozy za minutu = (hrubé − penalizace × chyby) / min, nikdy pod 0. */
export function netCpm({ correct, errors, durationMs }: RunMetrics): number {
  if (durationMs <= 0) return 0;
  const net = Math.max(0, correct - errors * ERROR_PENALTY);
  return Math.round((net / durationMs) * 60000);
}

/** Přesnost v %, 0–100. */
export function accuracy({ correct, errors }: RunMetrics): number {
  const total = correct + errors;
  return total === 0 ? 100 : Math.round((correct / total) * 1000) / 10;
}

/** Hvězdičky za kolo: 3 při přesnosti ≥ 97 %, 2 při ≥ 90 %, jinak 1 (jen když vyhrál). */
export function stars(won: boolean, acc: number): 0 | 1 | 2 | 3 {
  if (!won) return 0;
  if (acc >= 97) return 3;
  if (acc >= 90) return 2;
  return 1;
}

/**
 * Jednoduchá heuristika podezřelého běhu (bez serveru; viz OTAZKY C1).
 * Vrací důvod, nebo null.
 */
export function suspicionReason(m: RunMetrics & { cpm: number; intervalsMs: number[] }): string | null {
  if (m.cpm > 700) return `nereálná rychlost ${m.cpm} úhozů/min`;
  if (m.intervalsMs.length >= 20) {
    const mean = m.intervalsMs.reduce((a, b) => a + b, 0) / m.intervalsMs.length;
    const variance = m.intervalsMs.reduce((a, b) => a + (b - mean) ** 2, 0) / m.intervalsMs.length;
    const sd = Math.sqrt(variance);
    if (sd < 8) return `strojově pravidelné úhozy (sd ${sd.toFixed(1)} ms)`;
    if (mean < 40) return `průměrný interval ${mean.toFixed(0)} ms`;
  }
  if (m.correct >= 60 && m.errors === 0 && m.cpm > 400) return "bez jediné chyby při vysoké rychlosti";
  return null;
}
