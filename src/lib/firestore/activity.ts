/**
 * Aktivita hráče po dnech (pro kalendář na profilu): kolik kol a minut odehrál který den.
 * Počítá se z kolekce `runs` (vlastní běhy smí student číst, index uid + startedAt existuje),
 * takže se nic nového do databáze neukládá. Host hraje offline, jeho dny jsou v localStorage.
 */
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface DayActivity {
  runs: number;
  minutes: number;
}

/** den -> aktivita; klíč je místní datum "RRRR-MM-DD" */
export type ActivityByDay = Record<string, DayActivity>;

const GUEST_ACTIVITY_KEY = "pvz_guest_activity";
/** maximum načtených kol — kalendář ukazuje jen posledních pár měsíců */
const MAX_RUNS = 1000;

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function add(map: ActivityByDay, key: string, durationMs: number) {
  const a = (map[key] ??= { runs: 0, minutes: 0 });
  a.runs += 1;
  a.minutes += durationMs / 60000;
}

function readGuest(): ActivityByDay {
  try {
    return JSON.parse(localStorage.getItem(GUEST_ACTIVITY_KEY) ?? "{}") as ActivityByDay;
  } catch {
    return {};
  }
}

/** Host: zapíše odehrané kolo k dnešnímu dni (volá se z ukládání běhu hosta). */
export function recordGuestActivity(durationMs: number) {
  const map = readGuest();
  add(map, dayKey(new Date()), durationMs);
  try {
    localStorage.setItem(GUEST_ACTIVITY_KEY, JSON.stringify(map));
  } catch {
    // soukromé okno apod. — kalendář hosta se jen neuloží
  }
}

/** Aktivita po dnech od data `since` do dneška. */
export async function getActivity(uid: string, since: Date): Promise<ActivityByDay> {
  if (uid === "guest") return readGuest();

  const snap = await getDocs(
    query(
      collection(db, "runs"),
      where("uid", "==", uid),
      where("startedAt", ">=", Timestamp.fromDate(since)),
      orderBy("startedAt", "desc"),
      limit(MAX_RUNS),
    ),
  );
  const map: ActivityByDay = {};
  for (const d of snap.docs) {
    const data = d.data() as { startedAt?: Timestamp; durationMs?: number };
    if (!data.startedAt) continue;
    add(map, dayKey(data.startedAt.toDate()), data.durationMs ?? 0);
  }
  return map;
}
