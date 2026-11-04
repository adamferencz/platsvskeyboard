import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, inMemoryPersistence, initializeAuth, signOut } from "firebase/auth";
import { deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { db, firebaseConfig } from "@/lib/firebase/client";
import type { Track } from "@/lib/schoolYear";

/** Doména testovacích účtů. example.com je rezervovaná, nikam se z ní nic nepošle. */
export const TEST_DOMAIN = "pvk-test.example.com";

export function testEmail(login: string): string {
  const slug = login
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("Zadej přihlašovací jméno (písmena, čísla, tečka, pomlčka).");
  return `${slug}@${TEST_DOMAIN}`;
}

export function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export interface NewTestAccount {
  login: string;
  displayName: string;
  password: string;
  gradYear: number | null;
  track: Track | null;
  createdBy: string;
}

/**
 * Založí testovací účet bez Cloud Functions (plán Spark):
 * 1. admin zapíše výjimku do allowedUsers (role student, test: true),
 * 2. účet se vytvoří v oddělené instanci Firebase Auth (paměťová persistence),
 *    takže admin zůstane přihlášený,
 * 3. nový účet si sám založí profil users/{uid} (pravidla povolují jen vlastníkovi).
 */
export async function createTestAccount(input: NewTestAccount): Promise<{ email: string; uid: string }> {
  const email = testEmail(input.login);
  if (input.password.length < 6) throw new Error("Heslo musí mít aspoň 6 znaků.");

  const allowedRef = doc(db, "allowedUsers", email);
  if ((await getDoc(allowedRef)).exists()) throw new Error(`Účet ${email} už existuje.`);

  await setDoc(allowedRef, {
    role: "student",
    test: true,
    displayName: input.displayName.trim() || email.split("@")[0],
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  });

  const app = initializeApp(firebaseConfig, `test-account-${Date.now()}`);
  try {
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    let uid: string;
    try {
      uid = (await createUserWithEmailAndPassword(auth, email, input.password)).user.uid;
    } catch (e) {
      await deleteDoc(allowedRef).catch(() => {});
      const code = (e as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        throw new Error(`Účet ${email} už ve Firebase Auth existuje (dřív vypnutý). Zvol jiné jméno, nebo ho smaž skriptem.`);
      }
      throw e;
    }
    await setDoc(doc(getFirestore(app), "users", uid), {
      email,
      displayName: input.displayName.trim() || email.split("@")[0],
      gradYear: input.gradYear,
      track: input.track,
      layout: "qwertz",
      test: true,
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    });
    await signOut(auth);
    return { email, uid };
  } finally {
    await deleteApp(app);
  }
}

/** Odebere výjimku: účet se pak už nepřihlásí (není ze školní domény). Data a Auth záznam zůstanou. */
export async function disableTestAccount(email: string): Promise<void> {
  await deleteDoc(doc(db, "allowedUsers", email));
}
