"use client";

import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  signOut as fbSignOut,
  type AuthCredential,
  type User,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { ensureUserDoc, getAllowedUser } from "@/lib/firestore/user";
import type { Role, UserDoc } from "@/lib/firestore/types";
import { isSchoolEmail } from "@/lib/schoolYear";

export type AccessState =
  | "loading"
  | "anonymous"
  | "unverified" // heslo, e-mail ještě neověřen
  | "forbidden" // přihlášen, ale není ze školy ani na whitelistu
  | "ok";

const GUEST_STORAGE_KEY = "pvz_guest_session";

/**
 * Režim hosta (#38) je pro lokální vývoj a testování: obchází přihlášení i whitelist,
 * proto v produkci jen s výslovným NEXT_PUBLIC_GUEST_MODE=1.
 */
export const GUEST_MODE_ENABLED =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_GUEST_MODE === "1";

function makeGuestUser(): User {
  return {
    uid: "guest",
    email: "host@demo.local",
    displayName: "Host / Vývojář",
    emailVerified: true,
    isAnonymous: true,
    providerData: [],
  } as unknown as User;
}

function makeGuestProfile(): UserDoc {
  return {
    email: "host@demo.local",
    displayName: "Host / Vývojář",
    gradYear: 2027,
    track: "A",
    layout: "qwertz",
    createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as unknown as UserDoc["createdAt"],
    lastActiveAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as unknown as UserDoc["lastActiveAt"],
    isGuest: true,
  };
}

/**
 * Microsoft (Entra ID) je jednotenantní aplikace školy: `tenant` omezí přihlášení na účty
 * z adresáře GHB, cizí účet (outlook.com, jiná škola) odmítne už Microsoft.
 * Postup registrace v Entra a Firebase je v management-a-zdroje/POSTUP-MICROSOFT-LOGIN.md.
 */
const MS_TENANT = process.env.NEXT_PUBLIC_MS_TENANT || process.env.NEXT_PUBLIC_SCHOOL_DOMAIN || "ghb.cz";

/** Chyba, kterou UI ukáže, když e-mail už má účet s heslem a Microsoft se k němu teprve připojí. */
export const MS_LINK_PENDING = "pvk/microsoft-link-pending";

interface AuthValue {
  user: User | null;
  profile: UserDoc | null;
  role: Role;
  access: AccessState;
  isGuest: boolean;
  signInGuest: () => void;
  refreshProfile: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInMicrosoft: () => Promise<void>;
  /** e-mail, ke kterému čeká připojení Microsoft účtu (po přihlášení heslem) */
  pendingLinkEmail: string | null;
  signInEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [role, setRole] = useState<Role>("student");
  const [access, setAccess] = useState<AccessState>("loading");
  // Microsoft přihlášení narazilo na existující účet s heslem — po přihlášení heslem ho připojíme.
  const pendingLink = useRef<{ email: string; credential: AuthCredential } | null>(null);
  const [pendingLinkEmail, setPendingLinkEmail] = useState<string | null>(null);
  // evaluate je async a volá se i ručně (po propojení účtů) — platí jen výsledek posledního volání
  const evalSeq = useRef(0);

  const evaluate = useCallback(async (u: User | null) => {
    if (GUEST_MODE_ENABLED && typeof window !== "undefined" && localStorage.getItem(GUEST_STORAGE_KEY) === "true") {
      setUser(makeGuestUser());
      setProfile(makeGuestProfile());
      setRole("student");
      setAccess("ok");
      return;
    }

    if (!u) {
      evalSeq.current++;
      setUser(null);
      setProfile(null);
      setRole("student");
      setAccess("anonymous");
      return;
    }
    const seq = ++evalSeq.current;
    const stale = () => seq !== evalSeq.current;
    setUser(u);
    // stejný údaj jako request.auth.token.firebase.sign_in_provider ve firestore.rules
    const provider = (await u.getIdTokenResult()).signInProvider;
    const allowed = await getAllowedUser(u.email);
    const school = isSchoolEmail(u.email);
    if (stale()) return;
    if (!allowed && !school) {
      setAccess("forbidden");
      return;
    }
    // heslový účet musí mít ověřený e-mail (jinak by si kdokoli založil cizí @ghb.cz)
    if (provider === "password" && !u.emailVerified && !allowed) {
      setAccess("unverified");
      return;
    }
    const userDoc = await ensureUserDoc(u);
    if (stale()) return;
    setRole(allowed?.role ?? "student");
    setProfile(userDoc);
    setAccess("ok");
  }, []);

