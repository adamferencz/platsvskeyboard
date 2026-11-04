"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GUEST_MODE_ENABLED, MS_LINK_PENDING, useAuth } from "@/lib/auth/AuthContext";

type Mode = "login" | "register" | "reset";

export default function LoginPage() {
  const { access, signInGoogle, signInMicrosoft, pendingLinkEmail, signInEmail, registerEmail, resetPassword, signInGuest } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  useEffect(() => {
    if (access === "ok") router.replace("/");
  }, [access, router]);

  useEffect(() => {
    if (pendingLinkEmail) {
      setMode("login");
      setEmail(pendingLinkEmail);
    }
  }, [pendingLinkEmail]);

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
      <p className="mb-5 text-sm text-zinc-400">
        Přihlas se školním účtem Microsoft <b>@{process.env.NEXT_PUBLIC_SCHOOL_DOMAIN ?? "ghb.cz"}</b> (stejný jako do Teams a Outlooku).
      </p>

      {GUEST_MODE_ENABLED && (
        <>
          {/* Dev / Guest Mode Bypass (Issue #38) */}
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-center">
            <button
              type="button"
              onClick={() => {
                signInGuest();
                router.replace("/");
              }}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow hover:bg-emerald-500 active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>🎮</span>
              <span>Hrát jako host / Vývojář</span>
            </button>
            <p className="mt-2 text-xs text-emerald-300/80">
              Umožní hrát offline a bez školního e-mailu. Postup se ukládá lokálně.
            </p>
          </div>

          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative bg-zinc-900 px-3 text-xs uppercase tracking-wider text-zinc-500">
              nebo školním účtem GHB
            </span>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => void run(signInMicrosoft)}
        disabled={busy}
        className="mb-3 flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-2.5 font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
      >
        <MicrosoftLogo />
        Přihlásit se účtem Microsoft (GHB)
      </button>

      <div className="relative my-5 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <span className="relative bg-zinc-900 px-3 text-xs uppercase tracking-wider text-zinc-500">jiné způsoby</span>
      </div>

      <button
        onClick={() => void run(signInGoogle)}
        disabled={busy}
        className="mb-4 w-full rounded-lg border border-white/15 px-4 py-2.5 font-medium hover:bg-white/10 disabled:opacity-50 cursor-pointer"
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

      {pendingLinkEmail && !msg && (
        <p className="mt-4 text-sm text-amber-300">
          K e-mailu {pendingLinkEmail} už máš účet s heslem. Přihlas se jím a Microsoft se k němu připojí, příště už stačí tlačítko Microsoft.
        </p>
      )}
      {msg && <p className={`mt-4 text-sm ${msg.kind === "error" ? "text-red-400" : "text-emerald-400"}`}>{msg.text}</p>}
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function translate(e: { code?: string; message: string }): string {
  switch (e.code) {
    case MS_LINK_PENDING:
      return "K tomuto e-mailu už máš účet s heslem. Přihlas se níž heslem a Microsoft se k účtu připojí (postup zůstane).";
    case "auth/operation-not-allowed":
      return "Tento způsob přihlášení ještě není zapnutý. Dej vědět učiteli.";
    case "auth/cancelled-popup-request":
      return "Přihlašovací okno už je otevřené.";
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
