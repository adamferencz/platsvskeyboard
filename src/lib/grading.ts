/**
 * Dobrovolné známkování podle % kurzu (viz management-a-zdroje/NAVRH.md, kap. 5).
 */

export type Grade = 1 | 2 | 3 | 4 | 5;

export const GRADE_THRESHOLDS: { min: number; grade: Grade }[] = [
  { min: 95, grade: 1 },
  { min: 65, grade: 2 },
  { min: 40, grade: 3 },
  { min: 20, grade: 4 },
  { min: 10, grade: 5 },
];

/** Známka, která by studentovi vyšla; null pod 10 %. */
export function gradeForCompletion(completion: number): Grade | null {
  for (const t of GRADE_THRESHOLDS) if (completion >= t.min) return t.grade;
  return null;
}

/** Kolik % chybí do další (lepší) známky; null když už je jednička. */
export function nextGradeThreshold(completion: number): { grade: Grade; min: number } | null {
  const better = [...GRADE_THRESHOLDS].reverse().find((t) => t.min > completion);
  return better ?? null;
}
