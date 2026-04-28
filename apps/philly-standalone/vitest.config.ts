import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['**/*.test.ts', '**/*.test.tsx'],
    // Integration tests (*.integration.test.ts) require a real
    // MariaDB and are run via the separate vitest.integration.config.ts.
    // Excluding them here keeps `npm test` hermetic.
    exclude: ['node_modules/**', '.next/**', '**/*.integration.test.ts'],
    environment: 'node',
  },
})
