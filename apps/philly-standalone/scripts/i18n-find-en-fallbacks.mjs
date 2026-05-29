#!/usr/bin/env node
/* ---------------------------------------------------------------
   i18n English-fallback detector
   ---------------------------------------------------------------
   Finds values in nl/de/es/fr that are STILL identical to the
   English source in en.json — i.e. keys that were added to the
   locale file but never actually translated (English bleed-through).

   Heuristic to avoid false positives (proper nouns / codes / shared
   terms that are legitimately identical across languages):
     - skip if en value has no ASCII letters (numbers, symbols, emoji)
     - skip if en value is a known brand / proper noun / tech code
       (Gmail, Funda, GMV, RevPAR, SMS, CSV, AI, SDG, CO2, EUR, …)
     - skip very short tokens that are commonly identical (OK, ID, %)
     - skip if the string is a placeholder-only / ICU-only token
   Everything else where  locale === en  is reported as a likely
   untranslated fallback, grouped by top-level namespace.

   Read-only. Exit 0 always (report tool, not a gate).
   --------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MSG = path.resolve(__dirname, '..', 'messages')
const LOCALES = ['nl', 'de', 'es', 'fr']

const load = (l) => JSON.parse(fs.readFileSync(path.join(MSG, `${l}.json`), 'utf8'))
const en = load('en')

function flatten(o, p = '', acc = {}) {
  for (const [k, v] of Object.entries(o)) {
    const np = p ? `${p}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, np, acc)
    else acc[np] = v
  }
  return acc
}

const enFlat = flatten(en)

// Words/tokens that are legitimately identical across languages — don't flag.
const ALLOW = new Set([
  'OK', 'ID', 'URL', 'API', 'SMS', 'CSV', 'XLSX', 'PDF', 'AI', 'GMV', 'RevPAR',
  'ADR', 'SDG', 'CO2', 'EUR', 'USD', 'GBP', 'KPI', 'CRM', 'CTA', 'SEO', 'IP',
  'SCIM', 'SSO', 'MFA', 'GDPR', 'EPC', 'B2B', 'B2C', 'F&B', 'CSR', 'NL', 'BE',
  'DE', 'FR', 'ES', 'EN', 'Funda', 'ImmoScout24', 'Whise', 'Gmail', 'Outlook',
  'Twilio', 'WhatsApp', 'DocuSign', 'Dropbox', 'Google', 'OneDrive', 'Booking.com',
  'Expedia', 'LinkedIn', 'Stripe', 'Supabase', 'DEUS', 'Status', 'Email', 'Live',
  'Total', 'Info', 'Import', 'Export', 'Dashboard', 'Pipeline', 'Lead', 'Leads',
])

// brand/proper-noun substrings — if the en value is exactly one of these, skip
function isLikelyProperNoun(s) {
  if (ALLOW.has(s)) return true
  // all-caps acronym up to 5 chars (GMV, SCIM, REST…)
  if (/^[A-Z0-9&./+]{1,5}$/.test(s)) return true
  return false
}

function hasLetters(s) {
  return /[A-Za-z]/.test(s)
}

// crude "looks English" filter is unnecessary — we already require it to
// EXACTLY equal the en source, so it's English by definition. We only need
// to suppress proper-noun / code false positives.
function shouldFlag(enVal) {
  if (typeof enVal !== 'string') return false
  const v = enVal.trim()
  if (v.length === 0) return false
  if (!hasLetters(v)) return false
  if (isLikelyProperNoun(v)) return false
  // pure placeholder e.g. "{count}" or "{value}"
  if (/^\{[^}]+\}$/.test(v)) return false
  return true
}

const report = {} // locale -> namespace -> [ {key, val} ]
let grandTotal = 0

for (const loc of LOCALES) {
  const flat = flatten(load(loc))
  report[loc] = {}
  for (const [k, enVal] of Object.entries(enFlat)) {
    if (!shouldFlag(enVal)) continue
    const locVal = flat[k]
    if (typeof locVal !== 'string') continue
    if (locVal === enVal) {
      const ns = k.split('.')[0]
      ;(report[loc][ns] ??= []).push({ key: k, val: enVal })
      grandTotal++
    }
  }
}

for (const loc of LOCALES) {
  const nsList = Object.entries(report[loc]).sort((a, b) => b[1].length - a[1].length)
  const total = nsList.reduce((s, [, arr]) => s + arr.length, 0)
  console.log(`\n=== ${loc.toUpperCase()} — ${total} suspected English-fallback values ===`)
  for (const [ns, arr] of nsList) {
    console.log(`  ${ns} (${arr.length})`)
    for (const { key, val } of arr.slice(0, 8)) {
      console.log(`      ${key} = ${JSON.stringify(val)}`)
    }
    if (arr.length > 8) console.log(`      … +${arr.length - 8} more`)
  }
}

console.log(`\nGRAND TOTAL across 4 locales: ${grandTotal} suspected fallbacks.`)
