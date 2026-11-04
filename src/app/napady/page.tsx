"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { CategoryBadge, StatusBadge, SuggestionForm, VoteButton, formatDate } from "@/components/suggestions";
import { useAuth } from "@/lib/auth/AuthContext";
import { createSuggestion, toggleVote, updateSuggestionStaff, watchSuggestions } from "@/lib/firestore/suggestions";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_STATUSES,
  isTeacherRole,
  type Suggestion,
  type SuggestionCategory,
  type SuggestionStatus,
} from "@/lib/firestore/types";

export default function SuggestionsPage() {
  return (
    <RequireAuth>
      <Suggestions />
    </RequireAuth>
  );
}

type Filter = "open" | "done" | "rejected" | "mine" | "all";
const FILTERS: Record<Filter, string> = {
  open: "Otevřené",
  done: "Hotové",
  rejected: "Zamítnuté",
  mine: "Moje",
  all: "Vše",
};
const OPEN: SuggestionStatus[] = ["new", "accepted", "in_progress"];
const BOARD: SuggestionStatus[] = ["new", "accepted", "in_progress", "done"];

function Suggestions() {
  const { user, profile, role, isGuest } = useAuth();
  const router = useRouter();
  const staff = isTeacherRole(role);
  const uid = user?.uid;
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "board">("list");
  const [filter, setFilter] = useState<Filter>("open");
  const [category, setCategory] = useState<SuggestionCategory | "">("");
  const [sort, setSort] = useState<"votes" | "new">("votes");
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) return;
    return watchSuggestions(setItems, (e) => setError(e.message));
  }, [isGuest]);

  const visible = useMemo(() => {
    if (!items) return [];
    return items
      .filter((s) => {
        if (category && s.category !== category) return false;
        switch (filter) {
          case "open":
            return OPEN.includes(s.status);
          case "done":
            return s.status === "done";
          case "rejected":
            return s.status === "rejected";
          case "mine":
            return s.uid === uid;
          default:
            return true;
        }
      })
      .sort((a, b) => (sort === "votes" ? b.votes - a.votes || b.number - a.number : b.number - a.number));
  }, [items, filter, category, sort, uid]);

  const vote = (s: Suggestion) => {
    if (!uid || isGuest) return;
    setActionError(null);
    toggleVote(s, uid).catch((e) => setActionError((e as Error).message));
  };

  const move = (id: string, status: SuggestionStatus) => {
    setActionError(null);
    updateSuggestionStaff(id, { status }).catch((e) => setActionError((e as Error).message));
  };

  if (isGuest) {
    return (
      <div className="py-20 text-center text-zinc-400">
        Nápady jsou uložené ve Firestore — v režimu hosta je neuvidíš. Přihlas se školním účtem.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Nápady a vylepšení</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Co by se ve hře mělo zlepšit, co chybí, co nefunguje? Navrhni to, hlasuj pro nápady ostatních ▲ a diskutuj v komentářích.
            Nejžádanější věci bereme do vývoje — dělají je i studenti IT semináře.
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="rounded-md bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500">
            + Navrhnout vylepšení
          </button>
        )}
      </div>

      {showForm && profile && uid && (
        <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/60 p-4">
          <h2 className="mb-3 font-semibold">Nový návrh</h2>
          <SuggestionForm
            submitLabel="Odeslat návrh"
            onCancel={() => setShowForm(false)}
            onSubmit={async (data) => {
              const id = await createSuggestion(uid, profile, data);
              setShowForm(false);
              router.push(`/napady/${id}`);
            }}
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {(
          [
            ["list", "Návrhy"],
            ["board", "Vývoj"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-3 py-1.5 text-sm ${view === v ? "bg-white/10 font-semibold" : "text-zinc-400 hover:bg-white/5"}`}
          >
            {label}
          </button>
        ))}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SuggestionCategory | "")}
          className="ml-auto rounded-md border border-white/15 bg-zinc-950 px-2 py-1 text-sm"
        >
          <option value="">Všechny kategorie</option>
          {(Object.keys(SUGGESTION_CATEGORIES) as SuggestionCategory[]).map((c) => (
            <option key={c} value={c}>
              {SUGGESTION_CATEGORIES[c]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-400">Chyba: {error}</p>}
      {actionError && <p className="mb-3 text-sm text-red-400">Nepovedlo se: {actionError}</p>}
      {!items && !error && <p className="text-zinc-400">Načítám…</p>}

      {items && view === "list" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            {(Object.keys(FILTERS) as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 ${filter === f ? "bg-emerald-600 font-semibold" : "bg-zinc-800 hover:bg-zinc-700"}`}
              >
                {FILTERS[f]}
              </button>
            ))}
            <span className="ml-auto text-zinc-400">Řadit:</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as "votes" | "new")} className="rounded-md border border-white/15 bg-zinc-950 px-2 py-1">
              <option value="votes">nejvíc hlasů</option>
              <option value="new">nejnovější</option>
            </select>
          </div>

          {visible.length === 0 && (
            <p className="py-10 text-center text-zinc-400">
              {items.length === 0 ? "Zatím tu nic není. Buď první, kdo něco navrhne!" : "Nic neodpovídá filtru."}
            </p>
          )}
          <ul className="space-y-2">
            {visible.map((s) => (
              <li key={s.id}>
                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-900/40 p-3 hover:border-white/20 hover:bg-zinc-900/80">
                  <VoteButton s={s} uid={uid} onToggle={() => vote(s)} />
                  <Link href={`/napady/${s.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-zinc-500">#{s.number}</span>
                      <span className="font-semibold">{s.title}</span>
                    </div>
                    {s.body && <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{s.body}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <StatusBadge status={s.status} />
                      <CategoryBadge category={s.category} />
                      <span>
                        {s.authorName}
                        {s.classId ? ` (${s.classId})` : ""} · {formatDate(s.createdAt)}
                      </span>
                      {s.commentCount > 0 && <span>💬 {s.commentCount}</span>}
                      {s.assignee && <span>🛠 {s.assignee}</span>}
                    </div>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {items && view === "board" && (
        <Board items={items.filter((s) => !category || s.category === category)} staff={staff} uid={uid} onVote={vote} onMove={move} />
      )}
    </div>
  );
}

function Board({
  items,
  staff,
  uid,
  onVote,
  onMove,
}: {
  items: Suggestion[];
  staff: boolean;
  uid: string | undefined;
  onVote: (s: Suggestion) => void;
  onMove: (id: string, status: SuggestionStatus) => void;
}) {
  const [over, setOver] = useState<SuggestionStatus | null>(null);
  const rejected = items.filter((s) => s.status === "rejected");

  return (
    <div>
      {staff ? (
        <p className="mb-3 text-xs text-zinc-500">Kartu přesuneš přetažením do jiného sloupce (nebo v detailu návrhu).</p>
      ) : (
        <p className="mb-3 text-xs text-zinc-500">Tady vidíš, co tým schválil a na čem se právě pracuje.</p>
      )}
      <div className="grid gap-3 md:grid-cols-4">
        {BOARD.map((status) => {
          const col = items
            .filter((s) => s.status === status)
            .sort((a, b) => b.votes - a.votes || b.number - a.number);
          return (
            <div
              key={status}
              onDragOver={(e) => {
                if (!staff) return;
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={(e) => {
                if (!staff) return;
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain");
                const s = items.find((x) => x.id === id);
                if (s && s.status !== status) onMove(id, status);
              }}
              className={`rounded-xl border p-2 transition ${over === status ? "border-emerald-500/60 bg-emerald-900/20" : "border-white/10 bg-zinc-900/40"}`}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <StatusBadge status={status} />
                <span className="text-xs text-zinc-500">{col.length}</span>
              </div>
              <ul className="min-h-16 space-y-2">
                {col.map((s) => (
                  <li
                    key={s.id}
                    draggable={staff}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", s.id)}
                    className={staff ? "cursor-grab active:cursor-grabbing" : ""}
                  >
                    <div className="rounded-lg border border-white/10 bg-zinc-950 p-2 hover:border-white/25">
                      <div className="flex items-start gap-2">
                        <VoteButton s={s} uid={uid} onToggle={() => onVote(s)} size="sm" />
                        <Link href={`/napady/${s.id}`} draggable={false} className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">
                            <span className="text-zinc-500">#{s.number}</span> {s.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                            <CategoryBadge category={s.category} />
                            {s.commentCount > 0 && <span>💬 {s.commentCount}</span>}
                            {s.assignee && <span>🛠 {s.assignee}</span>}
                            {s.link && <span>🔗 PR</span>}
                          </div>
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {rejected.length > 0 && (
        <details className="mt-4 text-sm text-zinc-400">
          <summary className="cursor-pointer">
            {SUGGESTION_STATUSES.rejected.label} ({rejected.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {rejected.map((s) => (
              <li key={s.id}>
                <Link href={`/napady/${s.id}`} className="hover:underline">
                  #{s.number} {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
