import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { Building } from "@/constants/buildings";

const getApiUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (apiUrl) {
    return `${apiUrl.replace(/\/$/, "")}/api/buildings`;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    const protocol = /^https?:\/\//i.test(domain) ? "" : "https://";
    return `${protocol}${domain.replace(/\/$/, "")}/api/buildings`;
  }

  return "http://localhost:8080/api/buildings";
};

type ApiBuilding = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  category: string;
  description: string;
  floors: number;
  floorsLocations?: Building["floorsLocations"];
  rooms: string[];
  latitude: number;
  longitude: number;
  color: string;
};

let _cache: Building[] | null = null;
let _lastFetch = 0;
const CACHE_TTL = 30_000;

export function useBuildings() {
  const [buildings, setBuildings] = useState<Building[]>(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState<string | null>(null);

  const fetchBuildings = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _cache && now - _lastFetch < CACHE_TTL) {
      setBuildings(_cache);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(getApiUrl());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

const buildingData: ApiBuilding[] = Array.isArray(data)
  ? data
  : Array.isArray(data?.buildings)
    ? data.buildings
    : Array.isArray(data?.data)
      ? data.data
      : [];

const mapped: Building[] = buildingData.map((b) => ({
        id: b.slug,
        name: b.name,
        shortName: b.shortName,
        category: b.category as Building["category"],
        description: b.description,
        floors: b.floors,
        floorsLocations: b.floorsLocations?.length ? b.floorsLocations : ["Ground"],
        rooms: b.rooms ?? [],
        latitude: b.latitude,
        longitude: b.longitude,
        color: b.color,
      }));
      _cache = mapped;
      _lastFetch = Date.now();
      setBuildings(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setBuildings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  return { buildings, loading, error, refetch: () => fetchBuildings(true) };
}
