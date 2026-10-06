export type CampusCategory = "Main" | "Satellite" | "Extension";

export interface CampusLocation {
  id: string;
  name: string;
  category: CampusCategory;
  latitude: number;
  longitude: number;
}

export const CTU_CAMPUSES: CampusLocation[] = [
  { id: "main", name: "CTU Main Campus", category: "Main", latitude: 10.2965937, longitude: 123.9065431 },
  { id: "cebu-city-mountain", name: "CTU Cebu City Mountain Campus", category: "Satellite", latitude: 10.3717921, longitude: 123.8455666 },
  { id: "argao", name: "CTU Argao Campus", category: "Satellite", latitude: 9.8824951, longitude: 123.5990736 },
  { id: "barili", name: "CTU Barili Campus", category: "Satellite", latitude: 10.1316901, longitude: 123.5449553 },
  { id: "carmen", name: "CTU Carmen Campus", category: "Satellite", latitude: 10.5823305, longitude: 124.0197016 },
  { id: "daanbantayan", name: "CTU Daanbantayan Campus", category: "Satellite", latitude: 11.265955, longitude: 124.0086419 },
  { id: "danao", name: "CTU Danao Campus", category: "Satellite", latitude: 10.5033511, longitude: 124.0291881 },
  { id: "moalboal", name: "CTU Moalboal Campus", category: "Satellite", latitude: 9.9420258, longitude: 123.3945554 },
  { id: "san-francisco", name: "CTU San Francisco Campus", category: "Satellite", latitude: 10.655385, longitude: 124.3770093 },
  { id: "tuburan", name: "CTU Tuburan Campus", category: "Satellite", latitude: 10.7183674, longitude: 123.8193271 },
  { id: "bantayan", name: "CTU Bantayan Extension Campus", category: "Extension", latitude: 11.1839118, longitude: 123.7261605 },
  { id: "dumanjug", name: "CTU Dumanjug Extension Campus", category: "Extension", latitude: 10.0528911, longitude: 123.4314944 },
  { id: "consolacion", name: "CTU Consolacion Extension Campus", category: "Extension", latitude: 10.3687078, longitude: 123.9709073 },
  { id: "ginatilan", name: "CTU Ginatilan Extension Campus", category: "Extension", latitude: 9.5662271, longitude: 123.3140803 },
  { id: "naga", name: "CTU Naga Extension Campus", category: "Extension", latitude: 10.2090511, longitude: 123.7566073 },
  { id: "malabuyoc", name: "CTU Malabuyoc Extension Campus", category: "Extension", latitude: 9.6515305, longitude: 123.3237866 },
  { id: "tabuelan", name: "CTU Tabuelan Extension Campus", category: "Extension", latitude: 10.845191, longitude: 123.8768132 },
];

export const DEFAULT_CAMPUS = CTU_CAMPUSES.find((campus) => campus.id === "danao")!;

export function getCampusRegion(campus: CampusLocation) {
  return {
    latitude: campus.latitude,
    longitude: campus.longitude,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };
}