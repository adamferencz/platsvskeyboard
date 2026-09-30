import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { schoolYearKey } from "@/lib/schoolYear";
import type { LeaderboardField, StatsDoc } from "./types";

export async function fetchLeaderboard(field: LeaderboardField, opts: { classId?: string | null; year?: string; top?: number } = {}): Promise<StatsDoc[]> {
  const year = opts.year ?? schoolYearKey();
  const parts = [where("schoolYear", "==", year)];
  if (opts.classId) parts.push(where("classId", "==", opts.classId));
  const q = query(collection(db, "stats"), ...parts, orderBy(field, "desc"), limit(opts.top ?? 20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as StatsDoc);
}

export async function fetchClassIds(year = schoolYearKey()): Promise<string[]> {
  const snap = await getDocs(query(collection(db, "stats"), where("schoolYear", "==", year), limit(500)));
  const set = new Set<string>();
  snap.docs.forEach((d) => {
    const c = (d.data() as StatsDoc).classId;
    if (c) set.add(c);
  });
  return [...set].sort();
}
