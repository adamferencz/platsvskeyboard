"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchClassIds, fetchLeaderboard } from "@/lib/firestore/leaderboard";
import { LEADERBOARD_FIELDS, type LeaderboardField, type StatsDoc } from "@/lib/firestore/types";
import { classId as computeClassId, schoolYearKey } from "@/lib/schoolYear";

export default function LeaderboardPage() {
  return (
    <RequireAuth>
      <Leaderboard />
    </RequireAuth>
  );
}

function Leaderboard() {
  const { user, profile } = useAuth();
  const year = schoolYearKey();
  const myClass = profile ? computeClassId(profile.gradYear, profile.track, year) : null;
  const [field, setField] = useState<LeaderboardField>("bestNetCpm");
  const [scope, setScope] = useState<string>("");
  const [classes, setClasses] = useState<string[]>([]);
  const [rows, setRows] = useState<StatsDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClassIds(year).then(setClasses).catch(() => setClasses([]));
  }, [year]);

  useEffect(() => {
    setRows(null);
    setError(null);
    fetchLeaderboard(field, { classId: scope || null, year })
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, [field, scope, year]);

  const fmt = (s: StatsDoc) => {
    const v = s[field];
    if (field === "courseCompletion") return `${v} %`;
    if (field === "totalMinutes") return `${Math.round(v)} min`;
    return String(v);
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Žebříček {year}</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(LEADERBOARD_FIELDS) as LeaderboardField[]).map((f) => (
          <button
            key={f}
            onClick={() => setField(f)}
            className={`rounded-full px-4 py-1.5 text-sm ${field === f ? "bg-emerald-600 font-semibold" : "bg-zinc-800 hover:bg-zinc-700"}`}
          >
            {LEADERBOARD_FIELDS[f]}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-400">Rozsah:</span>
        <button onClick={() => setScope("")} className={`rounded-md px-3 py-1 ${scope === "" ? "bg-zinc-700 font-semibold" : "bg-zinc-800 hover:bg-zinc-700"}`}>
          Celá škola
        </button>
        {myClass && (
          <button onClick={() => setScope(myClass)} className={`rounded-md px-3 py-1 ${scope === myClass ? "bg-zinc-700 font-semibold" : "bg-zinc-800 hover:bg-zinc-700"}`}>
            Moje třída ({myClass})
          </button>
        )}
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-md border border-white/15 bg-zinc-950 px-2 py-1">
          <option value="">— jiná třída —</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-400">Chyba: {error}</p>}
      {!rows && !error && <p className="text-zinc-400">Načítám…</p>}
      {rows && rows.length === 0 && <p className="text-zinc-400">Zatím nikdo nehrál. Buď první!</p>}
      {rows && rows.length > 0 && (
        <table className="w-full overflow-hidden rounded-xl border border-white/10 text-sm">
          <thead className="bg-zinc-900 text-left text-zinc-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Jméno</th>
              <th className="px-3 py-2">Třída</th>
              <th className="px-3 py-2 text-right">{LEADERBOARD_FIELDS[field]}</th>
              <th className="hidden px-3 py-2 text-right sm:table-cell">Přesnost</th>
              <th className="hidden px-3 py-2 text-right sm:table-cell">Kol</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.uid} className={`border-t border-white/5 ${s.uid === user?.uid ? "bg-emerald-900/30" : i % 2 ? "bg-zinc-900/40" : ""}`}>
                <td className="px-3 py-2 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{s.displayName}</td>
                <td className="px-3 py-2 text-zinc-400">{s.classId ?? "—"}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt(s)}</td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-zinc-400 sm:table-cell">{s.avgAccuracy} %</td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-zinc-400 sm:table-cell">{s.runs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
