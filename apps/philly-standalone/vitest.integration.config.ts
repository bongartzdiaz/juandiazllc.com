/* Integration-test config: hits a real MariaDB via DATABASE_URL.
   Run via `npm run test:integration` — see scripts/test-integration.sh.
   Kept separate from vitest.config.ts so unit tests stay hermetic. */

import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['lib/**/*.integration.test.ts', 'app/**/*.integration.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
    environment: 'node',
    // One test file at a time — these tests share the DB and would
    // race if run in parallel. The cost is ~2× wall time but the
    // determinism is worth it.
    fileParallelism: false,
    // Each test gets a fresh org pair so we don't need cross-test
    // cleanup, but we still want generous timeouts for the docker
    // round-trip on cold start.
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
})
