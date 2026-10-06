import { useEffect, useRef } from "react";
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
  color?: string;
  onChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ latitude, longitude, color = "#800000", onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 17,
      minZoom: 12,
      maxZoom: 19,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
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

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">Location on Map</p>
      <p className="text-xs text-muted-foreground">
        Click on the map or drag the marker to set the exact building location
      </p>
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
