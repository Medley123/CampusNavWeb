import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

type CountListener = Dispatch<SetStateAction<number | null>>;

let activeUsersCount: number | null = null;
let activeUserNames: string[] = [];
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<CountListener>();
const nameListeners = new Set<Dispatch<SetStateAction<string[]>>>();

function notify(count: number | null, names: string[] = activeUserNames) {
  activeUsersCount = count;
  activeUserNames = names;
  listeners.forEach((listener) => listener(count));
  nameListeners.forEach((listener) => listener(names));
}

function connect() {
  if (socket || listeners.size === 0) return;

  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${proto}://${window.location.host}/api/ws?client=admin`;

  try {
    socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (typeof data.activeUsers === "number") {
          notify(data.activeUsers, Array.isArray(data.activeUsernames) ? data.activeUsernames : []);
        }
      } catch {}
    };

    socket.onclose = () => {
      socket = null;
      if (listeners.size > 0) {
        reconnectTimer = setTimeout(connect, 4000);
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
  } catch {
    socket = null;
    if (listeners.size > 0) {
      reconnectTimer = setTimeout(connect, 4000);
    }
  }
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
  notify(null);
}

export function useActiveUsers(): number | null {
  const [count, setCount] = useState<number | null>(activeUsersCount);

  useEffect(() => {
    listeners.add(setCount);
    setCount(activeUsersCount);
    connect();

    return () => {
      listeners.delete(setCount);
      if (listeners.size === 0 && nameListeners.size === 0) disconnect();
    };
  }, []);

  return count;
}

export function useActiveUserNames(): string[] {
  const [names, setNames] = useState<string[]>(activeUserNames);

  useEffect(() => {
    nameListeners.add(setNames);
    setNames(activeUserNames);
    connect();

    return () => {
      nameListeners.delete(setNames);
      if (listeners.size === 0 && nameListeners.size === 0) disconnect();
    };
  }, []);

  return names;
}
