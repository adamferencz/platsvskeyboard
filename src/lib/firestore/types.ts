import type { Timestamp } from "firebase/firestore";
import type { Track } from "@/lib/schoolYear";
import type { KeyStat } from "@/game/content/words";

export type Role = "student" | "teacher" | "admin" | "superadmin";

/** Pevně daný superadmin (stejný jako superAdminEmail() ve firestore.rules). */
export const SUPERADMIN_EMAIL = "garrukaf@gmail.com";

export const isAdminRole = (r: Role) => r === "admin" || r === "superadmin";
export const isTeacherRole = (r: Role) => r === "teacher" || isAdminRole(r);
export type Layout = "qwertz" | "qwerty";

export interface UserDoc {
  email: string;
  displayName: string;
  gradYear: number | null;
  track: Track | null;
  layout: Layout;
  /** testovací účet založený adminem; nepočítá se do žebříčků */
  test?: boolean;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
  isGuest?: boolean;
}

export interface AllowedUserDoc {
  role: Role;
  displayName?: string;
  /** testovací účet (role student), založený adminem v /ucitel */
  test?: boolean;
  createdBy?: string;
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
  test?: boolean;
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

// ---------- nápady na vylepšení (/napady) ----------

/** Životní cyklus návrhu: student navrhne → tým schválí → vývoj → hotovo (nebo zamítnuto). */
export const SUGGESTION_STATUSES = {
  new: { label: "Nový", color: "bg-zinc-600/40 text-zinc-200 border-zinc-500/40" },
  accepted: { label: "Schváleno", color: "bg-amber-500/20 text-amber-200 border-amber-500/40" },
  in_progress: { label: "Ve vývoji", color: "bg-sky-500/20 text-sky-200 border-sky-500/40" },
  done: { label: "Hotovo", color: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" },
  rejected: { label: "Zamítnuto", color: "bg-red-500/15 text-red-300 border-red-500/30" },
} as const;
export type SuggestionStatus = keyof typeof SUGGESTION_STATUSES;

export const SUGGESTION_CATEGORIES = {
  napad: "💡 Nápad",
  chyba: "🐞 Chyba",
  hra: "🧟 Hratelnost",
  obsah: "📚 Obsah a slova",
  vzhled: "🎨 Vzhled",
} as const;
export type SuggestionCategory = keyof typeof SUGGESTION_CATEGORIES;

export const SUGGESTION_TITLE_MAX = 120;
export const SUGGESTION_BODY_MAX = 4000;
export const COMMENT_MAX = 2000;

export interface SuggestionDoc {
  /** pořadové číslo #N (čítač counters/suggestions) */
  number: number;
  uid: string;
  authorName: string;
  classId: string | null;
  title: string;
  body: string;
  category: SuggestionCategory;
  status: SuggestionStatus;
  /** uid hlasujících; votes = voters.length (kvůli řazení a pravidlům) */
  voters: string[];
  votes: number;
  commentCount: number;
  /** poslední přidaný / smazaný komentář — kotva pro kontrolu čítače v pravidlech */
  lastCommentId?: string;
  /** kdo na tom dělá (volný text, např. jméno studenta ze semináře) */
  assignee: string | null;
  /** odkaz na PR / issue na GitHubu */
  link: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type Suggestion = SuggestionDoc & { id: string };

export interface SuggestionCommentDoc {
  uid: string;
  authorName: string;
  /** psal učitel / admin (odznak „tým") */
  staff: boolean;
  body: string;
  createdAt: Timestamp;
}

export type SuggestionComment = SuggestionCommentDoc & { id: string };
