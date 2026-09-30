"use client";

import type { RunResult } from "@/game/types";

interface Props {
  result: RunResult;
  saving: boolean;
  saveError: string | null;
  suspicious: string | null;
  hasNext: boolean;
  onRetry: () => void;
  onNext: () => void;
  onMap: () => void;
}

export function ResultCard({ result, saving, saveError, suspicious, hasNext, onRetry, onNext, onMap }: Props) {
  const worst = Object.entries(result.keyStats)
    .filter(([, s]) => s.misses > 0)
    .sort((a, b) => b[1].misses - a[1].misses)
    .slice(0, 4);

  return (
    <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{result.won ? "Kolo vyhráno!" : "Zombíci prošli…"}</h2>
        <div className="text-3xl text-yellow-400" aria-label={`${result.stars} hvězdičky`}>
          {"★".repeat(result.stars)}
          <span className="text-white/20">{"★".repeat(3 - result.stars)}</span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Čisté úhozy/min" value={result.netCpm} />
        <Stat label="Hrubé úhozy/min" value={result.cpm} />
        <Stat label="Přesnost" value={`${result.accuracy} %`} />
        <Stat label="Body" value={result.score} />
        <Stat label="Zabito" value={result.kills} />
        <Stat label="Max. kombo" value={result.maxCombo} />
        <Stat label="Chyby" value={result.errors} />
        <Stat label="Čas" value={`${Math.round(result.durationMs / 1000)} s`} />
      </dl>

      {worst.length > 0 && (
        <p className="mt-4 text-sm text-zinc-300">
          Nejvíc chyb:{" "}
          {worst.map(([k, s]) => (
            <span key={k} className="mr-2 inline-block rounded bg-zinc-800 px-2 py-0.5 font-mono">
              {k} <span className="text-red-400">{s.misses}×</span>
            </span>
          ))}
        </p>
      )}

      {suspicious && (
        <p className="mt-3 rounded bg-amber-900/50 p-2 text-sm text-amber-200">
          Tento běh vypadá podezřele ({suspicious}), do žebříčku se nepočítá.
        </p>
      )}
      {saving && <p className="mt-3 text-sm text-zinc-400">Ukládám…</p>}
      {saveError && <p className="mt-3 text-sm text-red-400">Uložení selhalo: {saveError}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onRetry} className="rounded-lg bg-zinc-700 px-4 py-2 font-medium hover:bg-zinc-600">
          Znovu
        </button>
        {result.won && hasNext && (
          <button onClick={onNext} className="rounded-lg bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500">
            Další kolo →
          </button>
        )}
        <button onClick={onMap} className="rounded-lg bg-zinc-800 px-4 py-2 font-medium hover:bg-zinc-700">
          Mapa
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-zinc-800 p-3">
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
