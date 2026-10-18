import Constants from "expo-constants";
import { Platform } from "react-native";

function apiUrlFromDevHost(host: string) {
  const tunnelHost = host.replace(/-8081(?=\.)/, "-8080");
  if (tunnelHost !== host) return `https://${tunnelHost}`;
  return `http://${host}:8080`;
}

export function getApiBaseUrl() {
  const hostname = Platform.OS === "web" && typeof window !== "undefined"
    ? window.location.hostname
    : "";
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8080";
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/[<>]/g, "");
  if (apiUrl) return apiUrl.replace(/\/$/, "");

  if (hostname) return apiUrlFromDevHost(hostname);

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim().replace(/[<>]/g, "");
  if (domain) {
    const host = domain.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return apiUrlFromDevHost(host);
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.replace(/^https?:\/\//i, "").split("/")[0].replace(/:\d+$/, "");
    if (host && host !== "localhost" && host !== "127.0.0.1") return apiUrlFromDevHost(host);
  }

  return "http://localhost:8080";
}