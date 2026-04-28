/* ---------------------------------------------------------------
   Render code-as-knowledge extras as Obsidian markdown notes.
   ---------------------------------------------------------------
   Three things live in code that an operator / DPO / auditor would
   want to read in a vault rather than a TS file:

     1. Records of Processing Activities (lib/gdpr/ropa.ts)
     2. PII registry (lib/gdpr/pii-registry.ts)
     3. The Prisma schema (rendered as a Mermaid ER-diagram-ish
        overview)
     4. API route inventory (every app/api route file, grouped by
        path, with the handlers it exports)

   These render functions return plain markdown strings. The vault
   sync writes them under `vault/system/` with a frontmatter block
   so they look like first-class KB notes.
   --------------------------------------------------------------- */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { PROCESSING_ACTIVITIES } from '@/lib/gdpr/ropa'
import { PII_REGISTRY } from '@/lib/gdpr/pii-registry'

const ROOT = path.join(__dirname, '..', '..')
const TODAY = () => new Date().toISOString().slice(0, 10)

function fm(record: Record<string, string | string[]>): string {
  const lines: string[] = ['---']
  for (const [k, v] of Object.entries(record)) {
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.join(', ')}]`)
    } else {
      lines.push(`${k}: ${JSON.stringify(v)}`)
    }
  }
  lines.push('---', '')
  return lines.join('\n')
}

/* ── 1. RoPA ─────────────────────────────────────────────────── */

export function renderRopaMarkdown(): string {
  const head =
    fm({
      slug: 'system/ropa',
      lang: 'en',
      title: 'Records of Processing Activities',
      summary:
        'Auto-generated from lib/gdpr/ropa.ts — every processing activity, lawful basis, retention, and security measure. The register a regulator would request under Article 30.',
      tags: ['system', 'gdpr', 'ropa', 'compliance', 'auto-generated'],
      related: ['concepts/gdpr', 'system/pii-registry'],
      updated: TODAY(),
    }) +
    '# Records of Processing Activities\n\n' +
    '> **Auto-generated** from `lib/gdpr/ropa.ts`. Edits here will be\n' +
    "> overwritten on the next `npm run vault:export`. To change the\n" +
    '> register, edit `lib/gdpr/ropa.ts` in the source repository.\n\n' +
    `Generated on ${TODAY()} from ${PROCESSING_ACTIVITIES.length} activity definitions.\n\n`

  const sections = PROCESSING_ACTIVITIES.map((a) => {
    const transferLines =
      a.thirdCountryTransfers.length > 0
        ? a.thirdCountryTransfers
            .map((t) => `  - **${t.country}** — safeguard: ${t.safeguard.toUpperCase()}${t.notes ? `; ${t.notes}` : ''}`)
            .join('\n')
        : '  - (none)'

    return [
      `## ${a.name}`,
      '',
      `**id**: \`${a.id}\``,
      `**Lawful basis**: ${a.lawfulBasis.replace(/_/g, ' ')}`,
      `**Retention**: ${a.retentionPolicy}`,
      '',
      a.description,
      '',
      '### Data subjects',
      a.dataSubjects.map((s) => `- ${s}`).join('\n'),
      '',
      '### Data categories',
      a.dataCategories.map((c) => `- ${c}`).join('\n'),
      '',
      '### Recipients',
      a.recipients.length > 0 ? a.recipients.map((r) => `- ${r}`).join('\n') : '- (internal only)',
      '',
      '### Third-country transfers',
      transferLines,
      '',
      '### Security measures',
      a.securityMeasures.map((m) => `- ${m}`).join('\n'),
      '',
    ].join('\n')
  }).join('\n')

  return head + sections
}

/* ── 2. PII registry ─────────────────────────────────────────── */

