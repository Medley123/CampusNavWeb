import { useEffect, useState } from "react";
import { Building2, ChevronRight, MapPin, ShieldCheck, Users } from "lucide-react";
import { Link } from "wouter";
import { useListBuildings, useGetBuildingStats } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_CAMPUSES } from "@/lib/campuses";

const CATEGORY_STYLES: Record<string, string> = {
  academic: "bg-blue-100 text-blue-800",
  admin: "bg-rose-100 text-rose-800",
  facility: "bg-orange-100 text-orange-800",
  sports: "bg-purple-100 text-purple-800",
};

export default function DashboardPage({ campusName, isSuperAdmin = false }: { campusName: string | null; isSuperAdmin?: boolean }) {
  const { data: buildings = [], isLoading: buildingsLoading } = useListBuildings();
  const { data: stats, isLoading: statsLoading } = useGetBuildingStats();

  if (isSuperAdmin) {
    return <SuperAdminDashboard buildings={buildings} buildingsLoading={buildingsLoading || statsLoading} />;
  }

  const recentBuildings = buildings.slice(0, 5);
  const loading = buildingsLoading || statsLoading;

  return (
    <div className="p-4 space-y-5 sm:p-6 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{isSuperAdmin ? "System Dashboard" : "Dashboard"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isSuperAdmin ? "CampusNav overview across all campuses" : `CampusNav overview for ${campusName || "your campus"}`}
          </p>
        </div>
        {!isSuperAdmin && (
          <Link href="/buildings">
            <Button size="sm" className="gap-2">
              <Building2 className="w-4 h-4" />
              Manage Buildings
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Buildings</p>
              <p className="text-3xl font-bold mt-1">{loading ? "-" : stats?.total ?? buildings.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Building Categories</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {(stats?.byCategory ?? []).map((category) => (
                <span
                  key={category.category}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_STYLES[category.category] ?? "bg-muted text-muted-foreground"}`}
                >
                  {category.category}: {category.count}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">{isSuperAdmin ? "Buildings Across Campuses" : "Campus Buildings"}</CardTitle>
          {!isSuperAdmin && (
            <Link href="/buildings" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {buildingsLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading buildings...</div>
          ) : recentBuildings.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No buildings have been added yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {recentBuildings.map((building) => (
                <div key={building.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{building.name}</p>
                    <p className="text-xs text-muted-foreground">{building.shortName} · {building.floors} floors</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_STYLES[building.category] ?? "bg-muted text-muted-foreground"}`}>
                    {building.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type CampusAdmin = {
  id: number;
  name: string;
  campusName: string;
  isActive: boolean;
};

type CampusUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  lastLoginAt: string | null;
};

function SuperAdminDashboard({
  buildings,
  buildingsLoading,
}: {
  buildings: { campusName: string }[];
  buildingsLoading: boolean;
}) {
  const [admins, setAdmins] = useState<CampusAdmin[]>([]);
  const [users, setUsers] = useState<CampusUser[]>([]);
  const [systemLoading, setSystemLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSystemData = async () => {
      setSystemLoading(true);
      setError(null);
      try {
        const [adminsResponse, usersResponse] = await Promise.all([
          fetch("/api/admin/accounts", { credentials: "same-origin" }),
          fetch("/api/users", { credentials: "same-origin" }),
        ]);
        const [adminsData, usersData] = await Promise.all([adminsResponse.json(), usersResponse.json()]);
        if (!adminsResponse.ok) throw new Error(adminsData?.error || "Could not load campus admins.");
        if (!usersResponse.ok) throw new Error(usersData?.error || "Could not load campus users.");
        if (!cancelled) {
          setAdmins(adminsData);
          setUsers(usersData);
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load system overview.");
      } finally {
        if (!cancelled) setSystemLoading(false);
      }
    };

    void loadSystemData();
    return () => { cancelled = true; };
  }, []);

  const campusRows = ADMIN_CAMPUSES.map(({ name }) => {
    const campusAdmins = admins.filter((admin) => admin.campusName === name);
    return {
      name,
      activeAdmins: campusAdmins.filter((admin) => admin.isActive).length,
      totalAdmins: campusAdmins.length,
      buildings: buildings.filter((building) => building.campusName === name).length,
    };
  });
  const campusesWithAdmins = campusRows.filter((campus) => campus.activeAdmins > 0).length;
  const activeAdmins = admins.filter((admin) => admin.isActive).length;
  const loading = systemLoading || buildingsLoading;
  const recentUsers = users.slice(0, 5);

  return (
    <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
      <header>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">System Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Systemwide campus coverage, administrator access, and user activity.</p>
      </header>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <section aria-label="System totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Campuses with active admins" value={loading ? "-" : `${campusesWithAdmins} / ${ADMIN_CAMPUSES.length}`} detail="Coverage across CTU campuses" icon={MapPin} />
        <SummaryCard label="Campus administrators" value={loading ? "-" : admins.length} detail={`${activeAdmins} active · ${admins.length - activeAdmins} blocked`} icon={ShieldCheck} />
        <SummaryCard label="Registered users" value={loading ? "-" : users.length} detail="CampusNav accounts" icon={Users} />
        <SummaryCard label="Buildings" value={loading ? "-" : buildings.length} detail="Across all campuses" icon={Building2} />
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Campus coverage</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Administrator access and building records by campus.</p>
          </div>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Manage admins <ChevronRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-y bg-muted/30 text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Campus</th>
                  <th className="px-5 py-3 font-medium">Admins</th>
                  <th className="px-5 py-3 font-medium">Buildings</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campusRows.map((campus) => {
                  const status = campus.activeAdmins > 0 ? "Active" : campus.totalAdmins > 0 ? "Blocked" : "No admin";
                  return (
                    <tr key={campus.name}>
                      <td className="px-5 py-3 font-medium">{campus.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{loading ? "-" : `${campus.activeAdmins} active / ${campus.totalAdmins}`}</td>
                      <td className="px-5 py-3 text-muted-foreground">{loading ? "-" : campus.buildings}</td>
                      <td className="px-5 py-3">
                        <span className={campus.activeAdmins > 0 ? "font-medium text-emerald-700" : "font-medium text-muted-foreground"}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent user activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {systemLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading user activity...</p>
            ) : recentUsers.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No users have signed in yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{user.name || user.username}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <time className="shrink-0 text-right text-xs text-muted-foreground">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "No sign-in yet"}
                    </time>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-border px-5 py-3">
              <Link href="/users" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                View all users <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Quick access</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-start gap-2">
            <Link href="/" className="text-sm text-primary hover:underline">Campus admin accounts</Link>
            <Link href="/users" className="text-sm text-primary hover:underline">Registered users</Link>
            <Link href="/floor-plans" className="text-sm text-primary hover:underline">Campus floor plans</Link>
            <Link href="/settings" className="text-sm text-primary hover:underline">System settings</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Building2 }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}