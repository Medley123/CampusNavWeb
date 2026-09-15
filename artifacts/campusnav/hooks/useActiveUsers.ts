import { useEffect, useState } from "react";
import { Platform } from "react-native";

export function useActiveUsers(username?: string): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;

    let wsUrl: string;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      wsUrl = `${proto}://${window.location.host}/api/ws?client=app`;
    } else {
      wsUrl = `wss://${domain}/api/ws?client=app`;
    }

    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (username) {
            ws.send(JSON.stringify({ type: "identify", username }));
          }
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data as string);
            if (typeof data.activeUsers === "number") {
              setCount(data.activeUsers);
            }
          } catch {}
        };

        ws.onclose = () => {
          if (!destroyed) {
            reconnectTimer = setTimeout(connect, 4000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, 4000);
        }
      }
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [username]);

  return count;
}
