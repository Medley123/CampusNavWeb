import "dotenv/config";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { config } from "process";

const rawPort = process.env["PORT"] || "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);

const wss = new WebSocketServer({ server, path: "/api/ws" });
const clients = new Set<WebSocket>();
const appClients = new Map<WebSocket, string | null>();

function broadcast() {
  const usernames = [...appClients.values()].filter((username): username is string => Boolean(username));
  const msg = JSON.stringify({ activeUsers: appClients.size, activeUsernames: usernames });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

wss.on("connection", (ws, request) => {
  const clientType = new URL(request.url ?? "/api/ws", "http://localhost").searchParams.get("client");
  const isAppClient = clientType !== "admin";

  clients.add(ws);
  if (isAppClient) appClients.set(ws, null);
  logger.info({ activeUsers: appClients.size, clientType: isAppClient ? "app" : "admin" }, "WS client connected");
  broadcast();

  ws.on("message", (message) => {
    if (!isAppClient || !appClients.has(ws)) return;
    try {
      const data = JSON.parse(message.toString()) as { type?: string; username?: unknown };
      if (data.type === "identify" && typeof data.username === "string") {
        const username = data.username.trim().slice(0, 30);
        appClients.set(ws, username || null);
        broadcast();
      }
    } catch {}
  });

  ws.on("close", () => {
    clients.delete(ws);
    appClients.delete(ws);
    logger.info({ activeUsers: appClients.size }, "WS client disconnected");
    broadcast();
  });

  ws.on("error", () => {
    clients.delete(ws);
    appClients.delete(ws);
    broadcast();
  });
});

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
