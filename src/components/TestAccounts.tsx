"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { TEST_DOMAIN, createTestAccount, disableTestAccount, generatePassword, testEmail } from "@/lib/firestore/testAccounts";
import type { AllowedUserDoc } from "@/lib/firestore/types";
import { schoolYearEnd, schoolYearKey, type Track } from "@/lib/schoolYear";

const TRACKS: { track: Track; years: number }[] = [
  { track: "A", years: 8 },
  { track: "C", years: 4 },
  { track: "D", years: 4 },
];

/** Třídy pro výběr: '3.C' → rok maturity v aktuálním školním roce. */
function classOptions(yearKey: string) {
  const end = schoolYearEnd(yearKey);
  return TRACKS.flatMap(({ track, years }) =>
    Array.from({ length: years }, (_, i) => ({ label: `${i + 1}.${track}`, track, gradYear: end + (years - (i + 1)) })),
  );
}

export function TestAccounts({ adminEmail }: { adminEmail: string }) {
  const options = classOptions(schoolYearKey());
  const [rows, setRows] = useState<(AllowedUserDoc & { email: string })[] | null>(null);
  const [login, setLogin] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [cls, setCls] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "allowedUsers"), where("test", "==", true)));
      setRows(snap.docs.map((d) => ({ email: d.id, ...(d.data() as AllowedUserDoc) })));
    } catch (e) {
      setErr((e as Error).message);
      setRows([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  let preview = "";
  try {
    preview = login.trim() ? testEmail(login) : "";
  } catch {
    preview = "";
  }

  async function create() {
    setBusy(true);
    setErr(null);
    setCreated(null);
    try {
      const opt = options.find((o) => o.label === cls);
      const res = await createTestAccount({
        login,
        displayName: name,
        password,
        gradYear: opt?.gradYear ?? null,
        track: opt?.track ?? null,
        createdBy: adminEmail,
      });
      setCreated({ email: res.email, password });
      setLogin("");
      setName("");
      setPassword(generatePassword());
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disable(email: string) {
    if (!confirm(`Vypnout ${email}? Účet se už nepřihlásí.`)) return;
    setErr(null);
    try {
      await disableTestAccount(email);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const input = "rounded-md border border-white/15 bg-zinc-950 px-3 py-1.5";

  return (
    <div className="space-y-4 text-sm">
      <p className="text-zinc-400">
        Testovací účet je studentský účet mimo školní doménu (<code>…@{TEST_DOMAIN}</code>) na zkoušení hry. Přihlašuje se e-mailem a heslem na stránce přihlášení, e-mail se
        neověřuje a do žebříčků se nepočítá. Heslo si zapiš hned, později ho zobrazit nejde.
      </p>

      <div className="grid gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-zinc-400">Přihlašovací jméno</span>
          <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="tester1" className={input} />
          {preview && <span className="font-mono text-xs text-zinc-500">{preview}</span>}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-400">Zobrazované jméno</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tester 1" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-400">Heslo</span>
          <span className="flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} className={`${input} min-w-0 flex-1 font-mono`} />
            <button type="button" onClick={() => setPassword(generatePassword())} className="rounded-md bg-zinc-800 px-3 hover:bg-zinc-700" title="Vygenerovat nové heslo">
              ↻
            </button>
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-400">Třída (nepovinné)</span>
          <select value={cls} onChange={(e) => setCls(e.target.value)} className={input}>
            <option value="">bez třídy</option>
            {options.map((o) => (
              <option key={o.label} value={o.label}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button onClick={() => void create()} disabled={busy || !login.trim()} className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium hover:bg-emerald-500 disabled:opacity-50">
            {busy ? "Zakládám…" : "Založit testovací účet"}
          </button>
          {err && <span className="text-red-400">{err}</span>}
        </div>
      </div>

      {created && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
          Hotovo. Přihlášení: <b className="font-mono">{created.email}</b>, heslo <b className="font-mono">{created.password}</b>
        </div>
      )}

      {rows === null ? (
        <p className="text-zinc-400">Načítám…</p>
      ) : rows.length === 0 ? (
        <p className="text-zinc-400">Zatím žádné testovací účty.</p>
      ) : (
        <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
          {rows.map((r) => (
            <li key={r.email} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span>
                <span className="font-mono">{r.email}</span> <span className="text-zinc-400">{r.displayName}</span>
                {r.createdBy && <span className="ml-2 text-xs text-zinc-500">založil(a) {r.createdBy}</span>}
              </span>
              <button onClick={() => void disable(r.email)} className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10">
                Vypnout
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
