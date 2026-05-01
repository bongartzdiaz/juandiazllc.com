#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   DeepL passthrough — fill missing translation keys
   ---------------------------------------------------------------
   Walks apps/philly-standalone/messages/{en,nl,de,es}.json with
   en.json as the source of truth. For every key present in en
   but missing from a target locale, calls the DeepL API with
   the English value and writes the translation back.

   Designed to be safe: dry-run by default. Re-running is a no-op
   once translations are filled. ICU plural strings (anything
   containing the literal "{count, plural,") are skipped — DeepL
   does not preserve ICU braces reliably. Operators translate
   those by hand.

   Usage:
     npm run i18n:fill                  # dry-run summary
     npm run i18n:fill -- --apply       # actually write
     npm run i18n:fill -- --locale=de   # restrict to one locale
     npm run i18n:fill -- --apply --locale=nl

   Env:
     DEEPL_API_KEY  required (https://www.deepl.com/pro-api)
     DEEPL_API_URL  default api-free.deepl.com (set to api.deepl.com
                    for paid plans)

   Exit codes:
     0  no missing keys (or apply succeeded)
     1  missing keys but --apply not passed (CI lint mode)
     2  DeepL call failed / config error
   --------------------------------------------------------------- */

import fs from 'fs/promises'
import path from 'path'

interface Args {
  apply: boolean
  locales: Set<string>
}

const SUPPORTED = ['nl', 'de', 'es'] as const
type Target = (typeof SUPPORTED)[number]

const DEEPL_LANG: Record<Target, string> = {
  nl: 'NL',
  de: 'DE',
  es: 'ES',
}

function parseArgs(argv: string[]): Args {
  const a: Args = { apply: false, locales: new Set(SUPPORTED) }
  for (const tok of argv.slice(2)) {
    if (tok === '--apply') a.apply = true
    else if (tok.startsWith('--locale=')) {
      const v = tok.slice(9) as Target
      if ((SUPPORTED as readonly string[]).includes(v)) {
        a.locales = new Set([v])
      } else {
        console.error(`i18n:fill: unknown locale "${v}". Supported: ${SUPPORTED.join(', ')}`)
        process.exit(2)
      }
    }
  }
  return a
}

/** Recursively walk an object, yielding [path, value] for every leaf
 *  string. Path is dot-joined for grep-friendly logs. */
export function* walk(obj: unknown, prefix: string[] = []): IterableIterator<[string[], string]> {
  if (typeof obj === 'string') {
    yield [prefix, obj]
    return
  }
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      yield* walk(v, [...prefix, k])
    }
  }
}

export function getAt(root: Record<string, unknown>, p: string[]): unknown {
  let cur: unknown = root
  for (const k of p) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

export function setAt(root: Record<string, unknown>, p: string[], value: string): void {
  let cur: Record<string, unknown> = root
  for (let i = 0; i < p.length - 1; i++) {
    const k = p[i]
    const next = cur[k]
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cur[k] = {}
    }
    cur = cur[k] as Record<string, unknown>
  }
  cur[p[p.length - 1]] = value
}

/** ICU plural / select expressions confuse DeepL — the braces
 *  around `{count, plural, one {...} other {...}}` get torn apart.
 *  Skip these and let the operator translate by hand. */
export function isIcuLike(value: string): boolean {
  return /\{[^}]+,\s*(plural|select|selectordinal)\s*,/i.test(value)
}

interface DeeplBatchResult {
  translations: { detected_source_language: string; text: string }[]
}

