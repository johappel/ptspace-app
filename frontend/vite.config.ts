import path from "node:path";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, loadEnv } from "vite";

function normalizeBackendUrl(value: string | undefined): string {
  const configured = value?.trim() ?? "";
  if (!configured) return "";

  try {
    const url = new URL(configured);
    // Browsers may prefer ::1 for localhost while Fastify listens on IPv4.
    // Keep local development deterministic before CORS is involved.
    if (url.hostname === "localhost" || url.hostname === "[::1]") {
      url.hostname = "127.0.0.1";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return configured.replace(/\/$/, "");
  }
}

export default defineConfig(({ mode }) => {
  // The repository keeps the local development .env next to the workspace
  // package.json, while Vite runs with frontend/ as its project root.
  const rootEnv = loadEnv(mode, path.resolve(process.cwd(), ".."), "");
  const backendUrl = normalizeBackendUrl(rootEnv.PUBLIC_BACKEND_URL);

  return {
    plugins: [sveltekit()],
    // PUBLIC_* is deliberately exposed only as the non-secret backend URL.
    envPrefix: ["VITE_", "PUBLIC_"],
    define: {
      "import.meta.env.PUBLIC_BACKEND_URL": JSON.stringify(backendUrl)
    },
    server: {
      port: Number(rootEnv.FRONTEND_PORT ?? 5173),
      proxy: {
        "/api": { target: backendUrl || "http://127.0.0.1:5174", changeOrigin: true },
        "/health": { target: backendUrl || "http://127.0.0.1:5174", changeOrigin: true }
      }
    }
  };
});
