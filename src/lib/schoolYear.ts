/**
 * Školní rok a odvození třídy ze školního e-mailu.
 *
 * E-mail studenta má tvar `2027atrachtulec@ghb.cz` — první čtyři číslice = rok maturity.
 * Třídy A = osmileté studium (1.A … 8.A), C a D = čtyřleté (1.C … 4.C, 1.D … 4.D).
 * Z e-mailu nejde poznat délku studia ani písmeno — to si student vybere v profilu (`track`).
 */

export type Track = "A" | "C" | "D";

export const TRACK_LENGTH: Record<Track, number> = { A: 8, C: 4, D: 4 };

/** Klíč školního roku, např. '2026-27'. Měsíc >= 9 → nový rok. */
export function schoolYearKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const start = date.getMonth() + 1 >= 9 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Koncový kalendářní rok školního roku ('2026-27' → 2027). */
export function schoolYearEnd(key: string): number {
  return Number(key.slice(0, 4)) + 1;
}

/** Rok maturity z e-mailu, nebo null. */
export function gradYearFromEmail(email: string): number | null {
  const m = /^(\d{4})[a-z]/i.exec(email.trim());
  if (!m) return null;
  const year = Number(m[1]);
  return year >= 2000 && year <= 2100 ? year : null;
}

/** Ročník v daném školním roce (1..délka studia), nebo null když je mimo rozsah. */
export function gradeLevel(gradYear: number, track: Track, yearKey: string): number | null {
  const level = TRACK_LENGTH[track] - (gradYear - schoolYearEnd(yearKey));
  return level >= 1 && level <= TRACK_LENGTH[track] ? level : null;
}

/** Označení třídy, např. '8.A', nebo null. */
export function classId(gradYear: number | null, track: Track | null, yearKey: string): string | null {
  if (!gradYear || !track) return null;
  const level = gradeLevel(gradYear, track, yearKey);
  return level ? `${level}.${track}` : null;
}

export function isSchoolEmail(email: string | null | undefined, domain = process.env.NEXT_PUBLIC_SCHOOL_DOMAIN ?? "ghb.cz"): boolean {
  return !!email && email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}
