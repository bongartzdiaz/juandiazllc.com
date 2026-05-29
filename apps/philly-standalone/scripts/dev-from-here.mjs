#!/usr/bin/env node
/* scripts/dev-from-here.mjs
   ──────────────────────────────────────────────────────────────────
   Wrapper that chdir's to this script's parent app directory before
   spawning `next dev`. Exists because the Claude Preview MCP launches
   from the worktree root cwd, but Next.js needs cwd = the app dir so
   it finds next.config.ts + .env.local + the app/ directory.

   Used by .claude/launch.json's "deus-crm" config. Not part of
   production code paths. */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = join(__dirname, '..')  // → apps/philly-standalone

const nextBin = join(appDir, 'node_modules', 'next', 'dist', 'bin', 'next')
const port = process.env.PORT ?? '3400'

console.log(`[dev-from-here] cwd → ${appDir}`)
console.log(`[dev-from-here] starting next dev on port ${port}`)

const child = spawn(process.execPath, [nextBin, 'dev', '--port', port], {
  cwd: appDir,
  stdio: 'inherit',
  env: { ...process.env, PORT: port },
})

child.on('exit', code => {
  process.exit(code ?? 0)
})

// Forward SIGINT/SIGTERM so Ctrl+C cleanly kills the child
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