export function renderPiiRegistryMarkdown(): string {
  const head =
    fm({
      slug: 'system/pii-registry',
      lang: 'en',
      title: 'PII registry',
      summary:
        'Auto-generated from lib/gdpr/pii-registry.ts — every Prisma model holding personal data, with field-level sensitivity, lawful basis, retention, and lookup keys.',
      tags: ['system', 'gdpr', 'pii', 'compliance', 'auto-generated'],
      related: ['concepts/gdpr', 'system/ropa'],
      updated: TODAY(),
    }) +
    '# PII registry\n\n' +
    '> **Auto-generated** from `lib/gdpr/pii-registry.ts`. Edits here\n' +
    "> will be overwritten on the next `npm run vault:export`.\n\n" +
    `Covers ${PII_REGISTRY.length} Prisma models holding personal data.\n\n` +
    '## Summary table\n\n' +
    '| Model | Subject | Lawful basis | Retention (days) | Lookup key |\n' +
    '|---|---|---|---|---|\n' +
    PII_REGISTRY.map(
      (m) =>
        `| ${m.model} | ${m.subject} | ${m.lawfulBasis.replace(/_/g, ' ')} | ${m.retentionDays} | ${
          m.emailField ? `email→\`${m.emailField}\`` : m.ownerField ? `owner→\`${m.ownerField}\`` : '—'
        } |`,
    ).join('\n') +
    '\n\n'

  const sections = PII_REGISTRY.map((m) => {
    const fieldLines = m.fields.map(
      (f) =>
        `| \`${f.name}\` | ${f.sensitivity} | ${f.encrypted ? '✓' : ''} | ${f.description} |`,
    ).join('\n')

    return [
      `## ${m.model}`,
      '',
      `**Subject**: ${m.subject}`,
      `**Lawful basis**: ${m.lawfulBasis.replace(/_/g, ' ')}`,
      `**Retention**: ${m.retentionDays} days`,
      '',
      m.purpose,
      '',
      '| Field | Sensitivity | Encrypted | Description |',
      '|---|---|---|---|',
      fieldLines,
      '',
    ].join('\n')
  }).join('\n')

  return head + sections
}

/* ── 3. Schema diagram (Mermaid) ─────────────────────────────── */

interface PrismaModel {
  name: string
  fields: Array<{ name: string; type: string; isRelation: boolean; relatedTo?: string }>
}

/**
 * Hand-rolled Prisma schema parser. Doesn't try to be complete —
 * just enough to extract model names and `@relation` / FK
 * references for the Mermaid diagram. Anything we can't parse, we
 * skip silently rather than crash.
 */
function parsePrismaSchema(source: string): PrismaModel[] {
  const models: PrismaModel[] = []
  const modelBlocks = source.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)
  for (const block of modelBlocks) {
    const name = block[1]
    const body = block[2]
    const fields: PrismaModel['fields'] = []
    for (const line of body.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue
      const fieldMatch = trimmed.match(/^(\w+)\s+([\w?[\]]+)/)
      if (!fieldMatch) continue
      const fieldName = fieldMatch[1]
      const fieldType = fieldMatch[2]
      const baseType = fieldType.replace(/[?[\]]/g, '')
      const isRelation = /^[A-Z]/.test(baseType)
      fields.push({
        name: fieldName,
        type: fieldType,
        isRelation,
        relatedTo: isRelation ? baseType : undefined,
      })
    }
    models.push({ name, fields })
  }
  return models
}

