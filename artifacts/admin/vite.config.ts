import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawPort = env.PORT || process.env.PORT || "5173";
  const port = Number(rawPort);
  const basePath = env.BASE_PATH || process.env.BASE_PATH || "/";

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      cors: {
        origin: [/^https?:\/\/localhost(?::\d+)?$/, /^https:\/\/[a-z0-9-]+\.asse\.devtunnels\.ms$/],
      },
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
      // GI-ADD: Gi-forward ang tanang /api ug /api/ws HTTP/WebSocket requests ngadto sa backend server (port 8080)
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
