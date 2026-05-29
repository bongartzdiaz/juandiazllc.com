#!/usr/bin/env node
/* ---------------------------------------------------------------
   i18n reference integrity checker
   ---------------------------------------------------------------
   Complements i18n-fill-missing.ts (which checks parity: en ⊇
   nl/de/es/fr). THIS checks the other direction:

      every t('key') referenced in code  ⊆  en.json

   Catches the "referenced-but-never-created" bug class where a
   component calls t('contacts.searchPlaceholder') but that key was
   never added to ANY locale file — so parity reads 100% yet the
   page throws MISSING_MESSAGE and renders the raw key string.

   How it resolves keys:
     - Scans app/ + components/ for translation-hook bindings:
         const t   = useTranslations('contacts')
         const td  = useTranslations('dealDetail')
         const tt  = useTranslations()                 // root scope
     - For each binding var, finds VAR('literal.key') calls and
       resolves to  <namespace>.<key>  (or just <key> for root).
     - Skips dynamic template-literal keys  VAR(`${x}.y`)  — those
       can't be resolved statically; they're listed separately so a
       human can eyeball them.

   Exit codes:
     0  every referenced key exists in en.json
     1  missing keys found
   --------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const EN = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', 'en.json'), 'utf8'))

// ---- flatten en.json to a Set of dotted keys ----
const enKeys = new Set()
;(function walk(o, p) {
  for (const [k, v] of Object.entries(o)) {
    const np = p ? `${p}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, np)
    else enKeys.add(np)
  }
})(EN, '')

// ---- recursively collect .tsx / .ts files under app/ and components/ ----
function collect(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      collect(full, acc)
    } else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !entry.name.includes('.test.')) {
      acc.push(full)
    }
  }
  return acc
}
const files = [
  ...collect(path.join(ROOT, 'app'), []),
  ...collect(path.join(ROOT, 'components'), []),
]

const missing = []      // { file, var, key, fullKey }
const dynamic = []      // { file, snippet }
let totalRefs = 0

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8')
  const rel = path.relative(ROOT, file)

  // Strip comments before scanning so doc-comment examples like
  //   // labels resolve via t('industries.<id>')
  // don't get scraped as real references. Block comments first, then
  // line comments. (Naive but fine for our .tsx — we only care about
  // t() call sites, and string literals containing // are rare here.)
  src = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')

  // 1. Map translation-hook var -> namespace.
  //    const t = useTranslations('ns')   /   const t = useTranslations()
  const bindings = {} // varName -> namespace ('' for root)
  const bindRe = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)?\s*\)/g
  let m
  while ((m = bindRe.exec(src)) !== null) {
    const varName = m[1]
    const ns = m[2] ?? m[3] ?? m[4] ?? ''
    bindings[varName] = ns
  }
  if (Object.keys(bindings).length === 0) continue

  // 2. For each binding var, find VAR('literal') and VAR(`template`) calls.
  for (const [varName, ns] of Object.entries(bindings)) {
    // literal string keys: t('a.b.c')  or  t("a.b")  — optional 2nd arg (ICU vars)
    const litRe = new RegExp(`\\b${varName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\(\\s*'([^']+)'`, 'g')
    while ((m = litRe.exec(src)) !== null) {
      totalRefs++
      const key = m[1]
      const fullKey = ns ? `${ns}.${key}` : key
      if (!enKeys.has(fullKey)) {
        missing.push({ file: rel, var: varName, ns, key, fullKey })
      }
    }
    const litRe2 = new RegExp(`\\b${varName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\(\\s*"([^"]+)"`, 'g')
    while ((m = litRe2.exec(src)) !== null) {
      totalRefs++
      const key = m[1]
      const fullKey = ns ? `${ns}.${key}` : key
      if (!enKeys.has(fullKey)) {
        missing.push({ file: rel, var: varName, ns, key, fullKey })
      }
    }
    // dynamic template-literal keys: t(`${x}.y`)
    const dynRe = new RegExp(`\\b${varName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\(\\s*\`([^\`]*\\$\\{[^\`]*)\``, 'g')
    while ((m = dynRe.exec(src)) !== null) {
      dynamic.push({ file: rel, ns, snippet: m[1] })
    }
  }
}

// ---- dedupe + report ----
const uniqMissing = []
const seen = new Set()
for (const x of missing) {
  const id = `${x.fullKey}@@${x.file}`
  if (seen.has(id)) continue
  seen.add(id)
  uniqMissing.push(x)
}

console.log(`Scanned ${files.length} files, ${totalRefs} literal t() refs.`)
console.log(`en.json has ${enKeys.size} keys.\n`)

if (uniqMissing.length === 0) {
  console.log('✓ Every literal t() reference resolves to an en.json key.')
} else {
  // group by fullKey
  const byKey = {}
  for (const x of uniqMissing) {
    ;(byKey[x.fullKey] ??= []).push(x.file)
  }
  console.log(`✗ ${Object.keys(byKey).length} MISSING keys referenced in code but absent from en.json:\n`)
  for (const [k, fileList] of Object.entries(byKey).sort()) {
    const files = [...new Set(fileList)]
    console.log(`  ${k}`)
    for (const f of files.slice(0, 3)) console.log(`      ${f}`)
    if (files.length > 3) console.log(`      … +${files.length - 3} more files`)
  }
}

if (dynamic.length > 0) {
  const uniqDyn = [...new Set(dynamic.map(d => `${d.ns}:${d.snippet}`))]
  console.log(`\n⚠ ${uniqDyn.length} dynamic template-literal keys (cannot statically verify — eyeball these):`)
  for (const d of uniqDyn.slice(0, 25)) console.log(`    ${d}`)
  if (uniqDyn.length > 25) console.log(`    … +${uniqDyn.length - 25} more`)
}

process.exit(uniqMissing.length === 0 ? 0 : 1)