export async function renderSchemaDiagramMarkdown(): Promise<string> {
  const source = await fs.readFile(path.join(ROOT, 'prisma', 'schema.prisma'), 'utf8')
  const models = parsePrismaSchema(source)
  const head =
    fm({
      slug: 'system/schema',
      lang: 'en',
      title: 'Database schema',
      summary:
        'Auto-generated from prisma/schema.prisma — high-level model + relation overview as a Mermaid ER diagram.',
      tags: ['system', 'schema', 'prisma', 'auto-generated'],
      related: ['system/api-inventory', 'system/pii-registry'],
      updated: TODAY(),
    }) +
    '# Database schema\n\n' +
    '> **Auto-generated** from `prisma/schema.prisma`. Edits here\n' +
    "> will be overwritten on the next `npm run vault:export`.\n\n" +
    `${models.length} models. The diagram below is a high-level relation\n` +
    'overview — open `prisma/schema.prisma` for column-level detail.\n\n' +
    '```mermaid\nerDiagram\n'

  // Mermaid ER syntax — use the `||--o{` style for has-many and
  // skip many-to-many implicit join tables. We don't have enough
  // info from a regex parse to be precise, so we just render every
  // relation field as a one-to-many edge from the relation source
  // to the named target. Mermaid will dedup.
  const edges = new Set<string>()
  for (const m of models) {
    for (const f of m.fields) {
      if (!f.isRelation || !f.relatedTo) continue
      const isList = f.type.endsWith('[]')
      const arrow = isList ? '||--o{' : '||--||'
      // Sort so the same pair only emits once
      const [a, b] = [m.name, f.relatedTo].sort()
      edges.add(`    ${a} ${arrow} ${b} : "${f.name}"`)
    }
  }
  const edgeList = [...edges].sort().join('\n')

  return head + edgeList + '\n```\n\n## Models\n\n' +
    models
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => {
        const cols = m.fields
          .filter((f) => !f.isRelation)
          .map((f) => `- \`${f.name}\` ${f.type}`)
          .join('\n')
        const rels = m.fields
          .filter((f) => f.isRelation)
          .map((f) => `- → \`${f.relatedTo}\` (${f.type.endsWith('[]') ? 'many' : 'one'}) as \`${f.name}\``)
          .join('\n')
        return [
          `### ${m.name}`,
          '',
          cols,
          rels ? '\n**Relations**\n' + rels : '',
        ].join('\n')
      })
      .join('\n\n')
}

/* ── 4. API route inventory ──────────────────────────────────── */

export async function renderApiInventoryMarkdown(): Promise<string> {
  const apiRoot = path.join(ROOT, 'app', 'api')
  const routes: Array<{ path: string; methods: string[]; file: string }> = []

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        await walk(full)
      } else if (e.isFile() && e.name === 'route.ts') {
        const source = await fs.readFile(full, 'utf8')
        const methods: string[] = []
        for (const m of ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']) {
          if (new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(source)) {
            methods.push(m)
          }
        }
        if (methods.length === 0) continue
        const relPath = path.relative(apiRoot, path.dirname(full))
        // Convert `[id]` → `:id` for display friendliness, leave
        // `[...path]` as-is so it's readable as a catch-all.
        const apiPath =
          '/api' +
          (relPath ? '/' + relPath : '').replace(/\[\.\.\.([\w]+)\]/g, ':$1*').replace(/\[(\w+)\]/g, ':$1')
        routes.push({ path: apiPath, methods, file: path.relative(ROOT, full) })
      }
    }
  }
  await walk(apiRoot)

  routes.sort((a, b) => a.path.localeCompare(b.path))

  const head =
    fm({
      slug: 'system/api-inventory',
      lang: 'en',
      title: 'API route inventory',
      summary:
        'Auto-generated catalogue of every Next.js API route (app/api/**/route.ts), grouped by path with the HTTP methods each handler exposes.',
      tags: ['system', 'api', 'inventory', 'auto-generated'],
      related: ['system/schema', 'concepts/tenancy'],
      updated: TODAY(),
    }) +
    '# API route inventory\n\n' +
    '> **Auto-generated** from `app/api/**/route.ts`. Edits here will\n' +
    "> be overwritten on the next `npm run vault:export`.\n\n" +
    `${routes.length} routes total.\n\n` +
    '| Path | Methods | Source |\n|---|---|---|\n' +
    routes
      .map((r) => `| \`${r.path}\` | ${r.methods.join(', ')} | \`${r.file}\` |`)
      .join('\n') +
    '\n'

  return head
}
