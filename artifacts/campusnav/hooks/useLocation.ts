import { useEffect, useState } from "react";
import { Platform } from "react-native";

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationState {
  coords: LocationCoords | null;
  loading: boolean;
  error: string | null;
  permissionGranted: boolean;
  requestLocation: () => Promise<void>;
}

export function useLocation(): LocationState {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      if (Platform.OS === "web") {
        if (!navigator.geolocation) {
          setError("Geolocation not supported on this browser.");
          setLoading(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoords({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setPermissionGranted(true);
            setLoading(false);
          },
          () => {
            setError("Unable to retrieve location.");
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission denied.");
          setLoading(false);
          return;
        }
        setPermissionGranted(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        setLoading(false);
      }
    } catch {
      setError("Failed to get location.");
      setLoading(false);
    }
  };

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { coords, loading, error, permissionGranted, requestLocation };
}
