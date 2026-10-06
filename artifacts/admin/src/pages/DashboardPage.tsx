import { Building2, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useListBuildings, useGetBuildingStats } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORY_STYLES: Record<string, string> = {
  academic: "bg-blue-100 text-blue-800",
  admin: "bg-rose-100 text-rose-800",
  facility: "bg-orange-100 text-orange-800",
  sports: "bg-purple-100 text-purple-800",
};

export default function DashboardPage({ campusName }: { campusName: string | null }) {
  const { data: buildings = [], isLoading: buildingsLoading } = useListBuildings();
  const { data: stats, isLoading: statsLoading } = useGetBuildingStats();

  const recentBuildings = buildings.slice(0, 5);
  const loading = buildingsLoading || statsLoading;

  return (
    <div className="p-4 space-y-5 sm:p-6 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">CampusNav overview for {campusName || "your campus"}</p>
        </div>
        <Link href="/buildings">
          <Button size="sm" className="gap-2">
            <Building2 className="w-4 h-4" />
            Manage Buildings
          </Button>
        </Link>
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