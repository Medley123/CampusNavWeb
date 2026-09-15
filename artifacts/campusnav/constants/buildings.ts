export type BuildingCategory = "academic" | "admin" | "facility" | "sports";
export type FloorLevel = "Ground" | "2F" | "3F" | "4F";

export interface Building {
  id: string;
  name: string;
  shortName: string;
  category: BuildingCategory;
  description: string;
  floors: number;
  rooms: string[];
  images?: string[];
  latitude: number;
  longitude: number;
  color: string;
  floorsLocations?: FloorLevel[];
}

export const CAMPUS_CENTER = {
  latitude: 10.50338,
  longitude: 124.02916,
};

export const CAMPUS_REGION = {
  latitude: 10.50338,
  longitude: 124.02916,
  latitudeDelta: 0.0026,
  longitudeDelta: 0.0046,
};

export function getCategoryLabel(category: BuildingCategory): string {
  const labels: Record<BuildingCategory, string> = {
    academic: "Academic",
    admin: "Administrative",
    facility: "Facility",
    sports: "Sports",
  };
  return labels[category];
}

export function getCategoryColor(category: BuildingCategory): string {
  const colors: Record<BuildingCategory, string> = {
    academic: "#1565C0",
    admin: "#800000",
    facility: "#6A1B9A",
    sports: "#E65100",
  };
  return colors[category];
}
