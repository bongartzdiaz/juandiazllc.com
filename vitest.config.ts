import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    // Keep tests pure and deterministic — no Next.js / DB dependencies.
    // All DB-backed modules are excluded or mocked inside the test files.
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'dist'],
    environment: 'node',
    globals: true,
    // Fail fast in CI so the log is readable
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
