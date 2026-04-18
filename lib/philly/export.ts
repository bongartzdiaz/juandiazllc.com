export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = String(row[h] ?? '')
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
