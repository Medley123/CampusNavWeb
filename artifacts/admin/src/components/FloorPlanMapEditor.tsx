import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type FloorPlanBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type Props = {
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  bounds: FloorPlanBounds;
  onBoundsChange: (bounds: FloorPlanBounds) => void;
};

const MIN_SPAN = 0.00003;

function boundsCenter(bounds: FloorPlanBounds) {
  return [(bounds.north + bounds.south) / 2, (bounds.east + bounds.west) / 2] as [number, number];
}

function toLeafletBounds(bounds: FloorPlanBounds): L.LatLngBounds {
  return L.latLngBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]]);
}

export default function FloorPlanMapEditor({ latitude, longitude, imageUrl, bounds, onBoundsChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const moveHandleRef = useRef<L.Marker | null>(null);
  const northWestHandleRef = useRef<L.Marker | null>(null);
  const southEastHandleRef = useRef<L.Marker | null>(null);
  const boundsRef = useRef(bounds);
  const onBoundsChangeRef = useRef(onBoundsChange);
  boundsRef.current = bounds;
  onBoundsChangeRef.current = onBoundsChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { center: [latitude, longitude], zoom: 18, minZoom: 12, maxZoom: 21 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 21,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
      moveHandleRef.current = null;
      northWestHandleRef.current = null;
      southEastHandleRef.current = null;
    };
  }, []);

  useEffect(() => {
    mapRef.current?.setView([latitude, longitude], 18);
  }, [latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !imageUrl) {
      overlayRef.current?.remove();
      moveHandleRef.current?.remove();
      northWestHandleRef.current?.remove();
      southEastHandleRef.current?.remove();
      overlayRef.current = null;
      moveHandleRef.current = null;
      northWestHandleRef.current = null;
      southEastHandleRef.current = null;
      return;
    }

    const currentBounds = boundsRef.current;
    overlayRef.current?.remove();
    overlayRef.current = L.imageOverlay(imageUrl, toLeafletBounds(currentBounds), { opacity: 0.82, zIndex: 400 }).addTo(map);

    const moveIcon = L.divIcon({
      className: "floor-plan-map-handle",
      html: '<span class="floor-plan-move-handle" title="Drag to move floor plan">Move</span>',
      iconSize: [52, 26],
      iconAnchor: [26, 13],
    });
    const cornerIcon = L.divIcon({
      className: "floor-plan-map-handle",
      html: '<span class="floor-plan-resize-handle" title="Drag to resize floor plan"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    moveHandleRef.current?.remove();
    northWestHandleRef.current?.remove();
    southEastHandleRef.current?.remove();

    const moveHandle = L.marker(boundsCenter(currentBounds), { draggable: true, icon: moveIcon, title: "Drag to move floor plan", zIndexOffset: 1000 }).addTo(map);
    moveHandle.on("dragend", () => {
      const current = boundsRef.current;
      const oldCenter = boundsCenter(current);
      const nextCenter = moveHandle.getLatLng();
      const latitudeDelta = nextCenter.lat - oldCenter[0];
      const longitudeDelta = nextCenter.lng - oldCenter[1];
      const next = {
        north: Math.min(85, current.north + latitudeDelta),
        south: Math.max(-85, current.south + latitudeDelta),
        east: Math.min(180, current.east + longitudeDelta),
        west: Math.max(-180, current.west + longitudeDelta),
      };
      boundsRef.current = next;
      onBoundsChangeRef.current(next);
    });

    const northWestHandle = L.marker([currentBounds.north, currentBounds.west], { draggable: true, icon: cornerIcon, title: "Drag to resize floor plan", zIndexOffset: 1001 }).addTo(map);
    northWestHandle.on("dragend", () => {
      const current = boundsRef.current;
      const point = northWestHandle.getLatLng();
      const next = {
        ...current,
        north: Math.min(85, Math.max(point.lat, current.south + MIN_SPAN)),
        west: Math.max(-180, Math.min(point.lng, current.east - MIN_SPAN)),
      };
      boundsRef.current = next;
      onBoundsChangeRef.current(next);
    });

    const southEastHandle = L.marker([currentBounds.south, currentBounds.east], { draggable: true, icon: cornerIcon, title: "Drag to resize floor plan", zIndexOffset: 1001 }).addTo(map);
    southEastHandle.on("dragend", () => {
      const current = boundsRef.current;
      const point = southEastHandle.getLatLng();
      const next = {
        ...current,
        south: Math.max(-85, Math.min(point.lat, current.north - MIN_SPAN)),
        east: Math.min(180, Math.max(point.lng, current.west + MIN_SPAN)),
      };
      boundsRef.current = next;
      onBoundsChangeRef.current(next);
    });

    moveHandleRef.current = moveHandle;
    northWestHandleRef.current = northWestHandle;
    southEastHandleRef.current = southEastHandle;
  }, [imageUrl]);

  useEffect(() => {
    overlayRef.current?.setBounds(toLeafletBounds(bounds));
    moveHandleRef.current?.setLatLng(boundsCenter(bounds));
    northWestHandleRef.current?.setLatLng([bounds.north, bounds.west]);
    southEastHandleRef.current?.setLatLng([bounds.south, bounds.east]);
  }, [bounds]);

  return <div ref={containerRef} className="h-[min(62vh,620px)] min-h-[360px] w-full overflow-hidden rounded-md border border-border bg-muted" />;
}