#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   DeepL-driven translation pipeline for the assistant KB.
   ---------------------------------------------------------------
   Walks docs/user/en/, translates each en doc into the requested
   target language(s) via DeepL, and writes the output to
   docs/user/{nl,de,es}/<same path>.

   What we do that DeepL alone wouldn't:
   - Frontmatter handling: we translate `title` + `summary` only;
     slug, lang, tags, related, updated stay byte-identical to the
     en source (slug + lang are keys; tags + related are keys; the
     `updated` date is mirrored so kb:check sees the translation as
     fresh).
   - Markdown preservation: DeepL's `tag_handling=html` mode
     preserves inline code spans, links, lists, and headings. We
     wrap code blocks (```) in <x:keep> markers DeepL leaves
     untouched, then unwrap on the way out.
   - Path / env-var protection: anything matching /^[A-Z][A-Z0-9_]+$/
     (env vars), `/api/...` paths, or technical identifiers like
     `requireScope`, `organizationId` get stay-as-is markers.
   - Idempotent: re-running won't overwrite a doc whose `updated`
     timestamp is newer than the corresponding en source.

   Usage:
     DEEPL_API_KEY=... npm run kb:translate -- --langs nl,de,es
     DEEPL_API_KEY=... npm run kb:translate -- --slug onboarding/welcome
     DEEPL_API_KEY=... npm run kb:translate -- --force          # re-translate even fresh

   DeepL free tier: 500k chars/month. The full 33-doc KB across
   3 languages is ~250k chars. Well under the cap.
   --------------------------------------------------------------- */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseFrontmatter, FrontmatterError } from '../lib/assistant/kb-parse'

const ROOT = path.join(__dirname, '..')
const DOCS_DIR = path.join(ROOT, 'docs', 'user')
const TARGET_LANGS = ['nl', 'de', 'es'] as const
type TargetLang = (typeof TARGET_LANGS)[number]

// DeepL accepts upper-case codes for some langs (e.g. "DE", "ES")
// and a hyphenated regional variant for others (e.g. "EN-US").
// nl/de/es just need the upper-case form.
const DEEPL_CODE: Record<TargetLang, string> = {
  nl: 'NL',
  de: 'DE',
  es: 'ES',
}

interface CliArgs {
  langs: TargetLang[]
  slug: string | null
  force: boolean
  dryRun: boolean
}

function parseArgs(): CliArgs {
  const args: CliArgs = { langs: [...TARGET_LANGS], slug: null, force: false, dryRun: false }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--langs') {
      const next = argv[++i] ?? ''
      args.langs = next
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is TargetLang => (TARGET_LANGS as readonly string[]).includes(s))
      if (args.langs.length === 0) {
        console.error(`--langs ${next}: no valid targets (allowed: ${TARGET_LANGS.join(', ')})`)
        process.exit(2)
      }
    } else if (a === '--slug') {
      args.slug = argv[++i] ?? null
    } else if (a === '--force') {
      args.force = true
    } else if (a === '--dry-run') {
      args.dryRun = true
    } else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: tsx scripts/translate-assistant-kb.ts [--langs nl,de,es] [--slug ...] [--force] [--dry-run]',
      )
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${a}`)
      process.exit(2)
    }
  }
  return args
}

const STAY_AS_IS_PATTERNS: RegExp[] = [
  // Env-var-shaped tokens (UPPER_SNAKE_CASE)
  /\b[A-Z][A-Z0-9_]{3,}\b/g,
  // /api/* paths and other absolute paths starting with /
  /\/[a-z][a-z0-9\-/[\]]+/g,
  // Technical identifiers we know not to translate
  /\b(requireScope|requireRole|requireSection|organizationId|userId|getAuthPrisma|encryptSecret|decryptSecret|logAudit|computeAuditHash|withSpan)\b/g,
  // Code-fence sequence (preserved separately below)
]

interface TranslateOptions {
  apiKey: string
  text: string
  sourceLang: string
  targetLang: string
}

async function deeplTranslate(opts: TranslateOptions): Promise<string> {
  // Use the free API endpoint by default; if the key has a `:fx` suffix
  // DeepL routes accordingly. Pro keys hit api.deepl.com.
  const isPro = !opts.apiKey.endsWith(':fx')
  const endpoint = isPro
    ? 'https://api.deepl.com/v2/translate'
    : 'https://api-free.deepl.com/v2/translate'

  const params = new URLSearchParams({
    text: opts.text,
    source_lang: opts.sourceLang,
    target_lang: opts.targetLang,
    tag_handling: 'html',
    preserve_formatting: '1',
    formality: 'less',
  })
  // Tell DeepL not to translate things wrapped in <x:keep>...</x:keep>
  params.append('ignore_tags', 'x:keep')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${opts.apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`DeepL ${res.status}: ${body.slice(0, 500)}`)
  }
  const json = (await res.json()) as { translations?: Array<{ text: string }> }
  return json.translations?.[0]?.text ?? ''
}

/**
 * Wrap stay-as-is tokens and code blocks in <x:keep>...</x:keep> so
 * DeepL leaves them untouched. Returns the wrapped text + a list of
 * the original substitutions for debugging.
 */
