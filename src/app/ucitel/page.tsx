"use client";

import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/firebase/client";
import { listGradeRequests, recordGrade, rejectGrade } from "@/lib/firestore/grades";
import type { AllowedUserDoc, GradeDoc, RunDoc } from "@/lib/firestore/types";
import { schoolYearKey } from "@/lib/schoolYear";

const SUBJECTS = ["IVT", "Informatika", "DIGI", "Písemná a elektronická komunikace", "Jiný"];

export default function TeacherPage() {
  return (
    <RequireAuth roles={["teacher", "admin"]}>
      <Teacher />
    </RequireAuth>
  );
}

function Teacher() {
  const { user, role } = useAuth();
  const [tab, setTab] = useState<"grades" | "suspicious" | "staff">("grades");
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Správa školy</h1>
      <div className="mb-6 flex gap-2 text-sm">
        {(
          [
            ["grades", "Žádosti o známku"],
            ["suspicious", "Podezřelé běhy"],
            ["staff", "Učitelé a výjimky"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 ${tab === k ? "bg-emerald-600 font-semibold" : "bg-zinc-800 hover:bg-zinc-700"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "grades" && <Grades teacherEmail={user?.email ?? ""} />}
      {tab === "suspicious" && <Suspicious />}
      {tab === "staff" && <Staff isAdmin={role === "admin"} />}
    </div>
  );
}

function Grades({ teacherEmail }: { teacherEmail: string }) {
  const [rows, setRows] = useState<(GradeDoc & { id: string })[] | null>(null);
  const [subject, setSubject] = useState<Record<string, string>>({});
  const load = useCallback(() => listGradeRequests(schoolYearKey()).then(setRows), []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!rows) return <p className="text-zinc-400">Načítám…</p>;
  if (rows.length === 0) return <p className="text-zinc-400">Žádné žádosti v tomto školním roce.</p>;

  return (
    <table className="w-full text-sm">
      <thead className="text-left text-zinc-400">
        <tr>
          <th className="py-2">Student</th>
          <th>Třída</th>
          <th className="text-right">Kurz</th>
          <th className="text-right">Známka</th>
          <th>Stav</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((g) => (
          <tr key={g.id} className="border-t border-white/5">
            <td className="py-2">
              <div className="font-medium">{g.displayName}</div>
              <div className="text-xs text-zinc-500">{g.email}</div>
            </td>
            <td>{g.classId ?? "—"}</td>
            <td className="text-right tabular-nums">{g.completionAtClaim} %</td>
            <td className="text-right text-lg font-bold">{g.gradeOffered}</td>
            <td>
              {g.status === "recorded" ? (
                <span className="text-emerald-400">
                  zapsáno · {g.subject} · {g.recordedBy}
                </span>
              ) : g.status === "rejected" ? (
                <span className="text-red-300">zamítnuto</span>
              ) : (
                <span className="text-amber-300">čeká</span>
              )}
            </td>
            <td className="text-right">
              {g.status === "requested" && (
                <div className="flex justify-end gap-2">
                  <select
                    value={subject[g.id] ?? SUBJECTS[0]}
                    onChange={(e) => setSubject({ ...subject, [g.id]: e.target.value })}
                    className="rounded-md border border-white/15 bg-zinc-950 px-2 py-1"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => recordGrade(g.id, teacherEmail, subject[g.id] ?? SUBJECTS[0]).then(load)}
                    className="rounded-md bg-emerald-600 px-3 py-1 font-medium hover:bg-emerald-500"
                  >
                    Zapsáno
                  </button>
                  <button onClick={() => rejectGrade(g.id, teacherEmail).then(load)} className="rounded-md bg-zinc-700 px-3 py-1 hover:bg-zinc-600">
                    Zamítnout
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Suspicious() {
  const [rows, setRows] = useState<(RunDoc & { id: string })[] | null>(null);
  const load = useCallback(async () => {
    const q = query(collection(db, "runs"), where("suspicious", "!=", null), orderBy("suspicious"), limit(50));
    const snap = await getDocs(q);
    setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as RunDoc) })));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!rows) return <p className="text-zinc-400">Načítám…</p>;
  if (rows.length === 0) return <p className="text-zinc-400">Nic podezřelého. Heuristiky: nereálná rychlost, strojově pravidelné úhozy, nulové chyby při vysoké rychlosti.</p>;

  return (
    <table className="w-full text-sm">
      <thead className="text-left text-zinc-400">
        <tr>
          <th className="py-2">Student (uid)</th>
          <th>Kolo</th>
          <th className="text-right">Úhozy/min</th>
          <th className="text-right">Přesnost</th>
          <th>Důvod</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className={`border-t border-white/5 ${r.voided ? "opacity-50" : ""}`}>
            <td className="py-2 font-mono text-xs">{r.uid}</td>
            <td>{r.levelId}</td>
            <td className="text-right tabular-nums">{r.cpm}</td>
            <td className="text-right tabular-nums">{r.accuracy} %</td>
            <td className="text-amber-300">{r.suspicious}</td>
            <td className="text-right">
              {!r.voided && (
                <button onClick={() => updateDoc(doc(db, "runs", r.id), { voided: true }).then(load)} className="rounded-md bg-zinc-700 px-3 py-1 hover:bg-zinc-600">
                  Anulovat
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Staff({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<(AllowedUserDoc & { email: string })[] | null>(null);
  const [email, setEmail] = useState("");
  const [roleNew, setRoleNew] = useState<"teacher" | "admin">("teacher");
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const snap = await getDocs(collection(db, "allowedUsers"));
    setRows(snap.docs.map((d) => ({ email: d.id, ...(d.data() as AllowedUserDoc) })));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    setErr(null);
    try {
      await setDoc(doc(db, "allowedUsers", email.trim().toLowerCase()), { role: roleNew, createdAt: serverTimestamp() }, { merge: true });
      setEmail("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-zinc-400">
        Kdo je tady, může do učitelské správy (role teacher) nebo i spravovat tento seznam (admin). Sem patří i výjimky pro účty mimo školní doménu.
      </p>
      {rows ? (
        <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
          {rows.map((r) => (
            <li key={r.email} className="flex items-center justify-between px-3 py-2">
              <span>{r.email}</span>
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs uppercase">{r.role}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-zinc-400">Načítám…</p>
      )}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kolega@ghb.cz" className="rounded-md border border-white/15 bg-zinc-950 px-3 py-1.5" />
          <select value={roleNew} onChange={(e) => setRoleNew(e.target.value as "teacher" | "admin")} className="rounded-md border border-white/15 bg-zinc-950 px-2 py-1.5">
            <option value="teacher">teacher</option>
            <option value="admin">admin</option>
          </select>
          <button onClick={() => void add()} className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium hover:bg-emerald-500">
            Přidat
          </button>
          {err && <span className="text-red-400">{err}</span>}
        </div>
      )}
    </div>
  );
}
