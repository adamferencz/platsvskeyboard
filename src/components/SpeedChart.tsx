/**
 * Graf rychlosti během kola: správné úhozy/min v čase (klouzavé okno, odpovídá hrubým úhozům/min)
 * a červené tečky v místech chyb. Data bere z RunResult.keystrokes ([čas ms od začátku, 1 = správně / 0 = chyba]).
 */

const VIEW_W = 600;
const VIEW_H = 150;
const PAD = { left: 36, right: 10, top: 12, bottom: 22 };
/** šířka okna pro výpočet okamžité rychlosti */
const WINDOW_MS = 5000;
/** krok vzorkování křivky */
const STEP_MS = 500;

export interface SpeedPoint {
  t: number;
  cpm: number;
}

/**
 * Okamžitá rychlost: kolik správných úhozů padlo za posledních WINDOW_MS, přepočteno na minutu.
 * Začíná prvním úhozem — čekání na první zombíky by jinak dělalo na začátku grafu nulu.
 */
export function speedSeries(keystrokes: [number, 0 | 1][], durationMs: number): SpeedPoint[] {
  const start = keystrokes[0]?.[0] ?? 0;
  const end = Math.max(durationMs, keystrokes.at(-1)?.[0] ?? 0);
  if (end <= start) return [];
  const correctTimes = keystrokes.filter(([, ok]) => ok === 1).map(([t]) => t);
  const points: SpeedPoint[] = [];
  let lo = 0;
  let hi = 0;
  for (let t = start; t <= end + STEP_MS / 2; t += STEP_MS) {
    const at = Math.min(t, end);
    while (hi < correctTimes.length && correctTimes[hi] <= at) hi++;
    while (lo < hi && correctTimes[lo] <= at - WINDOW_MS) lo++;
    // na začátku je okno kratší, ať křivka nezačíná uměle nízko
    const win = Math.max(Math.min(WINDOW_MS, at - start), 3000);
    points.push({ t: at, cpm: ((hi - lo) * 60000) / win });
  }
  return points;
}

export function SpeedChart({
  keystrokes,
  durationMs,
  averageCpm,
}: {
  keystrokes: [number, 0 | 1][];
  durationMs: number;
  averageCpm: number;
}) {
  // i krátká úvodní kola (jednotlivá písmena, ~8 úhozů) mají mít graf
  if (keystrokes.length < 3) return null;

  const series = speedSeries(keystrokes, durationMs);
  if (series.length < 2) return null;
  const start = series[0].t;
  const end = series[series.length - 1].t;
  const peak = Math.max(...series.map((p) => p.cpm), averageCpm, 1);
  const yMax = Math.ceil(peak / 50) * 50;

  const plotW = VIEW_W - PAD.left - PAD.right;
  const plotH = VIEW_H - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - start) / (end - start)) * plotW;
  const y = (cpm: number) => PAD.top + plotH - (cpm / yMax) * plotH;

  const line = series.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.cpm).toFixed(1)}`).join(" ");
  const area = `${line} L${x(end).toFixed(1)},${y(0)} L${x(start)},${y(0)} Z`;

  /** výška křivky v čase t (nejbližší vzorek) — na ni posadíme tečku chyby */
  const cpmAt = (t: number) =>
    series[Math.min(series.length - 1, Math.max(0, Math.round((t - start) / STEP_MS)))].cpm;
  const errors = keystrokes.filter(([, ok]) => ok === 0).map(([t]) => t);

  const best = series.reduce((a, b) => (b.cpm > a.cpm ? b : a));

  return (
    <figure className="mt-4">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <span>Rychlost během kola</span>
        <span className="flex items-center gap-3 font-normal normal-case tracking-normal">
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 bg-emerald-400" /> úhozy/min
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0 w-4 border-t border-dashed border-zinc-400" /> průměr
          </span>
          {errors.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> chyba
            </span>
          )}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full rounded-lg bg-zinc-800"
        role="img"
        aria-label={`Graf rychlosti: průměr ${averageCpm} úhozů za minutu, nejrychleji ${Math.round(best.cpm)}, chyb ${errors.length}`}
      >
        {/* vodorovné čáry mřížky a popisky osy Y */}
        {[0, yMax / 2, yMax].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={VIEW_W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-white/10" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="fill-zinc-400 text-[11px]">
              {v}
            </text>
          </g>
        ))}
        {/* osa X: první úhoz a konec kola (čas od začátku kola) */}
        <text x={PAD.left} y={VIEW_H - 6} className="fill-zinc-400 text-[11px]">
          {Math.round(start / 1000)} s
        </text>
        <text x={VIEW_W - PAD.right} y={VIEW_H - 6} textAnchor="end" className="fill-zinc-400 text-[11px]">
          {Math.round(end / 1000)} s
        </text>

        <path d={area} className="fill-emerald-500/15" />
        <path d={line} fill="none" className="stroke-emerald-400" strokeWidth={2.5} strokeLinejoin="round" />
        <line
          x1={PAD.left}
          x2={VIEW_W - PAD.right}
          y1={y(averageCpm)}
          y2={y(averageCpm)}
          className="stroke-zinc-400"
          strokeWidth={1}
          strokeDasharray="5 4"
        />

        {errors.map((t, i) => (
          <circle key={i} cx={x(t)} cy={y(cpmAt(t))} r={4} className="fill-red-500 stroke-zinc-900" strokeWidth={1.5}>
            <title>{`Chyba v ${(t / 1000).toFixed(1)} s`}</title>
          </circle>
        ))}

        {/* nejrychlejší místo kola */}
        <circle cx={x(best.t)} cy={y(best.cpm)} r={4} className="fill-yellow-300" />
        <text
          x={Math.min(Math.max(x(best.t), PAD.left + 40), VIEW_W - PAD.right - 40)}
          y={Math.max(y(best.cpm) - 8, PAD.top + 8)}
          textAnchor="middle"
          className="fill-yellow-300 text-[11px] font-semibold"
        >
          max {Math.round(best.cpm)}
        </text>
      </svg>
    </figure>
  );
}
