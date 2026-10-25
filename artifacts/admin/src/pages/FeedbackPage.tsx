import { useEffect, useState } from "react";
import { Check, MessageSquare, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Feedback = {
  id: number;
  userEmail: string | null;
  username: string | null;
  userName: string | null;
  message: string;
  status: "new" | "resolved";
  createdAt: string;
};

export default function FeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const loadFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/feedback", { credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load feedback.");
      setItems(data);
      setSelected(new Set());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadFeedback(); }, []);

  const setStatus = async (item: Feedback) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/feedback/${item.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: item.status === "new" ? "resolved" : "new" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not update feedback status.");
      setItems((current) => current.map((entry) => entry.id === item.id ? data : entry));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update feedback status.");
    }
  };

  const toggleOne = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  };

  const deleteFeedback = async (ids: number[], all: boolean) => {
    if (ids.length === 0) return;
    const label = all
      ? `Delete all ${ids.length} feedback message${ids.length === 1 ? "" : "s"}? This cannot be undone.`
      : `Delete ${ids.length} selected feedback message${ids.length === 1 ? "" : "s"}? This cannot be undone.`;
    if (!window.confirm(label)) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/feedback", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { ids }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not delete feedback.");

      const removed = new Set(ids);
      setItems((current) => current.filter((item) => !removed.has(item.id)));
      setSelected(new Set());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete feedback.");
    } finally {
      setDeleting(false);
    }
  };

  const newCount = items.filter((item) => item.status === "new").length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">User Feedback</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review messages sent from the CampusNav app. {newCount} new.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadFeedback()} disabled={loading || deleting} className="gap-2">
          <RefreshCw className="h-4 w-4" />Refresh
        </Button>
      </header>

      {!loading && items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer accent-primary"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={toggleAll}
              disabled={deleting}
              aria-label="Select all feedback"
            />
            {selected.size > 0 ? `${selected.size} selected` : "Select all"}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={selected.size === 0 || deleting}
              onClick={() => void deleteFeedback(Array.from(selected), false)}
              className="gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />Delete selected{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deleting}
              onClick={() => void deleteFeedback(items.map((item) => item.id), true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />Delete all
            </Button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading feedback...</p>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No feedback received yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <article
                key={item.id}
                className={`flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm ${isSelected ? "border-primary" : "border-border"}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                  checked={isSelected}
                  onChange={() => toggleOne(item.id)}
                  disabled={deleting}
                  aria-label={`Select feedback from ${item.userName || item.username || "CampusNav user"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.userName || (item.username ? `@${item.username}` : "CampusNav user")}</p>
                    {item.status === "new" && <span className="text-xs font-semibold text-primary">New</span>}
                  </div>
                  {(item.userEmail || item.username) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.userEmail || `@${item.username}`}</p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{item.message}</p>
                  <time className="mt-2 block text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</time>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => void setStatus(item)} disabled={deleting} className="gap-2">
                    {item.status === "new" ? <><Check className="h-4 w-4" />Mark resolved</> : <><Undo2 className="h-4 w-4" />Reopen</>}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void deleteFeedback([item.id], false)}
                    disabled={deleting}
                    className="gap-2 text-destructive"
                    aria-label="Delete this feedback"
                  >
                    <Trash2 className="h-4 w-4" />Delete
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}