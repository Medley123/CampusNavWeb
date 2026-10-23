import { haversineDistance } from "@/utils/distance";

export interface WalkingRoutePoint {
  latitude: number;
  longitude: number;
}

export interface WalkingRoute {
  coordinates: WalkingRoutePoint[];
  distanceMeters: number;
}

export type WalkingRouteStatus = "idle" | "loading" | "ready" | "error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodePolyline(encoded: string, precision: number): WalkingRoutePoint[] {
  const factor = 10 ** precision;
  const points: WalkingRoutePoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const values: number[] = [];
    for (let coordinate = 0; coordinate < 2; coordinate++) {
      let result = 0;
      let shift = 0;
      let chunk: number;
      do {
        if (index >= encoded.length) {
          throw new Error("The walking route service returned an incomplete path.");
        }
        chunk = encoded.charCodeAt(index++) - 63;
        if (chunk < 0 || chunk > 63 || shift > 30) {
          throw new Error("The walking route service returned an invalid path.");
        }
        result |= (chunk & 0x1f) << shift;
        shift += 5;
      } while (chunk >= 0x20);
      values.push(result & 1 ? ~(result >> 1) : result >> 1);
    }

    latitude += values[0];
    longitude += values[1];
    points.push({
      latitude: latitude / factor,
      longitude: longitude / factor,
    });
  }

  return points;
}

export async function fetchWalkingRoute(
  start: WalkingRoutePoint,
  destination: WalkingRoutePoint,
  signal: AbortSignal,
): Promise<WalkingRoute> {
  const query = encodeURIComponent(
    JSON.stringify({
      locations: [
        { lat: start.latitude, lon: start.longitude },
        { lat: destination.latitude, lon: destination.longitude },
      ],
      costing: "pedestrian",
      units: "kilometers",
    }),
  );
  const url = `https://valhalla1.openstreetmap.de/route?json=${query}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Walking route service returned HTTP ${response.status}.`);
  }

  const data: unknown = await response.json();
  if (!isRecord(data) || !isRecord(data.trip)) {
    throw new Error("No walking route was found between these locations.");
  }

  const trip = data.trip;
  const legs = trip.legs;
  const summary = trip.summary;
  if (!Array.isArray(legs)) {
    throw new Error("No walking route was found between these locations.");
  }

  const route = legs[0];
  if (
    !isRecord(route) ||
    typeof route.shape !== "string" ||
    !isRecord(summary) ||
    typeof summary.length !== "number"
  ) {
    throw new Error("The walking route service returned an invalid route.");
  }

  const routeCoordinates = decodePolyline(route.shape, 6);

  if (
    routeCoordinates.length < 2 ||
    !routeCoordinates.every(
      (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
    ) ||
    !Number.isFinite(summary.length)
  ) {
    throw new Error("The walking route service returned an incomplete route.");
  }

  const firstRoutePoint = routeCoordinates[0];
  const lastRoutePoint = routeCoordinates[routeCoordinates.length - 1];
  const endpointDistance =
    haversineDistance(start.latitude, start.longitude, firstRoutePoint.latitude, firstRoutePoint.longitude) +
    haversineDistance(
      lastRoutePoint.latitude,
      lastRoutePoint.longitude,
      destination.latitude,
      destination.longitude,
    );

  return {
    coordinates: [start, ...routeCoordinates, destination],
    distanceMeters: summary.length * 1000 + endpointDistance,
  };
}
