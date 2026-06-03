// FE-01 facts-first inventory: classify every app/**/page.tsx that consumes
// the useApi data hook by which list-states it actually RENDERS:
//   - loading   (skeleton/spinner shown while .loading)
//   - error     (error message shown when .error)
//   - retry     (a button/handler wired to .refetch on the error path)
//   - empty     (empty-state shown when the list has 0 rows)
// Emits a clustered, batch-ordered table. Read-only.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const APP = join(process.cwd(), 'app')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'api') continue // skip route handlers
      walk(p, out)
    } else if (name === 'page.tsx') out.push(p)
  }
  return out
}

function strip(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

const rows = []
for (const file of walk(APP)) {
  const raw = readFileSync(file, 'utf8')
  const src = strip(raw)
  const usesApi = /\buseApi\s*[<(]/.test(src) || /\.refetch\b/.test(src)
  if (!usesApi) continue

  // Does the page read .loading / .error from a useApi return?
  const readsLoading = /\.loading\b|isLoading|isLiveLoading/.test(src)
  const readsError = /\.error\b/.test(src)

  // Heuristics for RENDERED states. A state counts if the page uses the
  // shared <List*> primitive OR has a plausible inline equivalent (bare
  // `loading`/`error` vars and hardcoded text included — those are the
  // legacy patterns the sweep replaces).
  const usesShared = /<ListLoading|<ListError|<ListEmpty/.test(src)
  const rendersLoading = /<ListLoading/.test(src) ||
    /\b(isLoading|loading|isLiveLoading)\b\s*(\?|&&)[\s\S]{0,220}(Skeleton|Loading|Loader|Spinner|animate|spin|…|\.\.\.)/.test(src)
  const rendersError = /<ListError/.test(src) ||
    /\b\w*[eE]rror\b\s*(\?|&&)[\s\S]{0,260}(retry|Retry|opnieuw|Opnieuw|réessayer|Erneut|Reintentar|ErrorBanner|could|Could|failed|Failed|kon|loadFailed)/i.test(src)
  const hasRetry = /<ListError[^>]*onRetry/.test(src) || /onClick=\{[^}]*refetch|refetch\(\)/.test(src)
  const rendersEmpty = /<ListEmpty/.test(src) ||
    /(length === 0|isEmpty)[\s\S]{0,220}(No |Nog geen|geen|Geen|empty|Empty|Aucun|Keine|emptyTitle|noResults)/i.test(src)

  rows.push({
    rel: relative(APP, file).replace(/\\/g, '/').replace(/\/page\.tsx$/, ''),
    readsLoading, readsError,
    L: rendersLoading, E: rendersError, R: hasRetry, M: rendersEmpty,
  })
}

const score = (r) => (r.L?1:0) + (r.E?1:0) + (r.R?1:0) + (r.M?1:0)
rows.sort((a, b) => score(a) - score(b) || a.rel.localeCompare(b.rel))

const complete = rows.filter(r => r.L && r.E && r.R && r.M)
const partial = rows.filter(r => score(r) > 0 && score(r) < 4)
const bare = rows.filter(r => score(r) === 0)

console.log('=== FE-01 LIST-STATE INVENTORY ===')
console.log(`pages using useApi/refetch: ${rows.length}`)
console.log(`  complete (L+E+R+M):       ${complete.length}`)
console.log(`  partial:                  ${partial.length}`)
console.log(`  bare (no states):         ${bare.length}`)
console.log('\nLegend: L=loading E=error R=retry M=empty  (✓ present / · missing)')
const fmt = (r) => `  ${r.L?'L':'·'}${r.E?'E':'·'}${r.R?'R':'·'}${r.M?'M':'·'}  ${r.rel}`
console.log('\n## BARE — no rendered states (highest priority)')
bare.forEach(r => console.log(fmt(r)))
console.log('\n## PARTIAL — some states missing')
partial.forEach(r => console.log(fmt(r)))
console.log('\n## COMPLETE — already L+E+R+M')
complete.forEach(r => console.log(fmt(r)))
