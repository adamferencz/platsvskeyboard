"use client";

/**
 * Čas hraní na profilu: dlaždice (dnes, tento týden, celkem, dní v řadě)
 * a kalendář posledních týdnů — čtvereček = den, sytější zelená = víc minut.
 */
import { useEffect, useMemo, useState } from "react";
import { dayKey, getActivity, type ActivityByDay } from "@/lib/firestore/activity";

/** kolik týdnů kalendář ukazuje (~půl roku) */
const WEEKS = 26;
const DAY_LABELS = ["Po", "", "St", "", "Pá", "", ""];
const MONTHS = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];
const WEEKDAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** pondělí týdne, ve kterém je datum d (o půlnoci) */
function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** barva čtverečku podle odehraných minut */
function levelClass(min: number): string {
  if (min <= 0) return "bg-zinc-800";
  // odstíny volené tak, aby šly po sobě i ve světlém režimu (theme-light.css je přemapuje)
  if (min < 3) return "bg-emerald-900";
  if (min < 10) return "bg-emerald-800";
  if (min < 20) return "bg-emerald-500";
  return "bg-emerald-300";
}

export function PlayCalendar({ uid, totalMinutes }: { uid: string; totalMinutes: number }) {
  const [activity, setActivity] = useState<ActivityByDay | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const start = useMemo(() => addDays(mondayOf(today), -7 * (WEEKS - 1)), [today]);

  useEffect(() => {
    getActivity(uid, start)
      .then(setActivity)
      .catch((e: Error) => setError(e.message));
  }, [uid, start]);

  const weeks = useMemo(() => {
    const out: Date[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      out.push(Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
    }
    return out;
  }, [start]);

  const todayKey = dayKey(today);
  const at = (d: Date) => activity?.[dayKey(d)];

  const todayMin = at(today)?.minutes ?? 0;
  const weekMin = Array.from({ length: 7 }, (_, i) => at(addDays(mondayOf(today), i))?.minutes ?? 0).reduce((a, b) => a + b, 0);

  // dní v řadě: počítá se od dneška zpět; když dnes ještě nehrál, série od včerejška pořád platí
  let streak = 0;
  for (let d = at(today) ? today : addDays(today, -1); at(d); d = addDays(d, -1)) streak++;

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <h2 className="mb-4 text-xl font-bold">Čas hraní</h2>

      <div className="mb-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Tile label="Dnes" value={activity ? formatMinutes(todayMin) : "…"} />
        <Tile label="Tento týden" value={activity ? formatMinutes(weekMin) : "…"} />
        <Tile label="Celkem" value={formatMinutes(totalMinutes)} />
        <Tile label="Dní v řadě" value={activity ? `${streak} 🔥` : "…"} />
      </div>

      {error ? (
        <p className="text-sm text-red-400">Kalendář se nepodařilo načíst: {error}</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-flex gap-[3px]">
            {/* popisky dnů v týdnu */}
            <div className="mr-1 flex flex-col gap-[3px] pt-4 text-[10px] text-zinc-500">
              {DAY_LABELS.map((l, i) => (
                <div key={i} className="h-3 leading-3">
                  {l}
                </div>
              ))}
            </div>
            {weeks.map((days, w) => {
              const first = days[0];
              // název měsíce nad týdnem, ve kterém měsíc začíná
              const showMonth = w === 0 || days.some((d) => d.getDate() === 1);
              const monthDay = days.find((d) => d.getDate() === 1) ?? first;
              return (
                <div key={w} className="flex w-3 flex-col gap-[3px]">
                  <div className="h-4 text-[10px] leading-4 text-zinc-500 whitespace-nowrap">
                    {showMonth ? MONTHS[monthDay.getMonth()] : ""}
                  </div>
                  {days.map((d) => {
                    const key = dayKey(d);
                    const a = activity?.[key];
                    const future = d > today && key !== todayKey;
                    const label = `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.: ${
                      a ? `${a.runs} ${a.runs === 1 ? "kolo" : a.runs < 5 ? "kola" : "kol"}, ${formatMinutes(a.minutes)}` : "nehráno"
                    }`;
                    return (
                      <div
                        key={key}
                        title={future ? undefined : label}
                        className={`h-3 w-3 rounded-sm ${
                          future ? "bg-transparent" : levelClass(a?.minutes ?? 0)
                        } ${key === todayKey ? "ring-1 ring-white/60" : ""}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500">
            méně
            {[0, 1, 5, 15, 30].map((m) => (
              <span key={m} className={`h-3 w-3 rounded-[3px] ${levelClass(m)}`} />
            ))}
            více
          </div>
        </div>
      )}
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-800 p-3">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
