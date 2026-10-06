export const ADMIN_CAMPUSES = [
  { name: "CTU Main Campus", latitude: 10.2965937, longitude: 123.9065431 },
  { name: "CTU Cebu City Mountain Campus", latitude: 10.3717921, longitude: 123.8455666 },
  { name: "CTU Argao Campus", latitude: 9.8824951, longitude: 123.5990736 },
  { name: "CTU Barili Campus", latitude: 10.1316901, longitude: 123.5449553 },
  { name: "CTU Carmen Campus", latitude: 10.5823305, longitude: 124.0197016 },
  { name: "CTU Daanbantayan Campus", latitude: 11.265955, longitude: 124.0086419 },
  { name: "CTU Danao Campus", latitude: 10.5033511, longitude: 124.0291881 },
  { name: "CTU Moalboal Campus", latitude: 9.9420258, longitude: 123.3945554 },
  { name: "CTU San Francisco Campus", latitude: 10.655385, longitude: 124.3770093 },
  { name: "CTU Tuburan Campus", latitude: 10.7183674, longitude: 123.8193271 },
  { name: "CTU Bantayan Extension Campus", latitude: 11.1839118, longitude: 123.7261605 },
  { name: "CTU Dumanjug Extension Campus", latitude: 10.0528911, longitude: 123.4314944 },
  { name: "CTU Consolacion Extension Campus", latitude: 10.3687078, longitude: 123.9709073 },
  { name: "CTU Ginatilan Extension Campus", latitude: 9.5662271, longitude: 123.3140803 },
  { name: "CTU Naga Extension Campus", latitude: 10.2090511, longitude: 123.7566073 },
  { name: "CTU Malabuyoc Extension Campus", latitude: 9.6515305, longitude: 123.3237866 },
  { name: "CTU Tabuelan Extension Campus", latitude: 10.845191, longitude: 123.8768132 },
] as const;

export const CAMPUS_NAMES = ADMIN_CAMPUSES.map((campus) => campus.name);
export const DEFAULT_ADMIN_CAMPUS = ADMIN_CAMPUSES.find((campus) => campus.name === "CTU Danao Campus")!;