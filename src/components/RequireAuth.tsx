"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Role } from "@/lib/firestore/types";

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { access, role, user, resendVerification, signOut } = useAuth();

  if (access === "loading") return <p className="py-20 text-center text-zinc-400">Načítám…</p>;

  if (access === "anonymous") {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-zinc-300">Pro hraní se musíš přihlásit školním účtem.</p>
        <Link href="/prihlaseni" className="rounded-md bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500">
          Přihlásit se
        </Link>
      </div>
    );
  }

  if (access === "unverified") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h2 className="mb-2 text-xl font-semibold">Ověř svůj e-mail</h2>
        <p className="mb-4 text-zinc-300">
          Poslali jsme ověřovací odkaz na <b>{user?.email}</b>. Klikni na něj a pak stránku obnov.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => void resendVerification()} className="rounded-md border border-white/15 px-4 py-2 hover:bg-white/10">
            Poslat znovu
          </button>
          <button onClick={() => location.reload()} className="rounded-md bg-emerald-600 px-4 py-2 hover:bg-emerald-500">
            Už jsem ověřil
          </button>
          <button onClick={() => void signOut()} className="rounded-md px-4 py-2 text-zinc-400 hover:bg-white/10">
            Odhlásit
          </button>
        </div>
      </div>
    );
  }

  if (access === "forbidden") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h2 className="mb-2 text-xl font-semibold">Tento účet nemá přístup</h2>
        <p className="mb-4 text-zinc-300">
          Hra je pro studenty a učitele GHB (e-mail @{process.env.NEXT_PUBLIC_SCHOOL_DOMAIN ?? "ghb.cz"}). Přihlášen: {user?.email}
        </p>
        <button onClick={() => void signOut()} className="rounded-md border border-white/15 px-4 py-2 hover:bg-white/10">
          Odhlásit
        </button>
      </div>
    );
  }

  if (roles && !roles.includes(role)) {
    return <p className="py-20 text-center text-zinc-400">Tahle stránka je jen pro učitele.</p>;
  }

  return <>{children}</>;
}
