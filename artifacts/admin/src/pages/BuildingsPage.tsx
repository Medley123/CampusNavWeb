import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBuildings,
  useGetBuildingStats,
  useDeleteBuilding,
  getListBuildingsQueryKey,
  getGetBuildingStatsQueryKey,
} from "@workspace/api-client-react";
import type { Building } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Search, Pencil, Trash2, GraduationCap, ShieldCheck, Landmark, Trophy } from "lucide-react";
import BuildingFormModal from "@/components/BuildingFormModal";

const CATEGORY_COLORS: Record<string, string> = {
  academic: "bg-blue-100 text-blue-800",
  admin: "bg-rose-100 text-rose-800",
  facility: "bg-orange-100 text-orange-800",
  sports: "bg-purple-100 text-purple-800",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  academic: GraduationCap,
  admin: ShieldCheck,
  facility: Landmark,
  sports: Trophy,
};

function StatsCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BuildingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [deletingBuilding, setDeletingBuilding] = useState<Building | null>(null);

  const { data: buildings = [], isLoading } = useListBuildings();
  const { data: stats } = useGetBuildingStats();
  const deleteBuilding = useDeleteBuilding();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListBuildingsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetBuildingStatsQueryKey() });
  };

  const filtered = buildings.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.shortName.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || b.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async () => {
    if (!deletingBuilding) return;
    try {
      await deleteBuilding.mutateAsync({ id: deletingBuilding.id });
      toast({ title: "Building deleted", description: `${deletingBuilding.name} has been removed.` });
      invalidate();
    } catch {
      toast({ title: "Error", description: "Failed to delete building.", variant: "destructive" });
    } finally {
      setDeletingBuilding(null);
    }
  };

  const handleEdit = (building: Building) => {
    setEditingBuilding(building);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingBuilding(null);
  };

  const categoryStats = stats?.byCategory ?? [];

  return (
    <div className="p-4 space-y-5 sm:p-6 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Campus Buildings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage all CTU Danao Campus locations</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => { setEditingBuilding(null); setFormOpen(true); }}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Building
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total Buildings"
          value={stats?.total ?? 0}
          icon={Building2}
          color="bg-primary/10 text-primary"
        />
        {["academic", "admin", "facility", "sports"].map((cat) => {
          const Icon = CATEGORY_ICONS[cat] ?? Building2;
          const count = categoryStats.find((s) => s.category === cat)?.count ?? 0;
          const colorMap: Record<string, string> = {
            academic: "bg-blue-50 text-blue-600",
            admin: "bg-rose-50 text-rose-600",
            facility: "bg-orange-50 text-orange-600",
            sports: "bg-purple-50 text-purple-600",
          };
          return (
            <StatsCard
              key={cat}
              label={cat.charAt(0).toUpperCase() + cat.slice(1)}
              value={count}
              icon={Icon}
              color={colorMap[cat] ?? "bg-muted text-muted-foreground"}
            />
          );
        })}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search buildings by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="admin">Administrative</SelectItem>
                <SelectItem value="facility">Facility</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <div className="text-center space-y-2">
                <Building2 className="w-8 h-8 mx-auto animate-pulse" />
                <p className="text-sm">Loading buildings...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <div className="text-center space-y-3">
                <Building2 className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm font-medium">No buildings found</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Building</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Floors</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Coordinates</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((building) => (
                    <tr key={building.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {building.images?.[0] ? (
                            <img
                              src={building.images[0]}
                              alt={building.name}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: building.color + "22" }}
                            >
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: building.color }} />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground leading-tight">{building.name}</p>
                            <p className="text-xs text-muted-foreground">{building.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{building.shortName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${CATEGORY_COLORS[building.category] ?? "bg-gray-100 text-gray-800"}`} variant="secondary">
                          {building.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{building.floors}F</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {building.latitude.toFixed(5)}, {building.longitude.toFixed(5)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(building)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingBuilding(building)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t bg-muted/10 text-xs text-muted-foreground">
                Showing {filtered.length} of {buildings.length} buildings
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <BuildingFormModal
        open={formOpen}
        onClose={handleFormClose}
        building={editingBuilding}
        onSuccess={invalidate}
      />

      <AlertDialog open={!!deletingBuilding} onOpenChange={(open) => !open && setDeletingBuilding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Building</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingBuilding?.name}</strong>? This action cannot be undone and will also remove it from the mobile app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBuilding.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
