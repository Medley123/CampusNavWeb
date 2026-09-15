import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type AdminAuthContextValue = {
  username: string | null;
  name: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  updateProfile: (input: { email?: string; name?: string; password?: string }) => Promise<string | null>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/me", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { username?: string; name?: string } | null) => {
        setUsername(data?.username ?? null);
        setName(data?.name ?? null);
      })
      .catch(() => { setUsername(null); setName(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (nextUsername: string, password: string) => {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: nextUsername, password }),
    });
    const data = await response.json().catch(() => null) as { username?: string; name?: string; error?: string } | null;
    if (!response.ok) return data?.error ?? `Unable to sign in (${response.status}).`;
    setUsername(data?.username ?? nextUsername);
    setName(data?.name ?? null);
    return null;
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    setUsername(null);
    setName(null);
  };

  const updateProfile = async (input: { email?: string; name?: string; password?: string }) => {
    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json().catch(() => null) as { email?: string; name?: string; error?: string } | null;
    if (!response.ok) return data?.error ?? "Could not update admin settings.";
    setUsername(data?.email ?? username);
    setName(data?.name ?? name);
    return null;
  };

  return <AdminAuthContext.Provider value={{ username, name, loading, login, logout, updateProfile }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return context;
}
