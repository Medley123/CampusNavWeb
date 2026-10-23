import { FormEvent, useEffect, useState } from "react";
import { Info, Pencil, Plus, RefreshCw, Save, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AppUpdate = {
  id: number;
  title: string;
  body: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

const EMPTY_FORM = { title: "", body: "", isPublished: true };

export default function AppUpdatesPage() {
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadUpdates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/app-updates", { credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load app updates.");
      setUpdates(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load app updates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadUpdates(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setMessage(null);
  };

  const saveUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(editingId ? `/api/admin/app-updates/${editingId}` : "/api/admin/app-updates", {
        method: editingId ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not save app update.");
      resetForm();
      setMessage(editingId ? "App update saved." : "App update created.");
      await loadUpdates();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save app update.");
    } finally {
      setSaving(false);
    }
  };

  const editUpdate = (update: AppUpdate) => {
    setEditingId(update.id);
    setForm({ title: update.title, body: update.body, isPublished: update.isPublished });
    setError(null);
    setMessage(null);
  };

  const deleteUpdate = async (update: AppUpdate) => {
    if (!window.confirm(`Delete “${update.title}”?`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/admin/app-updates/${update.id}`, { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not delete app update.");
      }
      if (editingId === update.id) resetForm();
      await loadUpdates();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete app update.");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">App Info & Updates</h1>
          <p className="mt-1 text-sm text-muted-foreground">Publish app news and information for CampusNav users.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadUpdates()} disabled={loading} className="gap-2">
          <RefreshCw className="h-4 w-4" />Refresh
        </Button>
      </header>

      <form onSubmit={saveUpdate} className="space-y-4 border-b border-border pb-6">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">{editingId ? "Edit app update" : "New app update"}</h2>
        </div>
        <label className="block space-y-1.5 text-sm font-medium">Title
          <Input className="bg-background text-foreground" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={120} required />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">Update details
          <Textarea className="bg-background text-foreground" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} maxLength={5000} rows={5} required />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} />
          Publish in the app
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {form.isPublished ? <Send className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : editingId ? "Save changes" : form.isPublished ? "Publish update" : "Save draft"}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm} className="gap-2"><X className="h-4 w-4" />Cancel</Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setForm(EMPTY_FORM)} className="gap-2"><Plus className="h-4 w-4" />Clear</Button>
          )}
        </div>
      </form>

      <section aria-label="App updates">
        <h2 className="mb-2 font-semibold">Posted updates</h2>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading app updates...</p>
        ) : updates.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No app updates yet.</p>
        ) : (
          <div className="space-y-3">
            {updates.map((update) => (
              <article key={update.id} className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{update.title}</h3>
                    <span className={update.isPublished ? "text-xs text-emerald-700" : "text-xs text-muted-foreground"}>
                      {update.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{update.body}</p>
                  <time className="mt-2 block text-xs text-muted-foreground">{new Date(update.updatedAt).toLocaleString()}</time>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="icon" variant="ghost" title="Edit update" aria-label="Edit update" onClick={() => editUpdate(update)}><Pencil className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" title="Delete update" aria-label="Delete update" onClick={() => void deleteUpdate(update)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}