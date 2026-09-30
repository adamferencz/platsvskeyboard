"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

type Mode = "login" | "register" | "reset";

export default function LoginPage() {
  const { access, signInGoogle, signInEmail, registerEmail, resetPassword } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  useEffect(() => {
    if (access === "ok") router.replace("/");
  }, [access, router]);

  async function run(fn: () => Promise<void>, okText?: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (okText) setMsg({ kind: "ok", text: okText });
    } catch (e) {
      setMsg({ kind: "error", text: translate((e as { code?: string; message: string })) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6">
      <h1 className="mb-1 text-2xl font-bold">Přihlášení</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Studenti: školní e-mail <b>@{process.env.NEXT_PUBLIC_SCHOOL_DOMAIN ?? "ghb.cz"}</b> a heslo (přihlášení Microsoft účtem přijde brzy).
      </p>

      <button
        onClick={() => void run(signInGoogle)}
        disabled={busy}
        className="mb-4 w-full rounded-lg border border-white/15 px-4 py-2.5 font-medium hover:bg-white/10 disabled:opacity-50"
      >
        Pokračovat přes Google (učitelé)
      </button>

      <div className="mb-4 flex gap-1 rounded-lg bg-zinc-800 p-1 text-sm">
        {(["login", "register", "reset"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setMsg(null);
            }}
            className={`flex-1 rounded-md px-3 py-1.5 ${mode === m ? "bg-zinc-700 font-semibold" : "hover:bg-zinc-700/50"}`}
          >
            {m === "login" ? "Přihlásit" : m === "register" ? "Registrovat" : "Zapomenuté heslo"}
          </button>
        ))}
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "login") void run(() => signInEmail(email, password));
          if (mode === "register") void run(() => registerEmail(email, password), "Účet založen. Zkontroluj e-mail a klikni na ověřovací odkaz.");
          if (mode === "reset") void run(() => resetPassword(email), "Odkaz na změnu hesla je na cestě.");
        }}
      >
        <input
          type="email"
          required
          placeholder="2027anovak@ghb.cz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-500"
        />
        {mode !== "reset" && (
          <input
            type="password"
            required
            minLength={6}
            placeholder="heslo (min. 6 znaků)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-500"
          />
        )}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium hover:bg-emerald-500 disabled:opacity-50">
          {mode === "login" ? "Přihlásit se" : mode === "register" ? "Založit účet" : "Poslat odkaz"}
        </button>
      </form>

      {msg && <p className={`mt-4 text-sm ${msg.kind === "error" ? "text-red-400" : "text-emerald-400"}`}>{msg.text}</p>}
    </div>
  );
}

function translate(e: { code?: string; message: string }): string {
  switch (e.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Špatný e-mail nebo heslo.";
    case "auth/email-already-in-use":
      return "Tento e-mail už účet má — přihlas se, nebo si nech poslat nové heslo.";
    case "auth/weak-password":
      return "Heslo je moc slabé (min. 6 znaků).";
    case "auth/invalid-email":
      return "To nevypadá jako e-mail.";
    case "auth/popup-closed-by-user":
      return "Přihlašovací okno se zavřelo.";
    case "auth/popup-blocked":
      return "Prohlížeč zablokoval okno — povol vyskakovací okna pro tuto stránku.";
    case "auth/too-many-requests":
      return "Moc pokusů, chvíli počkej.";
    default:
      return e.message;
  }
}
