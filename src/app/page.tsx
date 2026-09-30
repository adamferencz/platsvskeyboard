"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { CHAPTERS, ROUNDS_PER_CHAPTER, levelId } from "@/game/content/curriculum";
import { useAuth } from "@/lib/auth/AuthContext";
import { getProgress } from "@/lib/firestore/runs";
import type { ProgressDoc } from "@/lib/firestore/types";
import { gradeForCompletion } from "@/lib/grading";

export default function HomePage() {
  const { access } = useAuth();
  if (access === "anonymous") return <Landing />;
  return (
    <RequireAuth>
      <LevelMap />
    </RequireAuth>
  );
}

function Landing() {
  return (
    <div className="py-16 text-center">
      <div className="mb-4 text-6xl" aria-hidden>
        🧟‍♂️⌨️🌱
      </div>
      <h1 className="mb-3 text-4xl font-bold">Plants vs. Keyboard</h1>
      <p className="mx-auto mb-8 max-w-xl text-zinc-300">
        Nauč se psát všemi deseti tím, že budeš bránit školu před zombíky. Každý zombík nese písmeno nebo slovo — napiš ho a je po něm.
        Žebříček školy, tříd a na konci možnost nechat si to oznámkovat.
      </p>
      <Link href="/prihlaseni" className="rounded-lg bg-emerald-600 px-6 py-3 text-lg font-semibold hover:bg-emerald-500">
        Přihlásit se školním účtem
      </Link>
    </div>
  );
}

function LevelMap() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressDoc | null | undefined>(undefined);

  useEffect(() => {
    if (user) getProgress(user.uid).then(setProgress);
  }, [user]);

  if (progress === undefined) return <p className="py-20 text-center text-zinc-400">Načítám postup…</p>;

  const completion = progress?.courseCompletion ?? 0;
  const unlocked = progress?.unlockedChapter ?? 1;
  const grade = gradeForCompletion(completion);
  const regions = [...new Set(CHAPTERS.map((c) => c.region))];

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Mapa Klávesvěta</h1>
            <p className="text-sm text-zinc-400">
              Kurz splněn na <b className="text-white">{completion} %</b>
              {grade ? (
                <>
                  {" "}
                  · aktuálně by ti vyšla známka <b className="text-white">{grade}</b>
                </>
              ) : (
                " · na známku je potřeba 10 %"
              )}
              {progress && (
                <>
                  {" "}
                  · nejlepší {progress.bestNetCpm} čistých úhozů/min
                </>
              )}
            </p>
          </div>
          <Link href="/profil" className="text-sm text-emerald-400 hover:underline">
            Profil a známka →
          </Link>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${completion}%` }} />
        </div>
      </div>

      {regions.map((region) => (
        <section key={region} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-zinc-200">{region}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CHAPTERS.filter((c) => c.region === region).map((ch) => {
              const locked = ch.id > unlocked;
              const stars = Array.from({ length: ROUNDS_PER_CHAPTER }, (_, i) => progress?.levels[levelId(ch.id, i + 1)]?.stars ?? 0);
              const total = stars.reduce<number>((a, b) => a + b, 0);
              return (
                <div key={ch.id} className={`rounded-xl border p-4 ${locked ? "border-white/5 bg-zinc-900/40 opacity-60" : "border-white/10 bg-zinc-900"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Kapitola {ch.id} {ch.gate && "· brána"}
                      </div>
                      <div className="font-semibold">{ch.name}</div>
                    </div>
                    <div className="text-sm text-yellow-400">
                      {total}/{ROUNDS_PER_CHAPTER * 3} ★
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {stars.map((s, i) => {
                      const round = i + 1;
                      const roundLocked = locked || (round > 1 && stars[i - 1] === 0);
                      return roundLocked ? (
                        <span key={round} className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-800 text-xs text-zinc-500" title="Zamčeno">
                          {round === ROUNDS_PER_CHAPTER ? "👑" : "🔒"}
                        </span>
                      ) : (
                        <Link
                          key={round}
                          href={`/hra?c=${ch.id}&r=${round}`}
                          className={`flex h-9 w-9 flex-col items-center justify-center rounded-md text-xs font-semibold hover:bg-emerald-600 ${s > 0 ? "bg-emerald-800" : "bg-zinc-700"}`}
                          title={round === ROUNDS_PER_CHAPTER ? "Boss" : `Kolo ${round}`}
                        >
                          <span>{round === ROUNDS_PER_CHAPTER ? "👑" : round}</span>
                          <span className="text-[9px] leading-none text-yellow-300">{"★".repeat(s)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
