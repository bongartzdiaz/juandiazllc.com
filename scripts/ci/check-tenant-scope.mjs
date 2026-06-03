#!/usr/bin/env node
/**
 * A-03 — tenant-scope lint.
 *
 * The DEUS CRM runs on MySQL/MariaDB with NO row-level security. Tenant
 * isolation is enforced 100% in application code: every Prisma query against
 * a tenant-scoped model MUST filter on `organizationId` (directly or through a
 * relation). A single forgotten filter is a full cross-tenant data leak — the
 * exact class of bug fixed in A-02.
 *
 * This lint is the structural backstop. It parses the Prisma schema to learn
 * which models are tenant-scoped (own an `organizationId` column), then uses
 * the TypeScript compiler API (AST, not regex — so no brittle false matches)
 * to find *bulk* Prisma operations on those models whose argument does not
 * mention `organizationId` anywhere.
 *
 * Why only BULK ops (findMany / updateMany / deleteMany / count / aggregate /
 * groupBy)? Those are the catastrophic class: a missing filter returns or
 * mutates rows across *all* tenants. Single-row ops (findUnique / findFirst by
 * id) are routinely "fetch then verify org in code" and flagging them produces
 * mostly noise — they are out of scope here by design.
 *
 * Escape hatch: annotate a legitimately org-agnostic query with a comment
 * containing `org-scope-lint-ok` on the call line or the two lines above it
 * (add a short reason). Use it for operator-wide crons, the first-user
 * bootstrap, junction lookups already bound by a unique id, etc.
 *
 * Usage:
 *   node scripts/ci/check-tenant-scope.mjs            # gate: exit 1 on findings
 *   node scripts/ci/check-tenant-scope.mjs --report   # report only: always exit 0
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const REPORT_ONLY = process.argv.includes('--report')

const SCAN_DIRS = ['app/philly', 'lib/philly']
const BULK_OPS = new Set([
  'findMany',
  'updateMany',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
])
const SUPPRESS_MARKER = 'org-scope-lint-ok'

// Models with no organizationId column that are nonetheless tenant-scoped
// through a relation. The correct filter spells out `organizationId` inside
// the relation (e.g. `where: { pipeline: { organizationId } }`), so the same
// organizationId presence check covers them — they just need to be in the
// tracked-accessor set. Adding these closes the blind spot that hid BE-01
// (dashboard deal aggregates summed across all tenants).
const RELATION_SCOPED = ['deal', 'pipelineStage', 'reservation']

/** Parse prisma/schema.prisma → Set of tenant-scoped Prisma client accessors.
 *  A model is tenant-scoped when it declares an `organizationId` field (direct)
 *  or appears in RELATION_SCOPED (scoped through a relation). The client
 *  accessor is the model name with a lowercased first char. */
function tenantAccessors() {
  const schema = readFileSync(join(ROOT, 'prisma', 'schema.prisma'), 'utf8')
  const accessors = new Set(RELATION_SCOPED)
  const modelRe = /^model\s+(\w+)\s*\{([^}]*)\}/gms
  let m
  while ((m = modelRe.exec(schema)) !== null) {
    const [, name, body] = m
    if (/^\s*organizationId\s/m.test(body)) {
      accessors.add(name[0].toLowerCase() + name.slice(1))
    }
  }
  return accessors
}

/** Recursively collect .ts/.tsx files under a dir, skipping tests + d.ts. */
function collectFiles(dir) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...collectFiles(full))
    } else if (
      (entry.endsWith('.ts') || entry.endsWith('.tsx')) &&
      !entry.endsWith('.d.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx')
    ) {
      out.push(full)
    }
  }
  return out
}

/** True if a suppression marker sits on `line` (1-based) or the two above. */
function isSuppressed(lines, line) {
  for (let i = line - 3; i < line; i++) {
    if (i >= 0 && lines[i] && lines[i].includes(SUPPRESS_MARKER)) return true
  }
  return false
}

/** Walk a PropertyAccess/ElementAccess/Call chain down to its leftmost
 *  identifier name (e.g. `where.AND.push` -> `where`), or null. */
