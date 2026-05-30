'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import {
  Upload, FileText, ArrowLeft, AlertCircle, CheckCircle2,
  Loader2, Trash2, ChevronRight,
} from 'lucide-react'
import {
  parseCsv,
  suggestMapping,
  MAX_CSV_BYTES,
  type ContactImportField,
  type ParseResult,
} from '@/lib/philly/import/csv-parse'

type Stage = 'pick' | 'preview' | 'submitting' | 'done'

interface SubmitResult {
  inserted: number
  skipped_existing: number
  skipped_intra_request: number
  total: number
}

const FIELD_LABELS: Record<ContactImportField, string> = {
  name: 'Name (required)',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
  type: 'Type',
  notes: 'Notes',
  leadSource: 'Lead source',
  leadStatus: 'Lead status',
  skip: '— skip column —',
}

const FIELD_OPTIONS: ContactImportField[] = [
  'skip', 'name', 'email', 'phone', 'company', 'type', 'notes', 'leadSource', 'leadStatus',
]

const sectionStyle: React.CSSProperties = {
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit',
  outline: 'none',
}

const accentBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
  cursor: 'pointer', fontFamily: 'inherit',
}

const ghostBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
  background: 'transparent', color: 'var(--txt2)',
  border: '1px solid var(--border)', cursor: 'pointer',
  fontFamily: 'inherit',
}

