/* ---------------------------------------------------------------
   RFC 4180-compliant CSV serialiser
   ---------------------------------------------------------------
   Pure-function helper for client-side CSV export of any tabular
   data shape. Used by Bundle X (bulk export on the contacts list)
   and reusable for future bulk-export UIs on other entity pages.

   Why we don't pull in a library: papaparse is 50 KB minified and
   the slice of CSV we actually need (RFC 4180, UTF-8, quoting on
   delimiter / quote / newline) is ~30 lines. Saves a dependency
   hop and an extra route-level chunk.

   Browser download helper `downloadCsv()` triggers an `<a download>`
   click on a Blob URL. The Blob is revoked after the click so we
   don't leak the URL into the browser's pool.
   --------------------------------------------------------------- */

export interface CsvColumn<T> {
  /** Header label written to row 0. */
  header: string
  /** Field accessor — returns the cell value (stringified by toCsv). */
  value: (row: T) => string | number | boolean | Date | null | undefined
}

const NEEDS_QUOTING = /[",\r\n]/

function escapeCell(raw: string): string {
  if (!NEEDS_QUOTING.test(raw)) return raw
  // RFC 4180: wrap in quotes, double any embedded quote.
  return `"${raw.replace(/"/g, '""')}"`
}

function stringifyCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

export function toCsv<T>(rows: ReadonlyArray<T>, columns: ReadonlyArray<CsvColumn<T>>): string {
  const lines: string[] = [columns.map((c) => escapeCell(c.header)).join(',')]
  for (const row of rows) {
    const cells = columns.map((c) => escapeCell(stringifyCell(c.value(row))))
    lines.push(cells.join(','))
  }
  // CRLF terminator per RFC 4180. Most spreadsheets accept LF too,
  // but Excel on Windows strongly prefers CRLF.
  return lines.join('\r\n') + '\r\n'
}

/**
 * Trigger a CSV download in the browser. No-ops on the server.
 * The filename should NOT include the `.csv` extension — we add it.
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined') return
  // BOM keeps Excel happy with non-ASCII characters on first load.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename.replace(/\.csv$/i, '')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a tick — Safari needs the URL to outlive the click.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
