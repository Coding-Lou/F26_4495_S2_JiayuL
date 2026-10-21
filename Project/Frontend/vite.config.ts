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
    // endpoint in the same way. FEATURE-005 section 36, D10 adds the owned
    // gear list of the user service, and nothing else of it: not
    // `/api/users/me`. Not the rest of `/api/recommendations` either.
    // FEATURE-009 D26 adds the memory service: the owner Memory endpoints and,
    // in its local storage mode, the signed photo URLs under
    // `/api/memories/local-photos/`, which are root-relative.
    // FEATURE-011 adds plan-service: the owner Plan endpoints, `/api/plans`.
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
      "/api/users/me/gear": {
        target: "http://localhost:8081",
      },
      "/api/memories": {
        target: "http://localhost:8085",
      },
      "/api/plans": {
        target: "http://localhost:8086",
      },
    },
  },
})