  useEffect(() => onAuthStateChanged(auth, (u) => void evaluate(u)), [evaluate]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      profile,
      role,
      access,
      isGuest: profile?.isGuest ?? user?.uid === "guest",
      signInGuest: () => {
        if (!GUEST_MODE_ENABLED) return;
        if (typeof window !== "undefined") {
          localStorage.setItem(GUEST_STORAGE_KEY, "true");
        }
        setUser(makeGuestUser());
        setProfile(makeGuestProfile());
        setRole("student");
        setAccess("ok");
      },
      refreshProfile: async () => {
        if (user?.uid === "guest") {
          setProfile(makeGuestProfile());
        } else if (user) {
          setProfile(await ensureUserDoc(user));
        }
      },
      signInGoogle: async () => {
        if (typeof window !== "undefined") localStorage.removeItem(GUEST_STORAGE_KEY);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(auth, provider);
      },
      signInMicrosoft: async () => {
        if (typeof window !== "undefined") localStorage.removeItem(GUEST_STORAGE_KEY);
        const provider = new OAuthProvider("microsoft.com");
        provider.setCustomParameters({ tenant: MS_TENANT, prompt: "select_account" });
        provider.addScope("email");
        provider.addScope("profile");
        try {
          await signInWithPopup(auth, provider);
        } catch (e) {
          const err = e as { code?: string; customData?: { email?: string } };
          const credential = OAuthProvider.credentialFromError(e as Parameters<typeof OAuthProvider.credentialFromError>[0]);
          if (err.code === "auth/account-exists-with-different-credential" && credential) {
            const email = (err.customData?.email ?? "").toLowerCase();
            pendingLink.current = { email, credential };
            setPendingLinkEmail(email || null);
            throw Object.assign(new Error("Účet s tímto e-mailem už existuje."), { code: MS_LINK_PENDING });
          }
          throw e;
        }
      },
      pendingLinkEmail,
      signInEmail: async (email, password) => {
        if (typeof window !== "undefined") localStorage.removeItem(GUEST_STORAGE_KEY);
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const pending = pendingLink.current;
        if (pending && (!pending.email || pending.email === cred.user.email?.toLowerCase())) {
          // e-mail má starší účet s heslem: připojíme k němu Microsoft, postup zůstane na stejném uid
          await linkWithCredential(cred.user, pending.credential);
          pendingLink.current = null;
          setPendingLinkEmail(null);
          // relaci přepneme na Microsoft — heslová relace s neověřeným e-mailem by neprošla pravidly
          try {
            await signInWithCredential(auth, pending.credential);
          } catch {
            // token z popupu mohl vypršet; příště stačí tlačítko Microsoft
          }
          await evaluate(auth.currentUser);
        }
      },
      registerEmail: async (email, password) => {
        if (typeof window !== "undefined") localStorage.removeItem(GUEST_STORAGE_KEY);
        const e = email.trim().toLowerCase();
        if (!isSchoolEmail(e) && !(await getAllowedUser(e))) {
          throw new Error(`Registrovat se dá jen školním e-mailem @${process.env.NEXT_PUBLIC_SCHOOL_DOMAIN ?? "ghb.cz"}.`);
        }
        const cred = await createUserWithEmailAndPassword(auth, e, password);
        await sendEmailVerification(cred.user);
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email.trim());
      },
      resendVerification: async () => {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      },
      signOut: async () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(GUEST_STORAGE_KEY);
        }
        try {
          await fbSignOut(auth);
        } catch {
          // ignorujeme chybu pokud nebyl přihlášen přes Firebase
        }
        setUser(null);
        setProfile(null);
        setRole("student");
        setAccess("anonymous");
      },
    }),
    [user, profile, role, access, pendingLinkEmail, evaluate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth mimo AuthProvider");
  return v;
}
