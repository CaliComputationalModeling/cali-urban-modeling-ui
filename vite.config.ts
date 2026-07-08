import { defineConfig } from "vitest/config"
import { loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendProxy = {
    target: env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000',
    changeOrigin: true,
  }

  return {
    plugins: [react(),
        tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': backendProxy,
        '/auth': backendProxy,
        '/users': backendProxy,
        '/roles': backendProxy,
        '/observations': backendProxy,
        '/observaciones': backendProxy,
        '/storage': backendProxy,
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      globals: true,
      include: ['src/test/**/*.test.ts', 'src/test/**/*.test.tsx', 'src/test/test_*.tsx'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
