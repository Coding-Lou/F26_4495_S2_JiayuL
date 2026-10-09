import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/user-api': {
          target: env.VITE_USER_SERVICE_PROXY_TARGET ?? 'http://localhost:8081',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/user-api/, ''),
        },
        '/trail-api': {
          target: env.VITE_TRAIL_SERVICE_PROXY_TARGET ?? 'http://localhost:8082',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/trail-api/, ''),
        },
      },
    },
  }
})
