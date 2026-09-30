"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMyGrade, requestGrade } from "@/lib/firestore/grades";
import { getProgress } from "@/lib/firestore/runs";
import type { GradeDoc, Layout, ProgressDoc } from "@/lib/firestore/types";
import { updateUserProfile } from "@/lib/firestore/user";
import { GRADE_THRESHOLDS, gradeForCompletion, nextGradeThreshold } from "@/lib/grading";
import { TRACK_LENGTH, classId, schoolYearKey, type Track } from "@/lib/schoolYear";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Profile />
    </RequireAuth>
  );
}

function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [progress, setProgress] = useState<ProgressDoc | null>(null);
  const [grade, setGrade] = useState<GradeDoc | null>(null);
  const [name, setName] = useState(profile?.displayName ?? "");
  const [track, setTrack] = useState<Track | "">(profile?.track ?? "");
  const [gradYear, setGradYear] = useState<string>(profile?.gradYear ? String(profile.gradYear) : "");
  const [layout, setLayout] = useState<Layout>(profile?.layout ?? "qwertz");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProgress(user.uid).then(setProgress);
    getMyGrade(user.uid).then(setGrade);
  }, [user]);

  useEffect(() => {
    if (profile) {
      setName(profile.displayName);
      setTrack(profile.track ?? "");
      setGradYear(profile.gradYear ? String(profile.gradYear) : "");
      setLayout(profile.layout);
    }
  }, [profile]);

  if (!user || !profile) return null;
  const year = schoolYearKey();
  const completion = progress?.courseCompletion ?? 0;
  const offered = gradeForCompletion(completion);
  const next = nextGradeThreshold(completion);
  const cls = classId(gradYear ? Number(gradYear) : null, (track || null) as Track | null, year);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await updateUserProfile(user!.uid, {
        displayName: name.trim() || profile!.displayName,
        track: (track || null) as Track | null,
        gradYear: gradYear ? Number(gradYear) : null,
        layout,
      });
      await refreshProfile();
      setMsg("Uloženo.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function claim() {
    setBusy(true);
    setMsg(null);
    try {
      await requestGrade(user!.uid, { ...profile!, displayName: name, track: (track || null) as Track | null, gradYear: gradYear ? Number(gradYear) : null }, completion);
      setGrade(await getMyGrade(user!.uid));
      setMsg("Žádost odeslána, učitel ji uvidí ve své správě.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
        <h1 className="mb-4 text-xl font-bold">Profil</h1>
        <div className="space-y-4 text-sm">
          <Field label="E-mail">
            <span className="text-zinc-300">{profile.email}</span>
          </Field>
          <Field label="Jméno v žebříčku">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </Field>
          <Field label="Rok maturity" hint="Z e-mailu se doplní sám (2027anovak → 2027).">
            <input value={gradYear} onChange={(e) => setGradYear(e.target.value.replace(/\D/g, "").slice(0, 4))} className="input w-28" inputMode="numeric" />
          </Field>
          <Field label="Studium" hint="A = osmileté, C a D = čtyřleté. Podle toho se spočítá třída.">
            <select value={track} onChange={(e) => setTrack(e.target.value as Track | "")} className="input w-56">
              <option value="">— vyber —</option>
              {(Object.keys(TRACK_LENGTH) as Track[]).map((t) => (
                <option key={t} value={t}>
                  {t} ({TRACK_LENGTH[t]}leté)
                </option>
              ))}
            </select>
            {cls && <span className="ml-3 text-zinc-300">→ letos {cls}</span>}
          </Field>
          <Field label="Klávesnice" hint="Hra čte znaky, které skutečně píšeš; nastavení ovlivní jen nápovědu prstokladu.">
            <select value={layout} onChange={(e) => setLayout(e.target.value as Layout)} className="input w-56">
              <option value="qwertz">Česká QWERTZ</option>
              <option value="qwerty">Česká QWERTY (prohozené Z/Y)</option>
            </select>
          </Field>
          <button onClick={() => void save()} disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50">
            Uložit
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
        <h2 className="mb-4 text-xl font-bold">Známka za školní rok {year}</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <Tile label="Kurz splněn" value={`${completion} %`} />
          <Tile label="Vyšla by známka" value={offered ?? "—"} />
          <Tile label="Nejlepší čisté úhozy/min" value={progress?.bestNetCpm ?? 0} />
          <Tile label="Odehraná kola" value={progress?.totalRuns ?? 0} />
        </div>

        <table className="mb-4 w-full text-sm">
          <tbody>
            {GRADE_THRESHOLDS.map((t) => (
              <tr key={t.grade} className={offered === t.grade ? "text-emerald-400" : "text-zinc-400"}>
                <td className="py-0.5">od {t.min} %</td>
                <td className="py-0.5 text-right font-semibold">známka {t.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {next && (
          <p className="mb-4 text-sm text-zinc-400">
            Do známky {next.grade} chybí {Math.max(0, Math.round((next.min - completion) * 10) / 10)} %.
          </p>
        )}

        {grade?.locked ? (
          <p className="rounded-lg bg-emerald-900/40 p-3 text-sm text-emerald-200">
            Známka <b>{grade.gradeOffered}</b> byla zapsána do předmětu <b>{grade.subject}</b> ({grade.recordedBy}). Letos už další žádost nejde.
          </p>
        ) : grade?.status === "requested" ? (
          <p className="rounded-lg bg-amber-900/40 p-3 text-sm text-amber-200">
            Žádost o známku <b>{grade.gradeOffered}</b> (za {grade.completionAtClaim} %) čeká na učitele.
          </p>
        ) : (
          <div className="space-y-2">
            {grade?.status === "rejected" && <p className="text-sm text-red-300">Poslední žádost učitel zamítl. Můžeš požádat znovu.</p>}
            <button
              onClick={() => void claim()}
              disabled={busy || !offered}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              Požádat o zapsání známky {offered ?? ""}
            </button>
            <p className="text-xs text-zinc-500">Je to dobrovolné. Po zapsání se možnost na tento školní rok zamkne.</p>
          </div>
        )}
        {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
      </section>

      <style jsx global>{`
        .input {
          border-radius: 0.5rem;
          border: 1px solid rgb(255 255 255 / 0.15);
          background: rgb(9 9 11);
          padding: 0.4rem 0.6rem;
          color: white;
        }
        .input:focus {
          outline: none;
          border-color: rgb(16 185 129);
        }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="flex items-center">{children}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-zinc-800 p-3">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
