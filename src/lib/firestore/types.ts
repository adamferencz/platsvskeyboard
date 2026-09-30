import type { Timestamp } from "firebase/firestore";
import type { Track } from "@/lib/schoolYear";
import type { KeyStat } from "@/game/content/words";

export type Role = "student" | "teacher" | "admin";
export type Layout = "qwertz" | "qwerty";

export interface UserDoc {
  email: string;
  displayName: string;
  gradYear: number | null;
  track: Track | null;
  layout: Layout;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}

export interface AllowedUserDoc {
  role: Role;
  displayName?: string;
}

export interface LevelProgress {
  stars: 0 | 1 | 2 | 3;
  bestCpm: number;
  attempts: number;
}

export interface ProgressDoc {
  /** levelId -> nejlepší výsledek */
  levels: Record<string, LevelProgress>;
  completedRounds: number;
  courseCompletion: number;
  /** nejvyšší odemčená kapitola */
  unlockedChapter: number;
  bestCpm: number;
  bestNetCpm: number;
  totalRuns: number;
  totalMinutes: number;
  totalScore: number;
  keyStats: Record<string, KeyStat>;
  updatedAt: Timestamp;
}

export interface StatsDoc {
  uid: string;
  schoolYear: string;
  classId: string | null;
  displayName: string;
  courseCompletion: number;
  bestCpm: number;
  bestNetCpm: number;
  totalScore: number;
  totalMinutes: number;
  runs: number;
  avgAccuracy: number;
  lastRunAt: Timestamp;
}

export interface RunDoc {
  uid: string;
  schoolYear: string;
  classId: string | null;
  levelId: string;
  startedAt: Timestamp;
  durationMs: number;
  cpm: number;
  netCpm: number;
  accuracy: number;
  score: number;
  stars: number;
  won: boolean;
  livesLost: number;
  correct: number;
  errors: number;
  /** [t, ok] — kompaktní log úhozů pro audit */
  keystrokes: number[];
  suspicious: string | null;
  voided?: boolean;
}

export type GradeStatus = "requested" | "recorded" | "rejected";

export interface GradeDoc {
  uid: string;
  schoolYear: string;
  classId: string | null;
  displayName: string;
  email: string;
  completionAtClaim: number;
  gradeOffered: number;
  status: GradeStatus;
  requestedAt: Timestamp;
  recordedBy?: string;
  recordedAt?: Timestamp;
  subject?: string;
  locked: boolean;
}

export const LEADERBOARD_FIELDS = {
  bestNetCpm: "Nejrychlejší prsty (čisté úhozy/min)",
  courseCompletion: "Nejdál v kurzu (%)",
  totalScore: "Nejvíc bodů",
  totalMinutes: "Nejpilnější (minuty tréninku)",
} as const;

export type LeaderboardField = keyof typeof LEADERBOARD_FIELDS;
