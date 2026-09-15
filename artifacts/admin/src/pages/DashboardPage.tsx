import { Building2, ChevronRight, Users } from "lucide-react";
import { Link } from "wouter";
import { useListBuildings, useGetBuildingStats } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveUserNames, useActiveUsers } from "@/hooks/use-active-users";

const CATEGORY_STYLES: Record<string, string> = {
  academic: "bg-blue-100 text-blue-800",
  admin: "bg-rose-100 text-rose-800",
  facility: "bg-orange-100 text-orange-800",
  sports: "bg-purple-100 text-purple-800",
};

export default function DashboardPage() {
  const activeUsers = useActiveUsers();
  const activeUserNames = useActiveUserNames();
  const { data: buildings = [], isLoading: buildingsLoading } = useListBuildings();
  const { data: stats, isLoading: statsLoading } = useGetBuildingStats();

  const recentBuildings = buildings.slice(0, 5);
  const loading = buildingsLoading || statsLoading;

  return (
    <div className="p-4 space-y-5 sm:p-6 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">CampusNav overview for CTU Danao Campus</p>
        </div>
        <Link href="/buildings">
          <Button size="sm" className="gap-2">
            <Building2 className="w-4 h-4" />
            Manage Buildings
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-3xl font-bold mt-1">{activeUsers === null ? "-" : activeUsers}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm sm:col-span-2 lg:col-span-1">
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
        <CardHeader>
          <CardTitle className="text-lg">Online Now</CardTitle>
        </CardHeader>
        <CardContent>
          {activeUserNames.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registered users are currently online.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeUserNames.map((username) => (
                <span key={username} className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                  @{username}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Campus Buildings</CardTitle>
          <Link href="/buildings" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
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