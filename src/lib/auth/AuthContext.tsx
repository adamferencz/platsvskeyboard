"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

interface AuthValue {
  user: User | null;
  profile: UserDoc | null;
  role: Role;
  access: AccessState;
  isGuest: boolean;
  signInGuest: () => void;
  refreshProfile: () => Promise<void>;
  signInGoogle: () => Promise<void>;
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

  const evaluate = useCallback(async (u: User | null) => {
    if (typeof window !== "undefined" && localStorage.getItem(GUEST_STORAGE_KEY) === "true") {
      setUser(makeGuestUser());
      setProfile(makeGuestProfile());
      setRole("student");
      setAccess("ok");
      return;
    }

    if (!u) {
      setUser(null);
      setProfile(null);
      setRole("student");
      setAccess("anonymous");
      return;
    }
    setUser(u);
    const provider = u.providerData[0]?.providerId;
    const allowed = await getAllowedUser(u.email);
    const school = isSchoolEmail(u.email);
    if (!allowed && !school) {
      setAccess("forbidden");
      return;
    }
    // heslový účet musí mít ověřený e-mail (jinak by si kdokoli založil cizí @ghb.cz)
    if (provider === "password" && !u.emailVerified && !allowed) {
      setAccess("unverified");
      return;
    }
    setRole(allowed?.role ?? "student");
    setProfile(await ensureUserDoc(u));
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
      signInEmail: async (email, password) => {
        if (typeof window !== "undefined") localStorage.removeItem(GUEST_STORAGE_KEY);
        await signInWithEmailAndPassword(auth, email.trim(), password);
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
    [user, profile, role, access],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth mimo AuthProvider");
  return v;
}
