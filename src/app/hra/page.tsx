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
import { getProgress, saveRun } from "@/lib/firestore/runs";
import type { ProgressDoc } from "@/lib/firestore/types";

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
  const valid = !!chapterById(chapter) && round >= 1 && round <= ROUNDS_PER_CHAPTER;

  const [progress, setProgress] = useState<ProgressDoc | null | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [suspicious, setSuspicious] = useState<string | null>(null);

  useEffect(() => {
    if (user) getProgress(user.uid).then(setProgress);
  }, [user, attempt, chapter, round]);

  const onFinished = useCallback(
    async (r: RunResult) => {
      setResult(r);
      if (!user || !profile) return;
      setSaving(true);
      setSaveError(null);
      try {
        const out = await saveRun(user.uid, profile, r);
        setSuspicious(out.suspicious);
      } catch (e) {
        setSaveError((e as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [user, profile],
  );

  if (!valid) {
    return (
      <p className="py-20 text-center">
        Takové kolo neexistuje. <Link href="/" className="text-emerald-400 underline">Zpět na mapu</Link>
      </p>
    );
  }
  if (progress === undefined) return <p className="py-20 text-center text-zinc-400">Načítám postup…</p>;

  const locked = chapter > (progress?.unlockedChapter ?? 1);
  if (locked) {
    return (
      <p className="py-20 text-center">
        Tahle kapitola je ještě zamčená. <Link href="/" className="text-emerald-400 underline">Zpět na mapu</Link>
      </p>
    );
  }

  const hasNext = round < ROUNDS_PER_CHAPTER || chapter < CHAPTERS.length;
  const goNext = () => {
    setResult(null);
    if (round < ROUNDS_PER_CHAPTER) router.push(`/hra?c=${chapter}&r=${round + 1}`);
    else router.push(`/hra?c=${chapter + 1}&r=1`);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-zinc-400">
        <Link href="/" className="hover:text-white">
          ← Mapa
        </Link>
        <span>Esc = zpět na mapu · piš rovnou, není potřeba nikam klikat</span>
      </div>

      {!result && (
        <GameMount
          key={`${chapter}-${round}-${attempt}`}
          chapter={chapter}
          round={round}
          keyStats={progress?.keyStats ?? {}}
          playerCpm={progress?.bestCpm ?? 0}
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
