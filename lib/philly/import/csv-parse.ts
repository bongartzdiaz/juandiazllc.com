/* ---------------------------------------------------------------
   Minimal CSV parser + formula-injection neutralization.

   We parse CSV on the *client* and POST the resulting JSON rows to
   /api/contacts/import. Reasons:
     1. The server doesn't have to deal with multipart bodies +
        encoding-detection + CSV parser CVEs.
     2. We can preview + map columns before any data hits the DB.
     3. Server still validates every row via Zod — client-side parsing
        is convenience, not trust.

   Formula injection (CSV escape on re-export): cells beginning with
   `=`, `+`, `-`, `@` are prefixed with a single quote when re-emitted.
   We do this on parse so even if downstream code re-exports we stay
   safe. See: OWASP "CSV Injection".
   --------------------------------------------------------------- */

export interface ParseResult {
  /** Detected header row, in source order. */
  columns: string[]
  /** Body rows, each as an object keyed by header. */
  rows: Record<string, string>[]
  /** Total rows seen including the header. */
  totalLines: number
  /** Rows that failed to parse (bad quoting, mismatched cols). */
  errors: { line: number; reason: string }[]
}

/** Hard cap on the input CSV size we parse client-side. 5 MB is plenty for
 *  the 10k-row max we accept on the import endpoint, and prevents accidental
 *  bricking of the browser tab on a huge file. */
export const MAX_CSV_BYTES = 5 * 1024 * 1024

const FORMULA_PREFIXES = new Set(['=', '+', '-', '@'])

/** Neutralize CSV-injection sentinels. Idempotent. */
export function neutralizeFormula(value: string): string {
  if (!value) return value
  if (FORMULA_PREFIXES.has(value[0]!)) {
    return `'${value}`
  }
  return value
}

/**
 * Parses a CSV text into headers + row objects.
 * Supports double-quoted fields with embedded commas, newlines, and
 * "" (escaped quote inside quoted field). Trims surrounding whitespace
 * on every cell. Empty trailing lines are ignored.
 */
export function parseCsv(text: string): ParseResult {
  const errors: ParseResult['errors'] = []
  const allRows = parseRows(text, errors)

  if (allRows.length === 0) {
    return { columns: [], rows: [], totalLines: 0, errors }
  }

  const columns = (allRows[0] ?? []).map((h) => h.trim())
  const dataRows = allRows.slice(1)

  const rows: Record<string, string>[] = []
  for (let i = 0; i < dataRows.length; i++) {
    const cells = dataRows[i]!
    if (cells.length === 1 && cells[0] === '') continue // blank line
    if (cells.length !== columns.length) {
      errors.push({
        line: i + 2,
        reason: `Expected ${columns.length} columns, got ${cells.length}`,
      })
      continue
    }
    const row: Record<string, string> = {}
    for (let c = 0; c < columns.length; c++) {
      const key = columns[c]!
      const raw = cells[c] ?? ''
      row[key] = neutralizeFormula(raw.trim())
    }
    rows.push(row)
  }

  return { columns, rows, totalLines: allRows.length, errors }
}

/** Splits CSV text into an array of rows, each an array of cells. */
function parseRows(text: string, errors: ParseResult['errors']): string[][] {
  const out: string[][] = []
  let cur: string[] = []
  let cell = ''
  let inQuotes = false
  let line = 1

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      cur.push(cell)
      cell = ''
      continue
    }
    if (ch === '\r') continue // strip carriage returns
    if (ch === '\n') {
      cur.push(cell)
      out.push(cur)
      cur = []
      cell = ''
      line++
      continue
    }
    cell += ch
  }

  // Trailing cell / row (no final newline)
  if (cell.length > 0 || cur.length > 0) {
    cur.push(cell)
    out.push(cur)
  }

  if (inQuotes) {
    errors.push({ line, reason: 'Unterminated quoted field' })
  }

  return out
}

/* ── Column-name auto-mapping ──────────────────────────────────────
   When a customer uploads a CSV with arbitrary headers, we suggest
   which DEUS contact field each header probably maps to. The user
   can override every suggestion before submitting. */

export type ContactImportField =
  | 'name' | 'email' | 'phone' | 'company' | 'type'
  | 'notes' | 'leadSource' | 'leadStatus' | 'skip'

const HEADER_PATTERNS: Array<{ field: ContactImportField; rx: RegExp }> = [
  { field: 'name',       rx: /^(full[\s_-]?name|contact[\s_-]?name|name)$/i },
  { field: 'email',      rx: /^(e?[\s_-]?mail|email[\s_-]?address)$/i },
  { field: 'phone',      rx: /^(phone|mobile|tel|telephone|cell)$/i },
  { field: 'company',    rx: /^(company|organi[sz]ation|employer|business)$/i },
  { field: 'type',       rx: /^(type|category|kind)$/i },
  { field: 'notes',      rx: /^(notes?|remarks?|comments?)$/i },
  { field: 'leadSource', rx: /^(lead[\s_-]?source|source|channel)$/i },
  { field: 'leadStatus', rx: /^(lead[\s_-]?status|status|stage)$/i },
]

/** Returns an auto-mapping for the given headers. Headers that don't match
 *  anything map to 'skip' so they're explicitly excluded by default. */
export function suggestMapping(columns: string[]): Record<string, ContactImportField> {
  const out: Record<string, ContactImportField> = {}
  for (const col of columns) {
    const trimmed = col.trim()
    let mapped: ContactImportField = 'skip'
    for (const { field, rx } of HEADER_PATTERNS) {
      if (rx.test(trimmed)) {
        mapped = field
        break
      }
    }
    out[col] = mapped
  }
  return out
}
