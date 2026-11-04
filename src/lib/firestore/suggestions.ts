import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { classId as computeClassId, schoolYearKey } from "@/lib/schoolYear";
import type {
  Suggestion,
  SuggestionCategory,
  SuggestionComment,
  SuggestionCommentDoc,
  SuggestionDoc,
  SuggestionStatus,
  UserDoc,
} from "./types";

// Návrhů bude řádově stovky, proto jeden dotaz bez composite indexu a filtrování/řazení na klientu.
const COL = "suggestions";
const COUNTER = doc(db, "counters", "suggestions");

export function watchSuggestions(cb: (items: Suggestion[]) => void, onError: (e: Error) => void) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"), limit(500));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as SuggestionDoc) }))),
    onError,
  );
}

export function watchSuggestion(id: string, cb: (s: Suggestion | null) => void, onError: (e: Error) => void) {
  return onSnapshot(
    doc(db, COL, id),
    (snap) => cb(snap.exists() ? { id: snap.id, ...(snap.data() as SuggestionDoc) } : null),
    onError,
  );
}

export function watchComments(id: string, cb: (items: SuggestionComment[]) => void, onError: (e: Error) => void) {
  const q = query(collection(db, COL, id, "comments"), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as SuggestionCommentDoc) }))),
    onError,
  );
}

export interface NewSuggestion {
  title: string;
  body: string;
  category: SuggestionCategory;
}

/** Založí návrh s dalším číslem #N — čítač a návrh v jedné transakci (pravidla hlídají shodu). */
export async function createSuggestion(uid: string, profile: UserDoc, data: NewSuggestion): Promise<string> {
  const ref = doc(collection(db, COL));
  await runTransaction(db, async (tx) => {
    const counter = await tx.get(COUNTER);
    const next = ((counter.data()?.lastNumber as number | undefined) ?? 0) + 1;
    tx.set(COUNTER, { lastNumber: next });
    tx.set(ref, {
      number: next,
      uid,
      authorName: profile.displayName.slice(0, 80),
      classId: computeClassId(profile.gradYear, profile.track, schoolYearKey()),
      title: data.title.trim(),
      body: data.body.trim(),
      category: data.category,
      status: "new",
      voters: [],
      votes: 0,
      commentCount: 0,
      assignee: null,
      link: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  return ref.id;
}

/** Transakce čte čerstvý stav, takže dvojklik ani druhá záložka hlas nezdvojí. */
export async function toggleVote(s: Suggestion, uid: string): Promise<void> {
  const ref = doc(db, COL, s.id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const voted = ((snap.data().voters as string[] | undefined) ?? []).includes(uid);
    tx.update(ref, {
      voters: voted ? arrayRemove(uid) : arrayUnion(uid),
      votes: increment(voted ? -1 : 1),
    });
  });
}

/** Autor může upravit svůj návrh, dokud ho tým nezačal řešit (stav „Nový"). */
export async function editSuggestion(id: string, patch: NewSuggestion): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    title: patch.title.trim(),
    body: patch.body.trim(),
    category: patch.category,
    updatedAt: serverTimestamp(),
  });
}

export interface StaffPatch {
  status?: SuggestionStatus;
  assignee?: string | null;
  link?: string | null;
}

/** Učitel / admin: stav, řešitel, odkaz na PR. */
export async function updateSuggestionStaff(id: string, patch: StaffPatch): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...patch, updatedAt: serverTimestamp() });
}

/** Smaže návrh i s komentáři (učitel kdykoli, autor jen nový návrh bez komentářů). */
export async function deleteSuggestion(id: string): Promise<void> {
  const comments = await getDocs(collection(db, COL, id, "comments"));
  const batch = writeBatch(db);
  comments.docs.forEach((c) => batch.delete(c.ref));
  batch.delete(doc(db, COL, id));
  await batch.commit();
}

export async function addComment(id: string, author: { uid: string; name: string; staff: boolean }, body: string): Promise<void> {
  const ref = doc(collection(db, COL, id, "comments"));
  const batch = writeBatch(db);
  batch.set(ref, {
    uid: author.uid,
    authorName: author.name.slice(0, 80),
    staff: author.staff,
    body: body.trim(),
    createdAt: serverTimestamp(),
  });
  // lastCommentId: pravidla podle něj ověří, že se čítač mění spolu se skutečným komentářem
  batch.update(doc(db, COL, id), { commentCount: increment(1), lastCommentId: ref.id });
  await batch.commit();
}

export async function deleteComment(id: string, commentId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, COL, id, "comments", commentId));
  batch.update(doc(db, COL, id), { commentCount: increment(-1), lastCommentId: commentId });
  await batch.commit();
}
