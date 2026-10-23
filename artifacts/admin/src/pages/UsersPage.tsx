import { useEffect, useState } from "react";
import { Users, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveUserNames, useActiveUsers } from "@/hooks/use-active-users";

type CampusUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  picture?: string;
  lastLoginAt: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<CampusUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeUsers = useActiveUsers();
  const activeUserNames = useActiveUserNames();
  const registeredUsernames = new Set(users.map((user) => user.username.toLowerCase()));
  const activeRegisteredUsers = activeUserNames.filter((username) => registeredUsernames.has(username.toLowerCase())).length;
  const activeGuestUsers = activeUsers === null ? null : Math.max(0, activeUsers - activeRegisteredUsers);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to load users.");
      setUsers(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const deleteUser = async (user: CampusUser) => {
    if (!window.confirm(`Delete the CampusNav account for ${user.email}? This cannot be undone.`)) return;
    setDeletingEmail(user.email);
    setError(null);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(user.email)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete user.");
      }
      await loadUsers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to delete user.");
    } finally {
      setDeletingEmail(null);
    }
  };

  return (
    <div className="p-4 space-y-5 sm:p-6 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Campus Users</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gmail accounts registered in CampusNav</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total registered users</p>
            <p className="mt-1 text-3xl font-bold">{loading ? "..." : users.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Active users now</p>
            <p className="mt-1 text-3xl font-bold">{activeUsers === null ? "..." : activeUsers}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Signed-in users active now</p>
            <p className="mt-1 text-3xl font-bold">{activeUsers === null ? "..." : activeRegisteredUsers}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Guests active now</p>
            <p className="mt-1 text-3xl font-bold">{activeGuestUsers === null ? "..." : activeGuestUsers}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            {users.length} registered {users.length === 1 ? "user" : "users"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading users...</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">{error}</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No users have signed in yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/30 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Last login</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.picture ? (
                            <img src={user.picture} alt="" className="h-9 w-9 rounded-full" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-sky-600 dark:text-sky-400">@{user.username}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Delete user"
                          aria-label={`Delete ${user.email}`}
                          disabled={deletingEmail === user.email}
                          onClick={() => void deleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
