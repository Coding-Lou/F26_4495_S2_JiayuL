import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    // The identity provider only accepts redirects back to this exact origin.
    // Fail to start if the port is taken, so the server can never move to
    // another port without anyone noticing (FEATURE-002 V8).
    port: 5173,
    strictPort: true,
    // Local-development bridge only (FEATURE-003 section 4.8, D2): the
    // recommendation service has no CORS policy and the gateway has no
    // routes, so the browser reaches the planner same-origin through here.
    // FEATURE-004 section 26, D7 adds the trail service and the one pack
    // endpoint in the same way. Nothing else is proxied: not `/api/users`,
    // and not the rest of `/api/recommendations`.
    proxy: {
      "/api/planner": {
        target: "http://localhost:8083",
      },
      "/api/trails": {
        target: "http://localhost:8082",
      },
      "/api/recommendations/pack": {
        target: "http://localhost:8083",
      },
    },
  },
})
