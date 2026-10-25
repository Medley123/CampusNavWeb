import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, RefreshCw, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/use-admin-auth";

type Conversation = {
  adminId: number;
  adminName: string;
  adminEmail?: string;
  campusName: string;
  isActive?: boolean;
  latestMessage: string | null;
  latestAt: string | null;
  unreadCount: number;
};

type ChatMessage = {
  id: number;
  senderAdminId: number | null;
  senderRole: "super_admin" | "campus_admin";
  senderName: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "";
}

export default function AdminChatPage() {
  const { role } = useAdminAuth();
  const isSuperAdmin = role === "super_admin";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedAdminIdRef = useRef(selectedAdminId);
  selectedAdminIdRef.current = selectedAdminId;

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/admin/chat/conversations", { credentials: "same-origin" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Could not load conversations.");
    const next = data as Conversation[];
    setConversations(next);
    if (!isSuperAdmin && next[0]) setSelectedAdminId(next[0].adminId);
    else if (isSuperAdmin && !next.some((conversation) => conversation.adminId === selectedAdminId)) {
      setSelectedAdminId(next[0]?.adminId ?? null);
    }
  }, [isSuperAdmin, selectedAdminId]);

  const loadMessages = useCallback(async (adminId: number) => {
    const response = await fetch(`/api/admin/chat/${adminId}/messages`, { credentials: "same-origin" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Could not load messages.");
    if (selectedAdminIdRef.current === adminId) {
      const next = data as ChatMessage[];
      setMessages(next);
      // Keep selection in sync with the 6-second polling refresh.
      const validIds = new Set(next.map((message) => message.id));
      setSelectedIds((current) => new Set([...current].filter((id) => validIds.has(id))));
    }
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      await loadConversations();
      if (selectedAdminId !== null) await loadMessages(selectedAdminId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not refresh chat.");
    } finally {
      setLoading(false);
    }
  }, [loadConversations, loadMessages, selectedAdminId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 6000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    setMessages([]);
    setSelectedIds(new Set());
    if (selectedAdminId !== null) {
      void loadMessages(selectedAdminId).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Could not load messages.");
      });
    }
  }, [selectedAdminId, loadMessages]);

  const selectedConversation = conversations.find((conversation) => conversation.adminId === selectedAdminId) ?? null;

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || selectedAdminId === null || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/chat/${selectedAdminId}/messages`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not send message.");
      setDraft("");
      await Promise.all([loadMessages(selectedAdminId), loadConversations()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = messages.length > 0 && selectedIds.size === messages.length;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(messages.map((message) => message.id)));
  };

  const deleteMessages = async (all: boolean) => {
    if (selectedAdminId === null) return;
    const ids = all ? messages.map((message) => message.id) : Array.from(selectedIds);
    if (ids.length === 0) return;

    const count = `${ids.length} message${ids.length === 1 ? "" : "s"}`;
    const label = all
      ? `Delete all ${count} in this conversation? This cannot be undone.`
      : `Delete ${count}? This cannot be undone.`;
    if (!window.confirm(label)) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/chat/${selectedAdminId}/messages`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { ids }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not delete messages.");

      const removed = new Set(ids);
      setMessages((current) => current.filter((message) => !removed.has(message.id)));
      setSelectedIds(new Set());
      await loadConversations();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete messages.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{isSuperAdmin ? "Admin Chat" : "Chat with Super Admin"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperAdmin ? "Reply to messages from campus administrators." : "Send a message to the CampusNav Super Admin."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={loading || deleting} className="gap-2">
          <RefreshCw className="h-4 w-4" />Refresh
        </Button>
      </header>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <section className={`grid min-h-[520px] overflow-hidden rounded-lg border border-border bg-card ${isSuperAdmin ? "md:grid-cols-[280px_minmax(0,1fr)]" : "grid-cols-1"}`}>
        {isSuperAdmin && (
          <aside className="border-b border-border md:border-b-0 md:border-r">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Campus administrators</h2>
            <div className="max-h-56 overflow-y-auto md:max-h-[520px]">
              {conversations.map((conversation) => (
                <button
                  key={conversation.adminId}
                  type="button"
                  onClick={() => setSelectedAdminId(conversation.adminId)}
                  className={`w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted ${selectedAdminId === conversation.adminId ? "bg-muted" : ""}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{conversation.adminName}</span>
                    {conversation.unreadCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{conversation.unreadCount}</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{conversation.campusName}</span>
                  {conversation.latestMessage && <span className="mt-1 block truncate text-xs text-muted-foreground">{conversation.latestMessage}</span>}
                </button>
              ))}
              {!loading && conversations.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">No campus administrators found.</p>}
            </div>
          </aside>
        )}

        <div className="flex min-h-[520px] min-w-0 flex-col">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-sky-600 dark:text-sky-400">{isSuperAdmin ? selectedConversation?.adminName ?? "Select a conversation" : "Super Admin"}</p>
            <p className="text-xs text-muted-foreground">{selectedConversation?.campusName ?? "CampusNav support"}</p>
          </div>

          {messages.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-primary"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={deleting}
                  aria-label="Select all messages"
                />
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={selectedIds.size === 0 || deleting}
                  onClick={() => void deleteMessages(false)}
                  className="gap-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />Delete selected{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => void deleteMessages(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />Delete all
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {loading && messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading conversation...</p>
            ) : messages.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm">No messages yet. Start the conversation below.</p>
              </div>
            ) : messages.map((message) => {
              const ownMessage = message.senderRole === role;
              const isSelected = selectedIds.has(message.id);
              return (
                <div key={message.id} className={`flex items-center gap-2 ${ownMessage ? "justify-end" : "justify-start"}`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
                    checked={isSelected}
                    onChange={() => toggleOne(message.id)}
                    disabled={deleting}
                    aria-label={`Select message from ${message.senderName}`}
                  />
                  <article className={`max-w-[85%] rounded-xl px-3 py-2 ${ownMessage ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"} ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}>
                    <p className={`mb-1 text-xs font-semibold ${ownMessage ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{message.senderName}</p>
                    <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>
                    <time className={`mt-1 block text-right text-[10px] ${ownMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{formatTime(message.createdAt)}</time>
                  </article>
                </div>
              );
            })}
          </div>

          <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2 border-t border-border p-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              maxLength={4000}
              rows={2}
              placeholder="Write a message... (Enter to send)"
              aria-label="Message"
              disabled={selectedAdminId === null || sending || (isSuperAdmin && selectedConversation?.isActive === false)}
              className="min-h-10 flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-sky-700 outline-none placeholder:text-sky-600 focus-visible:ring-2 focus-visible:ring-ring dark:text-sky-300 dark:placeholder:text-sky-400"
            />
            <Button type="submit" disabled={!draft.trim() || selectedAdminId === null || sending || (isSuperAdmin && selectedConversation?.isActive === false)} className="gap-2 border-yellow-500 bg-yellow-400 text-yellow-950 hover:bg-yellow-500">
              <Send className="h-4 w-4" />{sending ? "Sending..." : "Send"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}