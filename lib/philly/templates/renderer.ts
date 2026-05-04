/* ---------------------------------------------------------------
   Lightweight template renderer
   - Supports {{field.path}} merge fields
   - Supports {{#if field}} ... {{/if}} blocks
   - Supports {{#each list}} ... {{/each}} loops with {{@item.x}}
   - Safe-by-default: unresolved fields render as ""
   --------------------------------------------------------------- */

export type Ctx = Record<string, unknown>

function resolvePath(ctx: Ctx, path: string): unknown {
  if (!path) return undefined
  const parts = path.split('.').map(s => s.trim()).filter(Boolean)
  let cur: unknown = ctx
  for (const p of parts) {
    if (cur == null) return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function stringify(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toISOString()
  try { return JSON.stringify(v) } catch { return '' }
}

/** Render {{#each list}}...{{/each}} blocks. Inner context gets `@item` + `@index`. */
function renderEach(template: string, ctx: Ctx): string {
  return template.replace(/\{\{#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g, (_m, path, body) => {
    const list = resolvePath(ctx, path)
    if (!Array.isArray(list)) return ''
    return list.map((item, idx) => {
      const inner = { ...ctx, '@item': item, '@index': idx }
      return renderTemplate(body, inner)
    }).join('')
  })
}

/** Render {{#if cond}}...{{/if}} blocks. */
function renderIf(template: string, ctx: Ctx): string {
  return template.replace(/\{\{#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_m, path, body) => {
    const val = resolvePath(ctx, path)
    return val ? renderTemplate(body, ctx) : ''
  })
}

/** Render {{field.path}} simple interpolations. */
function renderVars(template: string, ctx: Ctx): string {
  return template.replace(/\{\{\s*([@\w.]+)\s*\}\}/g, (_m, path) => {
    return stringify(resolvePath(ctx, path))
  })
}

// Bundle CP — bound the input so the {{#each}} / {{#if}} regex
// passes can't be weaponised into ReDoS by a hostile author of a
// stored template. Realistic email/SMS bodies are <16 KB; anything
// larger is either malicious padding or a misuse of the renderer.
const MAX_TEMPLATE_LENGTH = 32_768

export function renderTemplate(template: string, ctx: Ctx): string {
  if (!template) return ''
  if (template.length > MAX_TEMPLATE_LENGTH) {
    throw new Error(`Template exceeds maximum length (${MAX_TEMPLATE_LENGTH} chars)`)
  }
  // Order: each → if → vars (innermost blocks can use outer vars)
  let out = renderEach(template, ctx)
  out = renderIf(out, ctx)
  out = renderVars(out, ctx)
  return out
}

/** Extract all merge field names used in a template (for UI hints). */
export function extractVariables(template: string): string[] {
  const set = new Set<string>()
  const re = /\{\{\s*(?:#(?:if|each)\s+)?([@\w.]+)\s*\}?\}?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(template))) {
    if (m[1].startsWith('@')) continue
    set.add(m[1])
  }
  return Array.from(set)
}
