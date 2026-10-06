import { FormEvent, useEffect, useState } from "react";
import { Building2, Pencil, Play, Plus, RefreshCw, Save, Shield, Trash2, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CAMPUS_NAMES } from "@/lib/campuses";

type CampusAdmin = {
  id: number;
  email: string;
  name: string;
  campusName: string;
  isActive: boolean;
  createdAt: string;
};

const EMPTY_FORM = { email: "", name: "", campusName: "CTU Danao Campus", password: "" };

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<CampusAdmin[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/accounts", { credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load admin accounts.");
      setAccounts(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load admin accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(editingId ? `/api/admin/accounts/${editingId}` : "/api/admin/accounts", {
        method: editingId ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...(editingId && !form.password ? { password: undefined } : {}) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not save admin account.");
      resetForm();
      await loadAccounts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save admin account.");
    } finally {
      setSaving(false);
    }
  };

  const editAccount = (account: CampusAdmin) => {
    setEditingId(account.id);
    setForm({ email: account.email, name: account.name, campusName: account.campusName, password: "" });
    setError(null);
  };

  const updateAccount = async (account: CampusAdmin, updates: { isActive?: boolean } | { delete: true }) => {
    if ("delete" in updates && !window.confirm(`Delete the admin account for ${account.campusName}?`)) return;
    setError(null);
    try {
      const response = "delete" in updates
        ? await fetch(`/api/admin/accounts/${account.id}`, { method: "DELETE", credentials: "same-origin" })
        : await fetch(`/api/admin/accounts/${account.id}`, {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not update admin account.");
      }
      await loadAccounts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update admin account.");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Campus Admins</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage admin access and campus assignments.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadAccounts()} disabled={loading} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <form onSubmit={saveAccount} className="space-y-4 border-b border-border pb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">{editingId ? "Edit campus admin" : "Create campus admin"}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">Admin name
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength={2} required />
          </label>
          <label className="space-y-1.5 text-sm font-medium">Gmail address
            <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </label>
          <label className="space-y-1.5 text-sm font-medium">Assigned campus
            <select value={form.campusName} onChange={(event) => setForm({ ...form, campusName: event.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {CAMPUS_NAMES.map((campusName) => <option key={campusName}>{campusName}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">{editingId ? "New password (optional)" : "Password"}
            <Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={form.password || !editingId ? 8 : undefined} required={!editingId} autoComplete="new-password" />
          </label>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? "Saving..." : editingId ? "Save changes" : "Create admin"}</Button>
          {editingId && <Button type="button" variant="outline" onClick={resetForm} className="gap-2"><X className="h-4 w-4" />Cancel</Button>}
        </div>
      </form>

      {error && !editingId && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading campus admins...</p>
      ) : accounts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Building2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No campus admins yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-3 font-medium">Admin</th>
                <th className="px-3 py-3 font-medium">Campus</th>
                <th className="px-3 py-3 font-medium">Access</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      <div><p className="font-medium">{account.name}</p><p className="text-xs text-muted-foreground">{account.email}</p></div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{account.campusName}</td>
                  <td className="px-3 py-3">
                    <span className={account.isActive ? "text-emerald-700" : "text-muted-foreground"}>
                      {account.isActive ? "Active" : "Blocked"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <Button type="button" size="icon" variant="ghost" title="Edit admin" aria-label="Edit admin" onClick={() => editAccount(account)}><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" title={account.isActive ? "Block admin" : "Unblock admin"} aria-label={account.isActive ? "Block admin" : "Unblock admin"} onClick={() => void updateAccount(account, { isActive: !account.isActive })}>
                        {account.isActive ? <X className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button type="button" size="icon" variant="ghost" title="Delete admin" aria-label="Delete admin" onClick={() => void updateAccount(account, { delete: true })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}