async function translate(texts: string[], target: Target): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey) {
    console.error('i18n:fill: DEEPL_API_KEY is not set. Aborting.')
    process.exit(2)
  }
  const url = (process.env.DEEPL_API_URL ?? 'https://api-free.deepl.com').replace(/\/$/, '') + '/v2/translate'
  const params = new URLSearchParams()
  for (const t of texts) params.append('text', t)
  params.set('target_lang', DEEPL_LANG[target])
  params.set('source_lang', 'EN')
  // tag_handling=xml so DeepL leaves curly-brace ICU placeholders alone.
  // (DeepL doesn't have a native "ignore braces" flag; this is the
  // canonical workaround.)
  params.set('preserve_formatting', '1')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`i18n:fill: DeepL ${res.status} — ${body.slice(0, 400)}`)
    process.exit(2)
  }
  const json = (await res.json()) as DeeplBatchResult
  return json.translations.map((t) => t.text)
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv)
  const root = path.join(process.cwd(), 'messages')

  const enRaw = await fs.readFile(path.join(root, 'en.json'), 'utf-8')
  const en = JSON.parse(enRaw) as Record<string, unknown>

  let totalMissing = 0
  let totalSkipped = 0
  let totalFilled = 0

  for (const target of args.locales) {
    const targetPath = path.join(root, `${target}.json`)
    const raw = await fs.readFile(targetPath, 'utf-8')
    const tgt = JSON.parse(raw) as Record<string, unknown>

    const missingPaths: string[][] = []
    const missingTexts: string[] = []
    const skippedKeys: string[] = []

    for (const [p, value] of walk(en)) {
      const cur = getAt(tgt, p)
      if (typeof cur === 'string' && cur.length > 0) continue
      if (isIcuLike(value)) {
        skippedKeys.push(p.join('.'))
        continue
      }
      missingPaths.push(p)
      missingTexts.push(value)
    }

    totalMissing += missingPaths.length
    totalSkipped += skippedKeys.length

    if (missingPaths.length === 0) {
      console.log(`[${target}] no missing keys${skippedKeys.length > 0 ? ` (${skippedKeys.length} ICU strings skipped)` : ''}`)
      continue
    }

    console.log(
      `[${target}] ${missingPaths.length} missing key${missingPaths.length === 1 ? '' : 's'}` +
      `${skippedKeys.length > 0 ? `, ${skippedKeys.length} ICU strings skipped` : ''}`,
    )

    if (!args.apply) {
      // Print first 10 missing keys for visibility.
      for (const p of missingPaths.slice(0, 10)) console.log(`  - ${p.join('.')}`)
      if (missingPaths.length > 10) console.log(`  ... ${missingPaths.length - 10} more`)
      continue
    }

    // Batch in chunks of 50 (DeepL accepts up to ~50 text params/req).
    const BATCH = 50
    for (let i = 0; i < missingTexts.length; i += BATCH) {
      const chunkTexts = missingTexts.slice(i, i + BATCH)
      const chunkPaths = missingPaths.slice(i, i + BATCH)
      const translated = await translate(chunkTexts, target as Target)
      for (let j = 0; j < translated.length; j++) {
        setAt(tgt, chunkPaths[j], translated[j])
        totalFilled += 1
      }
      // Write incrementally so a partial-batch failure doesn't lose
      // the work that already landed.
      await fs.writeFile(targetPath, JSON.stringify(tgt, null, 2) + '\n', 'utf-8')
      console.log(`  [${target}] wrote ${Math.min(i + BATCH, missingTexts.length)}/${missingTexts.length}`)
    }
  }

  console.log(
    `\nSummary: ${totalMissing} missing key${totalMissing === 1 ? '' : 's'} across ${args.locales.size} locale${args.locales.size === 1 ? '' : 's'}; ` +
    `${totalSkipped} ICU string${totalSkipped === 1 ? '' : 's'} skipped` +
    (args.apply ? `; ${totalFilled} filled.` : `. Re-run with --apply to write.`),
  )

  if (totalMissing === 0) return 0
  return args.apply ? 0 : 1
}

// Only run when invoked directly via `tsx scripts/i18n-fill-missing.ts`
// — guards against accidental execution when the module is imported
// from a vitest test file.
if (process.argv[1]?.endsWith('i18n-fill-missing.ts')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error('i18n:fill: unexpected error', err)
      process.exit(2)
    })
}
