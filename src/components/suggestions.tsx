"use client";

import { useState } from "react";
import type { Timestamp } from "firebase/firestore";
import {
  SUGGESTION_BODY_MAX,
  SUGGESTION_CATEGORIES,
  SUGGESTION_STATUSES,
  SUGGESTION_TITLE_MAX,
  type Suggestion,
  type SuggestionCategory,
  type SuggestionStatus,
} from "@/lib/firestore/types";
import type { NewSuggestion } from "@/lib/firestore/suggestions";

export function StatusBadge({ status }: { status: SuggestionStatus }) {
  const s = SUGGESTION_STATUSES[status];
  return <span className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium ${s.color}`}>{s.label}</span>;
}

export function CategoryBadge({ category }: { category: SuggestionCategory }) {
  return (
    <span className="inline-block whitespace-nowrap rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-300">
      {SUGGESTION_CATEGORIES[category] ?? category}
    </span>
  );
}

export function VoteButton({
  s,
  uid,
  onToggle,
  disabled,
  size = "md",
}: {
  s: Suggestion;
  uid: string | undefined;
  onToggle: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const voted = !!uid && s.voters.includes(uid);
  const pad = size === "sm" ? "min-w-10 px-1.5 py-0.5 text-xs" : "min-w-12 px-2 py-1.5 text-sm";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      disabled={disabled}
      title={voted ? "Odebrat hlas" : "Taky to chci"}
      aria-pressed={voted}
      className={`flex shrink-0 flex-col items-center rounded-lg border font-semibold tabular-nums leading-tight transition disabled:cursor-not-allowed disabled:opacity-50 ${pad} ${
        voted ? "border-emerald-500/60 bg-emerald-600/30 text-emerald-200" : "border-white/15 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      <span aria-hidden>▲</span>
      {s.votes}
    </button>
  );
}

export function SuggestionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: NewSuggestion;
  submitLabel: string;
  onSubmit: (data: NewSuggestion) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [category, setCategory] = useState<SuggestionCategory>(initial?.category ?? "napad");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      setError("Název musí mít aspoň 3 znaky.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ title, body, category });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SUGGESTION_CATEGORIES) as SuggestionCategory[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1 text-sm ${category === c ? "bg-emerald-600 font-semibold" : "bg-zinc-800 hover:bg-zinc-700"}`}
          >
            {SUGGESTION_CATEGORIES[c]}
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={SUGGESTION_TITLE_MAX}
        placeholder="Stručně: co by se mělo zlepšit?"
        className="w-full rounded-md border border-white/15 bg-zinc-950 px-3 py-2"
        autoFocus
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={SUGGESTION_BODY_MAX}
        rows={5}
        placeholder={
          category === "chyba"
            ? "Co se stalo, v jakém kole / kapitole, co jsi čekal(a), že se stane? Prohlížeč?"
            : "Popiš nápad podrobněji: proč by to pomohlo, jak si to představuješ…"
        }
        className="w-full rounded-md border border-white/15 bg-zinc-950 px-3 py-2"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-md bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50">
          {busy ? "Ukládám…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-zinc-400 hover:bg-white/10">
            Zrušit
          </button>
        )}
      </div>
    </form>
  );
}

export function formatDate(t: Timestamp | null | undefined): string {
  if (!t) return "právě teď";
  return t.toDate().toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

export function formatDateTime(t: Timestamp | null | undefined): string {
  if (!t) return "právě teď";
  return t.toDate().toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
}