export default function ContactsImportPage() {
  const [stage, setStage] = useState<Stage>('pick')
  const [filename, setFilename] = useState<string>('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [mapping, setMapping] = useState<Record<string, ContactImportField>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)

  const onFile = useCallback(async (file: File) => {
    setError(null)
    if (file.size > MAX_CSV_BYTES) {
      setError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — max ${(MAX_CSV_BYTES / 1024 / 1024).toFixed(0)} MB.`)
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      setError('Could not read file.')
      return
    }
    const parsed = parseCsv(text)
    if (parsed.rows.length === 0) {
      setError('No data rows found. Make sure the first line is a header.')
      return
    }
    setFilename(file.name)
    setParseResult(parsed)
    setMapping(suggestMapping(parsed.columns))
    setStage('preview')
  }, [])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void onFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) void onFile(f)
  }

  const reset = () => {
    setStage('pick')
    setFilename('')
    setParseResult(null)
    setMapping({})
    setError(null)
    setSubmitResult(null)
  }

  const fieldsAssigned = useMemo(() => {
    return new Set(Object.values(mapping).filter(v => v !== 'skip'))
  }, [mapping])

  const hasName = fieldsAssigned.has('name')
  const duplicateAssignments = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const v of Object.values(mapping)) {
      if (v !== 'skip') counts[v] = (counts[v] ?? 0) + 1
    }
    return Object.entries(counts).filter(([, n]) => n > 1).map(([f]) => f)
  }, [mapping])

  const submit = async () => {
    if (!parseResult) return
    setError(null)
    setStage('submitting')

    // Apply mapping to produce server-shape rows
    const mapped = parseResult.rows.map((row) => {
      const out: Record<string, string> = {}
      for (const [col, field] of Object.entries(mapping)) {
        if (field === 'skip') continue
        const v = row[col] ?? ''
        // If multiple columns map to the same field, the last non-empty wins
        if (v) out[field] = v
      }
      return out
    }).filter(r => r.name) // server requires name; pre-filter to give an honest count

    if (mapped.length === 0) {
      setError('No rows have a name after applying the mapping. Pick a column to map to "Name".')
      setStage('preview')
      return
    }

    try {
      const res = await fetch('/philly/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mapped, source: filename }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Import failed.')
        setStage('preview')
        return
      }
      setSubmitResult(json.data as SubmitResult)
      setStage('done')
    } catch {
      setError('Network error. Try again.')
      setStage('preview')
    }
  }

  return (
    <>
      <Topbar
        title="Import contacts"
        sub={
          stage === 'pick' ? 'Upload a CSV file'
          : stage === 'preview' ? `${parseResult?.rows.length ?? 0} rows from ${filename}`
          : stage === 'submitting' ? 'Importing…'
          : 'Import complete'
        }
      />
      <div style={{ padding: '20px 28px 40px', maxWidth: 880 }}>

        <Link
          href="/philly/contacts"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: 'var(--txt3)', textDecoration: 'none',
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={12} />
          Back to contacts
        </Link>

        {error && (
          <div style={{
            ...sectionStyle, padding: '10px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
            borderColor: 'var(--r, #dc2626)', color: 'var(--r, #dc2626)',
          }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {stage === 'pick' && (
          <div style={sectionStyle}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Choose a CSV file</div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 16 }}>
              Up to 10,000 rows. UTF-8 encoded (Excel default works). Headers in the first row.
            </div>

            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 8, padding: '36px 20px', borderRadius: 10,
                border: '2px dashed var(--border)', cursor: 'pointer',
                background: 'var(--bg2)', textAlign: 'center',
              }}
            >
              <Upload size={28} style={{ color: 'var(--txt3)' }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                Drop a CSV here, or click to choose
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                Max {(MAX_CSV_BYTES / 1024 / 1024).toFixed(0)} MB
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onFileInput}
                style={{ display: 'none' }}
              />
            </label>

            <div style={{ marginTop: 20, fontSize: 12, color: 'var(--txt3)', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Tips</div>
              <ul style={{ marginLeft: 18, padding: 0 }}>
                <li>We auto-detect: name, email, phone, company, notes, lead source, lead status</li>
                <li>Duplicates are detected by email (case-insensitive) — existing contacts are skipped, not overwritten</li>
                <li>You'll see a preview before anything is saved</li>
              </ul>
            </div>
          </div>
        )}

        {stage === 'preview' && parseResult && (
          <>
            {parseResult.errors.length > 0 && (
              <div style={{
                ...sectionStyle, padding: '12px 14px',
                borderColor: 'var(--y, #f59e0b)', background: 'var(--bg2)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--y, #b45309)' }}>
                  {parseResult.errors.length} row{parseResult.errors.length === 1 ? '' : 's'} skipped due to parse errors
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
                  {parseResult.errors.slice(0, 3).map(e => `Line ${e.line}: ${e.reason}`).join(' · ')}
                  {parseResult.errors.length > 3 && ' …'}
                </div>
              </div>
            )}

            <div style={sectionStyle}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                Map columns
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 16 }}>
                We made a best guess. Override anything we got wrong. Mark a column as "skip" to leave it out of the import.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {parseResult.columns.map((col) => (
                  <div key={col} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                    gap: 12, alignItems: 'center',
                    padding: '8px 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {col}
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--txt3)' }} />
                    <select
                      value={mapping[col] ?? 'skip'}
                      onChange={(e) =>
                        setMapping(m => ({ ...m, [col]: e.target.value as ContactImportField }))
                      }
                      style={inputStyle}
                    >
                      {FIELD_OPTIONS.map(f => (
                        <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {!hasName && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--r, #dc2626)' }}>
                  Pick one column to map to "Name" — it's required for every contact.
                </div>
              )}
              {duplicateAssignments.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--y, #b45309)' }}>
                  Multiple columns map to: {duplicateAssignments.join(', ')}. The last non-empty value wins.
                </div>
              )}
            </div>

            {/* First 5 rows preview after applying mapping */}
            <div style={sectionStyle}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                Preview (first 5 rows)
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 16 }}>
                What will land in DEUS based on your mapping above.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {(['name', 'email', 'phone', 'company'] as ContactImportField[]).map(f => (
                        <th key={f} style={{
                          textAlign: 'left', padding: '6px 10px',
                          borderBottom: '1px solid var(--border)',
                          fontSize: 11, fontWeight: 600, color: 'var(--txt2)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>{f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.rows.slice(0, 5).map((row, i) => {
                      const display: Record<string, string> = {}
                      for (const [col, field] of Object.entries(mapping)) {
                        if (field === 'skip') continue
                        const v = row[col] ?? ''
                        if (v) display[field] = v
                      }
                      return (
                        <tr key={i}>
                          {(['name', 'email', 'phone', 'company'] as const).map(f => (
                            <td key={f} style={{
                              padding: '8px 10px',
                              borderBottom: '1px solid var(--border)',
                              color: display[f] ? 'var(--txt)' : 'var(--txt3)',
                            }}>
                              {display[f] || '—'}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={submit}
                style={{ ...accentBtnStyle, opacity: hasName ? 1 : 0.5 }}
                disabled={!hasName}
              >
                <Upload size={14} />
                Import {parseResult.rows.length} rows
              </button>
              <button type="button" onClick={reset} style={ghostBtnStyle}>
                <Trash2 size={14} />
                Start over
              </button>
            </div>
          </>
        )}

        {stage === 'submitting' && (
          <div style={{
            ...sectionStyle, textAlign: 'center', padding: '40px 20px',
            color: 'var(--txt3)',
          }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 500, color: 'var(--txt)' }}>
              Importing contacts…
            </div>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              Don't close this tab.
            </div>
          </div>
        )}

        {stage === 'done' && submitResult && (
          <div style={{
            ...sectionStyle, borderColor: 'var(--g, #16a34a)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CheckCircle2 size={20} style={{ color: 'var(--g, #16a34a)' }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>Import complete</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7 }}>
              <div><strong>{submitResult.inserted}</strong> new contacts added</div>
              {submitResult.skipped_existing > 0 && (
                <div>{submitResult.skipped_existing} skipped (already in DEUS by email)</div>
              )}
              {submitResult.skipped_intra_request > 0 && (
                <div>{submitResult.skipped_intra_request} skipped (duplicate within the file)</div>
              )}
              <div style={{ color: 'var(--txt3)' }}>
                {submitResult.total} rows submitted total
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Link href="/philly/contacts" style={{ ...accentBtnStyle, textDecoration: 'none' }}>
                View contacts
                <ChevronRight size={14} />
              </Link>
              <button type="button" onClick={reset} style={ghostBtnStyle}>
                <FileText size={14} />
                Import another file
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
