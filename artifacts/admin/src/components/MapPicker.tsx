import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  latitude: number;
  longitude: number;
  campusName: string;
  floorLevels: FloorLevel[];
  color?: string;
  onChange: (lat: number, lng: number) => void;
}

type FloorLevel = "Ground" | "2F" | "3F" | "4F";

type CampusFloorPlan = {
  campusName: string;
  floorLevel: FloorLevel;
  imageUrl: string;
  bounds: { north: number; south: number; east: number; west: number };
};

export default function MapPicker({ latitude, longitude, campusName, floorLevels, color = "#800000", onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const [floorPlans, setFloorPlans] = useState<CampusFloorPlan[]>([]);
  const [floorPlansLoading, setFloorPlansLoading] = useState(true);
  const [floorPlansFailed, setFloorPlansFailed] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<FloorLevel | null>(null);

  useEffect(() => {
    let active = true;
    setFloorPlans([]);
    setFloorPlansLoading(true);
    setFloorPlansFailed(false);

    const loadFloorPlans = async () => {
      try {
        const response = await fetch(`/api/campus-floor-plans?campusName=${encodeURIComponent(campusName)}`, { credentials: "same-origin" });
        if (!response.ok) throw new Error("Could not load floor plans.");
        const plans = await response.json() as CampusFloorPlan[];
        if (!active) return;
        setFloorPlans(plans);
        setSelectedFloor(plans.find((plan) => plan.floorLevel === "Ground")?.floorLevel ?? plans[0]?.floorLevel ?? null);
      } catch {
        if (active) {
          setFloorPlansFailed(true);
          setFloorPlans([]);
        }
      } finally {
        if (active) setFloorPlansLoading(false);
      }
    };

    void loadFloorPlans();
    return () => { active = false; };
  }, [campusName]);

  const availablePlans = floorPlans.filter((plan) => plan.campusName === campusName && floorLevels.includes(plan.floorLevel));
  const activePlan = availablePlans.find((plan) => plan.floorLevel === selectedFloor) ?? availablePlans[0] ?? null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 17,
      minZoom: 12,
      maxZoom: 19,
    });

    L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width:18px;height:18px;
        background:${color};
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        cursor:pointer;
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const marker = L.marker([latitude, longitude], { icon, draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChange(parseFloat(pos.lat.toFixed(7)), parseFloat(pos.lng.toFixed(7)));
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onChange(parseFloat(lat.toFixed(7)), parseFloat(lng.toFixed(7)));
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markerRef.current) return;
    const current = markerRef.current.getLatLng();
    if (Math.abs(current.lat - latitude) > 0.000001 || Math.abs(current.lng - longitude) > 0.000001) {
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (!markerRef.current) return;
    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width:18px;height:18px;
        background:${color};
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        cursor:pointer;
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    markerRef.current.setIcon(icon);
  }, [color]);

  useEffect(() => {
    const map = mapRef.current;
    overlayRef.current?.remove();
    overlayRef.current = null;
    if (!map || !activePlan) return;

    const bounds = L.latLngBounds(
      [activePlan.bounds.south, activePlan.bounds.west],
      [activePlan.bounds.north, activePlan.bounds.east],
    );
    overlayRef.current = L.imageOverlay(activePlan.imageUrl, bounds, { opacity: 0.82, zIndex: 400 }).addTo(map);
    overlayRef.current.getElement()?.style.setProperty("object-fit", "contain");
    map.fitBounds(bounds.pad(0.5), { maxZoom: 19 });

    return () => {
      overlayRef.current?.remove();
      overlayRef.current = null;
    };
  }, [activePlan]);

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">Location on Map</p>
      <p className="text-xs text-muted-foreground">
        Click on the map or drag the marker to set the exact building location
      </p>
      {availablePlans.length > 0 ? (
        <label className="flex items-center gap-2 text-xs font-medium text-foreground">
          Floor plan
          <select
            value={activePlan?.floorLevel ?? ""}
            onChange={(event) => setSelectedFloor(event.target.value as FloorLevel)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            {availablePlans.map((plan) => <option key={plan.floorLevel} value={plan.floorLevel}>{plan.floorLevel}</option>)}
          </select>
        </label>
      ) : (
        <p className="text-xs text-muted-foreground">
          {floorPlansLoading ? "Loading campus floor plans..." : floorPlansFailed ? "Campus floor plans could not be loaded." : "No floor plan saved for the selected floors."}
        </p>
      )}
      <div
        ref={containerRef}
        className="w-full rounded-lg border border-border overflow-hidden"
        style={{ height: 260, zIndex: 0 }}
      />
      <p className="text-xs text-muted-foreground font-mono">
        {latitude.toFixed(7)}°N, {longitude.toFixed(7)}°E
      </p>
    </div>
  );
}
