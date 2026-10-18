import { useEffect, useState } from "react";
import { Check, MessageSquare, RefreshCw, Undo2 } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

  const loadFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/feedback", { credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load feedback.");
      setItems(data);
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

  const newCount = items.filter((item) => item.status === "new").length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">User Feedback</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review messages sent from the CampusNav app. {newCount} new.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadFeedback()} disabled={loading} className="gap-2">
          <RefreshCw className="h-4 w-4" />Refresh
        </Button>
      </header>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading feedback...</p>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No feedback received yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <article key={item.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
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
              <Button type="button" size="sm" variant="outline" onClick={() => void setStatus(item)} className="shrink-0 gap-2">
                {item.status === "new" ? <><Check className="h-4 w-4" />Mark resolved</> : <><Undo2 className="h-4 w-4" />Reopen</>}
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}