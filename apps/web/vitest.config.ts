import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@schoolos/ui': r('../../packages/ui/src/index.ts'),
      '@schoolos/shared': r('../../packages/shared/src/index.ts'),
      '@schoolos/i18n': r('../../packages/i18n/src/index.ts'),
      '@schoolos/api-client': r('../../packages/api-client/src/index.ts'),
      '@': r('./src'),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    css: false,
    restoreMocks: true,
  },
})
