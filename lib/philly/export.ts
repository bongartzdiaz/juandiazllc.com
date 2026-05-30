// CSV-injection sentinels. A cell beginning with one of these is treated
// as a formula by Excel/Sheets, so we prefix it with a single quote to
// force text interpretation. Mirrors lib/philly/import/csv-parse.ts
// neutralizeFormula (inlined here to keep this client module free of any
// server-side import). Idempotent. See OWASP CSV-injection guidance.
const FORMULA_PREFIXES = new Set(['=', '+', '-', '@'])
function neutralizeFormula(value: string): string {
  if (!value) return value
  return FORMULA_PREFIXES.has(value[0]!) ? `'${value}` : value
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = neutralizeFormula(String(row[h] ?? ''))
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
    }).join(','))
  ].join('\n')

  triggerDownload(csvContent, 'text/csv;charset=utf-8;', `${filename}-${today()}.csv`)
}

export function exportToJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2)
  triggerDownload(json, 'application/json;charset=utf-8;', `${filename}-${today()}.json`)
}

export function exportAllData(
  collections: Record<string, Record<string, unknown>[]>,
  format: 'csv' | 'json' = 'csv',
) {
  for (const [name, rows] of Object.entries(collections)) {
    if (rows.length === 0) continue
    if (format === 'json') {
      exportToJSON(rows, name)
    } else {
      exportToCSV(rows, name)
    }
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function triggerDownload(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
