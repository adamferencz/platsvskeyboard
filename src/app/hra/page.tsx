"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ResultCard } from "@/components/ResultCard";
import { CHAPTERS, ROUNDS_PER_CHAPTER, chapterById } from "@/game/content/curriculum";
import type { RunResult } from "@/game/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { getProgress, saveRun, saveZenPractice } from "@/lib/firestore/runs";
import type { ProgressDoc } from "@/lib/firestore/types";
import { useHotkeys } from "@/lib/useHotkeys";
import { Kbd } from "@/components/Kbd";

const GameMount = dynamic(() => import("@/game/GameMount"), { ssr: false });

export default function GamePage() {
  return (
    <RequireAuth>
      <Suspense fallback={<p className="py-20 text-center text-zinc-400">Načítám…</p>}>
        <Game />
      </Suspense>
    </RequireAuth>
  );
}

function Game() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const chapter = Number(params.get("c") ?? 1);
  const round = Number(params.get("r") ?? 1);
  const isZenFromQuery = params.get("zen") === "1" || params.get("zen") === "true";
  const [zenMode, setZenMode] = useState(isZenFromQuery);
  const valid = !!chapterById(chapter) && round >= 1 && round <= ROUNDS_PER_CHAPTER;

  const [progress, setProgress] = useState<ProgressDoc | null | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [suspicious, setSuspicious] = useState<string | null>(null);

  useEffect(() => {
    const isZen = params.get("zen") === "1" || params.get("zen") === "true";
    setZenMode(isZen);
  }, [params]);

  useEffect(() => {
    if (user) getProgress(user.uid).then(setProgress);
  }, [user, attempt, chapter, round]);

  const toggleZenMode = (enabled: boolean) => {
    setZenMode(enabled);
    const url = enabled
      ? `/hra?c=${chapter}&r=${round}&zen=1`
      : `/hra?c=${chapter}&r=${round}`;
    router.replace(url);
  };

  const onFinished = useCallback(
    async (r: RunResult) => {
      setResult(r);
      if (!user || !profile) return;
      setSaving(true);
      setSaveError(null);
      try {
        if (r.zenMode || zenMode) {
          // Zen režim: ukládá se pouze osobní procvičování do keyStats, nikdy do soutěžních žebříčků
          const out = await saveZenPractice(user.uid, r);
          setProgress(out.progress);
          setSuspicious(null);
        } else {
          const out = await saveRun(user.uid, profile, r);
          setSuspicious(out.suspicious);
        }
      } catch (e) {
        setSaveError((e as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [user, profile, zenMode],
  );

  const locked = progress !== undefined && chapter > (progress?.unlockedChapter ?? 1);
  // na chybových stránkách vede Enter i Esc zpět na mapu
  useHotkeys({ Enter: () => router.push("/"), Escape: () => router.push("/") }, { enabled: !valid || locked });

  if (!valid) {
    return (
      <p className="py-20 text-center">
        Takové kolo neexistuje.{" "}
        <Link href="/" autoFocus className="text-emerald-400 underline">
          Zpět na mapu<Kbd>Enter</Kbd>
        </Link>
      </p>
    );
  }
  if (progress === undefined) return <p className="py-20 text-center text-zinc-400">Načítám postup…</p>;

  if (locked) {
    return (
      <p className="py-20 text-center">
        Tahle kapitola je ještě zamčená.{" "}
        <Link href="/" autoFocus className="text-emerald-400 underline">
          Zpět na mapu<Kbd>Enter</Kbd>
        </Link>
      </p>
    );
  }

  const hasNext = round < ROUNDS_PER_CHAPTER || chapter < CHAPTERS.length;
  const goNext = () => {
    setResult(null);
    const zenQ = zenMode ? "&zen=1" : "";
    if (round < ROUNDS_PER_CHAPTER) router.push(`/hra?c=${chapter}&r=${round + 1}${zenQ}`);
    else router.push(`/hra?c=${chapter + 1}&r=1${zenQ}`);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-white">
            ← Mapa
          </Link>
          <div className="inline-flex rounded-lg bg-zinc-800/80 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => toggleZenMode(false)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                !zenMode
                  ? "bg-zinc-700 font-semibold text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ⚡ Standardní hra
            </button>
            <button
              type="button"
              onClick={() => toggleZenMode(true)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                zenMode
                  ? "bg-emerald-600 font-semibold text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🧘 Zen trénink
            </button>
          </div>
        </div>
        <span>Esc = zpět na mapu · piš rovnou, není potřeba nikam klikat</span>
      </div>

      {!result && (
        <GameMount
          key={`${chapter}-${round}-${attempt}-${zenMode ? "zen" : "std"}`}
          chapter={chapter}
          round={round}
          keyStats={progress?.keyStats ?? {}}
          playerCpm={progress?.bestCpm ?? 0}
          zenMode={zenMode}
          onFinished={onFinished}
          onExit={() => router.push("/")}
        />
      )}

      {result && (
        <ResultCard
          result={result}
          saving={saving}
          saveError={saveError}
          suspicious={suspicious}
          hasNext={hasNext}
          onRetry={() => {
            setResult(null);
            setSuspicious(null);
            setAttempt((a) => a + 1);
          }}
          onNext={goNext}
          onMap={() => router.push("/")}
        />
      )}
    </div>
  );
}