function rootIdentifierName(node) {
  let cur = node
  while (cur) {
    if (ts.isIdentifier(cur)) return cur.text
    if (ts.isPropertyAccessExpression(cur) || ts.isElementAccessExpression(cur)) {
      cur = cur.expression
    } else if (ts.isCallExpression(cur)) {
      cur = cur.expression
    } else {
      return null
    }
  }
  return null
}

/** Collect, per file, the set of local variable names that are demonstrably
 *  bound to an `organizationId` filter — whether at declaration, by later
 *  property assignment, or by a push/Object.assign mutation. This is the
 *  intra-file data-flow that lets `findMany({ where })` be recognized as
 *  scoped when `where` was built with organizationId elsewhere in the file. */
function orgScopedVars(sf) {
  const names = new Set()
  const visit = (node) => {
    // const/let where = { organizationId: ... }  (or nested via a relation)
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      node.initializer.getText(sf).includes('organizationId')
    ) {
      names.add(node.name.text)
    }
    // where.organizationId = ...   /   where = { ...organizationId }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      node.getText(sf).includes('organizationId')
    ) {
      const root = rootIdentifierName(node.left)
      if (root) names.add(root)
    }
    // where.AND.push({ organizationId })  /  Object.assign(where, { organizationId })
    if (ts.isCallExpression(node) && node.getText(sf).includes('organizationId')) {
      if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'push') {
        const root = rootIdentifierName(node.expression.expression)
        if (root) names.add(root)
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'assign' &&
        node.arguments.length > 0
      ) {
        const root = rootIdentifierName(node.arguments[0])
        if (root) names.add(root)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return names
}

/** Identifier names referenced anywhere inside a node (the call's args). */
function referencedIdentifiers(node, sf) {
  const ids = new Set()
  const visit = (n) => {
    if (ts.isIdentifier(n)) ids.add(n.text)
    ts.forEachChild(n, visit)
  }
  if (node) visit(node)
  return ids
}

const accessors = tenantAccessors()
const findings = []

for (const rel of SCAN_DIRS) {
  const files = collectFiles(join(ROOT, rel))
  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    const lines = src.split('\n')
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true)
    const scopedVars = orgScopedVars(sf)

    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        BULK_OPS.has(node.expression.name.text) &&
        ts.isPropertyAccessExpression(node.expression.expression) &&
        accessors.has(node.expression.expression.name.text)
      ) {
        const op = node.expression.name.text
        const model = node.expression.expression.name.text
        const arg0 = node.arguments[0]
        const argText = node.arguments.map((a) => a.getText(sf)).join(' ')
        // Scoped if organizationId appears inline in the args, OR the args
        // reference a local variable proven (above) to carry an org filter.
        const refsScopedVar = [...referencedIdentifiers(arg0, sf)].some((n) =>
          scopedVars.has(n),
        )
        const hasOrg = argText.includes('organizationId') || refsScopedVar
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf))
        const lineNo = line + 1
        if (!hasOrg && !isSuppressed(lines, lineNo)) {
          findings.push({
            file: relative(ROOT, file).split(sep).join('/'),
            line: lineNo,
            model,
            op,
          })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
}

const plural = findings.length === 1 ? '' : 's'
if (findings.length === 0) {
  console.log(
    `✓ tenant-scope lint: no unscoped bulk queries on ${accessors.size} tenant models.`,
  )
  process.exit(0)
}

console.log(
  `tenant-scope lint: ${findings.length} unscoped bulk quer${
    findings.length === 1 ? 'y' : 'ies'
  } on tenant models${plural}:\n`,
)
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}  ${f.model}.${f.op}()  — no organizationId in args`)
}
console.log(
  `\nEach query above either needs an organizationId filter (direct or via a ` +
    `relation), or — if genuinely org-agnostic — a "// ${SUPPRESS_MARKER}: <reason>" ` +
    `comment on the call line or the two lines above it.`,
)

process.exit(REPORT_ONLY ? 0 : 1)