function protectTokens(text: string): string {
  let out = text

  // Code blocks first (greediest match). Wrap entire fenced blocks.
  out = out.replace(/```[\s\S]*?```/g, (m) => `<x:keep>${m}</x:keep>`)

  // Inline code spans next.
  out = out.replace(/`[^`\n]+`/g, (m) => `<x:keep>${m}</x:keep>`)

  // Markdown link targets (the URL part only, leave the visible text).
  out = out.replace(/(\]\()([^)]+)(\))/g, (_m, a: string, b: string, c: string) => `${a}<x:keep>${b}</x:keep>${c}`)

  // Other technical tokens.
  for (const pat of STAY_AS_IS_PATTERNS) {
    out = out.replace(pat, (m) => `<x:keep>${m}</x:keep>`)
  }
  return out
}

function unprotect(text: string): string {
  return text.replace(/<x:keep>([\s\S]*?)<\/x:keep>/g, (_m, inner: string) => inner)
}

/**
 * Render frontmatter + body back to a markdown file. Translations
 * inherit the source's slug, tags, related, updated; only title and
 * summary are translated.
 */
function buildOutput(
  source: ReturnType<typeof parseFrontmatter>['frontmatter'],
  targetLang: TargetLang,
  translatedTitle: string,
  translatedSummary: string,
  translatedBody: string,
): string {
  const fm = [
    '---',
    `slug: ${source.slug}`,
    `lang: ${targetLang}`,
    `title: ${JSON.stringify(translatedTitle)}`,
    `summary: ${JSON.stringify(translatedSummary)}`,
    `tags: [${source.tags.join(', ')}]`,
    `related: [${source.related.join(', ')}]`,
    `updated: ${source.updated}`,
    '---',
    '',
  ].join('\n')
  return fm + translatedBody.trim() + '\n'
}

async function* walkEnFiles(): AsyncGenerator<string> {
  async function* recurse(dir: string): AsyncGenerator<string> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) yield* recurse(full)
      else if (e.isFile() && e.name.endsWith('.md') && e.name !== 'README.md') yield full
    }
  }
  yield* recurse(path.join(DOCS_DIR, 'en'))
}

async function main(): Promise<void> {
  const args = parseArgs()
  const apiKey = process.env.DEEPL_API_KEY?.trim()
  if (!apiKey && !args.dryRun) {
    console.error('DEEPL_API_KEY env var is required (or pass --dry-run to preview which files would be translated).')
    process.exit(2)
  }

  let total = 0
  let skipped = 0
  let written = 0

  for await (const enPath of walkEnFiles()) {
    const enRel = path.relative(path.join(DOCS_DIR, 'en'), enPath)
    const enSource = await fs.readFile(enPath, 'utf8')
    let parsed
    try {
      parsed = parseFrontmatter(enSource)
    } catch (err) {
      if (err instanceof FrontmatterError) {
        console.error(`✗ en/${enRel}: ${err.message}`)
        process.exit(3)
      }
      throw err
    }

    if (args.slug && parsed.frontmatter.slug !== args.slug) continue

    for (const targetLang of args.langs) {
      total += 1
      const outPath = path.join(DOCS_DIR, targetLang, enRel)

      // Skip-if-fresh: if the translation already exists and its
      // `updated` is >= the en source's, we'd be retranslating for
      // no reason.
      if (!args.force) {
        const existing = await fs.readFile(outPath, 'utf8').catch(() => null)
        if (existing) {
          try {
            const existingFm = parseFrontmatter(existing).frontmatter
            if (existingFm.updated >= parsed.frontmatter.updated) {
              skipped += 1
              continue
            }
          } catch {
            // Existing file malformed; we'll overwrite.
          }
        }
      }

      console.log(`[${targetLang}] ${parsed.frontmatter.slug} → ${path.relative(ROOT, outPath)}`)

      if (args.dryRun) {
        written += 1
        continue
      }

      const protectedBody = protectTokens(parsed.body)
      const protectedSummary = protectTokens(parsed.frontmatter.summary)

      const [bodyTranslated, summaryTranslated, titleTranslated] = await Promise.all([
        deeplTranslate({
          apiKey: apiKey!,
          text: protectedBody,
          sourceLang: 'EN',
          targetLang: DEEPL_CODE[targetLang],
        }),
        deeplTranslate({
          apiKey: apiKey!,
          text: protectedSummary,
          sourceLang: 'EN',
          targetLang: DEEPL_CODE[targetLang],
        }),
        deeplTranslate({
          apiKey: apiKey!,
          text: parsed.frontmatter.title,
          sourceLang: 'EN',
          targetLang: DEEPL_CODE[targetLang],
        }),
      ])

      const output = buildOutput(
        parsed.frontmatter,
        targetLang,
        unprotect(titleTranslated).trim(),
        unprotect(summaryTranslated).trim(),
        unprotect(bodyTranslated),
      )

      await fs.mkdir(path.dirname(outPath), { recursive: true })
      await fs.writeFile(outPath, output, 'utf8')
      written += 1
    }
  }

  console.log(
    `\nDone. ${total} target file(s) considered: ${written} written, ${skipped} skipped (already fresh).`,
  )
  if (skipped > 0 && !args.force) {
    console.log('Pass --force to re-translate everything regardless of timestamps.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
