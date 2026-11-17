import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SchoolOS',
        short_name: 'SchoolOS',
        description: 'School management, calm and clear.',
        theme_color: '#4f46e5',
        background_color: '#f7f8fc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@schoolos/ui': r('../../packages/ui/src/index.ts'),
      '@schoolos/shared': r('../../packages/shared/src/index.ts'),
      '@schoolos/analytics-core': r('../../packages/analytics-core/src/index.ts'),
      '@schoolos/i18n': r('../../packages/i18n/src/index.ts'),
      '@schoolos/api-client': r('../../packages/api-client/src/index.ts'),
      '@': r('./src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8085',
      '/config': 'http://localhost:8085',
      '/session': 'http://localhost:8085',
      '/auth': 'http://localhost:8085',
      '/demo': 'http://localhost:8085',
      '/account': 'http://localhost:8085',
      '/security': 'http://localhost:8085',
      '/admin': 'http://localhost:8085',
      '/healthz': 'http://localhost:8085',
    },
  },
  build: { target: 'es2022', sourcemap: false },
})
