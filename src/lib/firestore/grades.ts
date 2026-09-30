import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { gradeForCompletion } from "@/lib/grading";
import { classId as computeClassId, schoolYearKey } from "@/lib/schoolYear";
import type { GradeDoc, UserDoc } from "./types";

export function gradeDocId(uid: string, year = schoolYearKey()) {
  return `${uid}_${year}`;
}

export async function getMyGrade(uid: string, year = schoolYearKey()): Promise<GradeDoc | null> {
  const snap = await getDoc(doc(db, "grades", gradeDocId(uid, year)));
  return snap.exists() ? (snap.data() as GradeDoc) : null;
}

/** Student požádá o zapsání známky podle aktuálního % kurzu. */
export async function requestGrade(uid: string, profile: UserDoc, completion: number): Promise<void> {
  const grade = gradeForCompletion(completion);
  if (!grade) throw new Error("Na známku je potřeba aspoň 10 % kurzu.");
  const year = schoolYearKey();
  const existing = await getMyGrade(uid, year);
  if (existing?.locked) throw new Error("Známka za tento školní rok už byla zapsána.");
  await setDoc(doc(db, "grades", gradeDocId(uid, year)), {
    uid,
    schoolYear: year,
    classId: computeClassId(profile.gradYear, profile.track, year),
    displayName: profile.displayName,
    email: profile.email,
    completionAtClaim: completion,
    gradeOffered: grade,
    status: "requested",
    requestedAt: serverTimestamp(),
    locked: false,
  });
}

export async function listGradeRequests(year = schoolYearKey()): Promise<(GradeDoc & { id: string })[]> {
  const q = query(collection(db, "grades"), where("schoolYear", "==", year), orderBy("requestedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as GradeDoc) }));
}

/** Učitel potvrdí zapsání do předmětu → zámek na školní rok. */
export async function recordGrade(id: string, teacherEmail: string, subject: string): Promise<void> {
  await updateDoc(doc(db, "grades", id), {
    status: "recorded",
    recordedBy: teacherEmail,
    recordedAt: serverTimestamp(),
    subject,
    locked: true,
  });
}

export async function rejectGrade(id: string, teacherEmail: string): Promise<void> {
  await updateDoc(doc(db, "grades", id), { status: "rejected", recordedBy: teacherEmail, recordedAt: serverTimestamp(), locked: false });
}
