import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase/client";
import { gradYearFromEmail, type Track } from "@/lib/schoolYear";
import type { AllowedUserDoc, Layout, UserDoc } from "./types";

export async function ensureUserDoc(user: User): Promise<UserDoc> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { lastActiveAt: serverTimestamp() });
    return snap.data() as UserDoc;
  }
  const email = (user.email ?? "").toLowerCase();
  const data = {
    email,
    displayName: user.displayName || email.split("@")[0],
    gradYear: gradYearFromEmail(email),
    track: null,
    layout: "qwertz" as Layout,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return (await getDoc(ref)).data() as UserDoc;
}

export async function updateUserProfile(uid: string, patch: Partial<Pick<UserDoc, "displayName" | "track" | "layout" | "gradYear">>) {
  await updateDoc(doc(db, "users", uid), patch);
}

export async function getAllowedUser(email: string | null | undefined): Promise<AllowedUserDoc | null> {
  if (!email) return null;
  const snap = await getDoc(doc(db, "allowedUsers", email.toLowerCase()));
  return snap.exists() ? (snap.data() as AllowedUserDoc) : null;
}

export type { Track };
