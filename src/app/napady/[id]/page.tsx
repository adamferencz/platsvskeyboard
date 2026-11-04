"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { CategoryBadge, StatusBadge, SuggestionForm, VoteButton, formatDate, formatDateTime } from "@/components/suggestions";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  addComment,
  deleteComment,
  deleteSuggestion,
  editSuggestion,
  toggleVote,
  updateSuggestionStaff,
  watchComments,
  watchSuggestion,
} from "@/lib/firestore/suggestions";
import {
  COMMENT_MAX,
  SUGGESTION_STATUSES,
  isTeacherRole,
  type Suggestion,
  type SuggestionComment,
  type SuggestionStatus,
} from "@/lib/firestore/types";

export default function SuggestionDetailPage() {
  return (
    <RequireAuth>
      <Detail />
    </RequireAuth>
  );
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile, role, isGuest } = useAuth();
  const staff = isTeacherRole(role);
  const uid = user?.uid;
  const [s, setS] = useState<Suggestion | null | undefined>(undefined);
  const [comments, setComments] = useState<SuggestionComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (isGuest || !id) return;
    const offS = watchSuggestion(id, setS, (e) => setError(e.message));
    const offC = watchComments(id, setComments, (e) => setError(e.message));
    return () => {
      offS();
      offC();
    };
  }, [id, isGuest]);

  const run = (p: Promise<unknown>) => {
    setError(null);
    p.catch((e) => setError((e as Error).message));
  };

  if (isGuest) return <p className="py-20 text-center text-zinc-400">V režimu hosta nápady nejsou dostupné.</p>;
  if (s === undefined && !error) return <p className="py-20 text-center text-zinc-400">Načítám…</p>;
  if (s === null)
    return (
      <div className="py-20 text-center text-zinc-400">
        Návrh neexistuje nebo byl smazán.{" "}
        <Link href="/napady" className="text-emerald-400 hover:underline">
          Zpět na nápady
        </Link>
      </div>
    );
  if (!s) return <p className="py-20 text-center text-red-400">Chyba: {error}</p>;

  const mine = s.uid === uid;
  const canEdit = staff || (mine && s.status === "new");
  const canDelete = staff || (mine && s.status === "new" && s.commentCount === 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/napady" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Všechny nápady
      </Link>

      <div className="mt-3 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
        {editing ? (
          <SuggestionForm
            initial={{ title: s.title, body: s.body, category: s.category }}
            submitLabel="Uložit změny"
            onCancel={() => setEditing(false)}
            onSubmit={async (data) => {
              await editSuggestion(s.id, data);
              setEditing(false);
            }}
          />
        ) : (
          <div className="flex items-start gap-4">
            <VoteButton s={s} uid={uid} onToggle={() => uid && run(toggleVote(s, uid))} />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold">
                <span className="text-zinc-500">#{s.number}</span> {s.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <StatusBadge status={s.status} />
                <CategoryBadge category={s.category} />
                <span>
                  {s.authorName}
                  {s.classId ? ` (${s.classId})` : ""} · {formatDate(s.createdAt)}
                </span>
              </div>
              {s.body ? (
                <p className="mt-4 whitespace-pre-wrap break-words text-zinc-200">{s.body}</p>
              ) : (
                <p className="mt-4 text-sm italic text-zinc-500">Bez popisu.</p>
              )}
              {(s.assignee || s.link) && (
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-300">
                  {s.assignee && <span>🛠 Řeší: {s.assignee}</span>}
                  {s.link && (
                    <a href={s.link} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                      🔗 {s.link.replace(/^https:\/\/(www\.)?github\.com\//, "")}
                    </a>
                  )}
                </div>
              )}
              {(canEdit || canDelete) && (
                <div className="mt-4 flex gap-2 text-sm">
                  {canEdit && (
                    <button onClick={() => setEditing(true)} className="rounded-md border border-white/15 px-3 py-1 hover:bg-white/10">
                      Upravit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        if (!confirm(`Opravdu smazat návrh #${s.number}${s.commentCount ? " i s komentáři" : ""}?`)) return;
                        run(deleteSuggestion(s.id).then(() => router.push("/napady")));
                      }}
                      className="rounded-md px-3 py-1 text-red-400 hover:bg-red-500/10"
                    >
                      Smazat
                    </button>
                  )}
                </div>
              )}
              {mine && !staff && s.status !== "new" && (
                <p className="mt-4 text-xs text-zinc-500">Tým už návrh převzal, upravit ho nejde — doplň případně komentář.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {staff && <StaffPanel s={s} onRun={run} />}

      {error && <p className="mt-3 text-sm text-red-400">Nepovedlo se: {error}</p>}

      <h2 className="mb-3 mt-8 font-semibold">Komentáře ({comments.length})</h2>
      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className={`rounded-lg border p-3 ${c.staff ? "border-emerald-500/30 bg-emerald-950/30" : "border-white/10 bg-zinc-900/40"}`}>
            <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-medium text-zinc-200">{c.authorName}</span>
              {c.staff && <span className="rounded bg-emerald-600/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">TÝM</span>}
              <span>{formatDateTime(c.createdAt)}</span>
              {(staff || c.uid === uid) && (
                <button
                  onClick={() => confirm("Smazat komentář?") && run(deleteComment(s.id, c.id))}
                  className="ml-auto text-zinc-500 hover:text-red-400"
                  title="Smazat komentář"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm text-zinc-200">{c.body}</p>
          </li>
        ))}
        {comments.length === 0 && <li className="text-sm text-zinc-500">Zatím bez komentářů.</li>}
      </ul>

      {uid && profile && <CommentForm onSubmit={(body) => addComment(s.id, { uid, name: profile.displayName, staff }, body)} />}
    </div>
  );
}

function CommentForm({ onSubmit }: { onSubmit: (body: string) => Promise<void> }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        setError(null);
        try {
          await onSubmit(body);
          setBody("");
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={COMMENT_MAX}
        rows={3}
        placeholder="Napiš komentář…"
        className="w-full rounded-md border border-white/15 bg-zinc-950 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button disabled={busy || !body.trim()} className="mt-2 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
        {busy ? "Odesílám…" : "Přidat komentář"}
      </button>
    </form>
  );
}

/** Učitel / admin: posun ve vývoji, kdo to dělá, odkaz na PR. */
function StaffPanel({ s, onRun }: { s: Suggestion; onRun: (p: Promise<unknown>) => void }) {
  const [assignee, setAssignee] = useState(s.assignee ?? "");
  const [link, setLink] = useState(s.link ?? "");
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    setAssignee(s.assignee ?? "");
    setLink(s.link ?? "");
  }, [s.assignee, s.link]);

  const dirty = assignee.trim() !== (s.assignee ?? "") || link.trim() !== (s.link ?? "");

  return (
    <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-950/20 p-4">
      <h2 className="mb-3 text-sm font-semibold text-sky-200">Vývoj (vidí jen tým)</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(SUGGESTION_STATUSES) as SuggestionStatus[]).map((st) => (
          <button
            key={st}
            onClick={() => st !== s.status && onRun(updateSuggestionStaff(s.id, { status: st }))}
            className={`rounded-md border px-3 py-1 text-sm ${
              st === s.status ? `${SUGGESTION_STATUSES[st].color} font-semibold` : "border-white/10 text-zinc-400 hover:bg-white/5"
            }`}
          >
            {SUGGESTION_STATUSES[st].label}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-zinc-400">
          Kdo na tom dělá
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            maxLength={80}
            placeholder="např. Jan Novák (4.A)"
            className="mt-1 w-full rounded-md border border-white/15 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
        <label className="text-xs text-zinc-400">
          Odkaz na PR / issue
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://github.com/…/pull/42"
            className="mt-1 w-full rounded-md border border-white/15 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
      </div>
      {linkError && <p className="mt-2 text-sm text-red-400">{linkError}</p>}
      <button
        disabled={!dirty}
        onClick={() => {
          const l = link.trim();
          if (l && !/^https:\/\/.+/.test(l)) {
            setLinkError("Odkaz musí začínat https://");
            return;
          }
          setLinkError(null);
          onRun(updateSuggestionStaff(s.id, { assignee: assignee.trim() || null, link: l || null }));
        }}
        className="mt-3 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium hover:bg-sky-500 disabled:opacity-40"
      >
        Uložit
      </button>
    </div>
  );
}
