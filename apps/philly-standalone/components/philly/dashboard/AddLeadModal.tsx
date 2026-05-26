'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { Upload, CheckCircle, FileText, X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  industry: string
  onAdd?: (data: any) => void
}

const sourcesByIndustry: Record<string, string[]> = {
  philanthropy: ['Referral', 'Website', 'Event', 'Social Media', 'Direct'],
  realestate: ['Website Portal', 'Referral', 'Open House', 'Social Media', 'Agent Network', 'Other'],
  hospitality: ['Booking.com', 'Expedia', 'Direct', 'Google', 'Travel Agent', 'Walk-in'],
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 500,
  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--txt)', outline: 'none', transition: 'border 150ms',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

export function AddLeadModal({ open, onClose, industry, onAdd }: Props) {
  const t = useTranslations('addLead')

  const [tab, setTab] = useState<'manual' | 'csv'>('manual')
  const [success, setSuccess] = useState(false)

  // Manual form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // File-import state (CSV + XLSX share the same preview/headers data path —
  // the variable names keep the historical `csv` prefix for diff stability).
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<string[][]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [xlsxError, setXlsxError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sources = sourcesByIndustry[industry] || sourcesByIndustry.philanthropy
  // Localised entity label — keyed by industry. Real-estate → "Lead",
  // hospitality → "Booking", everything else → "Contact".
  const entityKey = industry === 'hospitality' ? 'booking' : industry === 'realestate' ? 'lead' : 'contact'
  const entityLabel = t(`entity.${entityKey}`)

  const resetForm = useCallback(() => {
    setName(''); setEmail(''); setPhone(''); setSource(''); setCompany(''); setNotes('')
    setErrors({}); setCsvFile(null); setCsvPreview([]); setCsvHeaders([]); setXlsxError(null); setSuccess(false); setTab('manual')
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const validateManual = (): boolean => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = t('errors.nameRequired')
    if (!phone.trim()) e.phone = t('errors.phoneRequired')
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t('errors.invalidEmail')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validateManual()) return
    const data = { name: name.trim(), email: email.trim(), phone: phone.trim(), source, company: company.trim(), notes: notes.trim() }
    onAdd?.(data)
    setSuccess(true)
    setTimeout(() => { handleClose() }, 1500)
  }

  const parseCsv = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length === 0) return
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    setCsvHeaders(headers)
    const rows = lines.slice(1, 6).map(line =>
      line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    )
    setCsvPreview(rows)
  }

  // Dynamic import keeps the ~270KB `read-excel-file` module out of the
  // initial page bundle — only fetched when the operator actually picks
  // an .xlsx file.
  const parseXlsx = async (file: File) => {
    try {
      // Subpath import — the package only exposes /browser, /node, /universal,
      // /web-worker exports (no bare default).
      //
      // Use `readSheet` (named export) rather than the `readXlsxFile` default —
      // the default returns Sheet[] (all sheets, each as `{ sheet, data }`),
      // whereas `readSheet` returns SheetData directly for the first sheet,
      // which is what we want for a contacts import.
      const mod = await import('read-excel-file/browser')
      const rows = await mod.readSheet(file)
      if (rows.length === 0) return
      const headers = rows[0].map(h => String(h ?? '').trim())
      setCsvHeaders(headers)
      // Up to 5 preview rows, every cell coerced to string for the table.
      const preview: string[][] = rows.slice(1, 6).map(row =>
        row.map(cell => (cell === null || cell === undefined ? '' : String(cell)))
      )
      setCsvPreview(preview)
    } catch {
      // Surface a localised parse error and clear the file picker so the
      // operator can try a different file. We deliberately swallow the
      // raw library error here to keep the UI deterministic.
      setCsvFile(null)
      setCsvHeaders([])
      setCsvPreview([])
      setXlsxError(t('csv.xlsxParseFailed'))
    }
  }

  const handleFile = (file: File) => {
    const lower = file.name.toLowerCase()
    const isCsv = lower.endsWith('.csv')
    const isXlsx = lower.endsWith('.xlsx')
    if (!isCsv && !isXlsx) return
    setCsvFile(file)
    setXlsxError(null)
    if (isCsv) {
      const reader = new FileReader()
      reader.onload = (e) => { parseCsv(e.target?.result as string) }
      reader.readAsText(file)
    } else {
      void parseXlsx(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 0', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
    background: active ? 'var(--accent-bg)' : 'transparent',
    color: active ? 'var(--accent-txt)' : 'var(--txt3)',
    border: active ? '1px solid var(--accent-border, var(--border))' : '1px solid var(--border)',
    borderRadius: 8, textAlign: 'center' as const, transition: 'all 150ms',
  })

  return (
    <Modal open={open} onClose={handleClose} title={t('title', { entity: entityLabel })} subtitle={t('subtitle')} size="sm">
      {success ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 12 }}>
          <CheckCircle size={40} color="var(--g)" />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--g-txt)' }}>{t('success')}</div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button style={tabStyle(tab === 'manual')} onClick={() => setTab('manual')}>{t('tabs.manual')}</button>
            <button style={tabStyle(tab === 'csv')} onClick={() => setTab('csv')}>{t('tabs.csv')}</button>
          </div>

          {tab === 'manual' ? (
            <>
              <FormField label={t('fields.name')} required>
                <input
                  style={{ ...inputStyle, borderColor: errors.name ? 'var(--r)' : 'var(--border)' }}
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder={t('placeholders.name')}
                />
                {errors.name && <span style={{ fontSize: 11, color: 'var(--r)', marginTop: 3, display: 'block' }}>{errors.name}</span>}
              </FormField>

              <FormField label={t('fields.email')}>
                <input
                  style={{ ...inputStyle, borderColor: errors.email ? 'var(--r)' : 'var(--border)' }}
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={t('placeholders.email')}
                />
                {errors.email && <span style={{ fontSize: 11, color: 'var(--r)', marginTop: 3, display: 'block' }}>{errors.email}</span>}
              </FormField>

              <FormField label={t('fields.phone')} required>
                <input
                  style={{ ...inputStyle, borderColor: errors.phone ? 'var(--r)' : 'var(--border)' }}
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder={t('placeholders.phone')}
                />
                {errors.phone && <span style={{ fontSize: 11, color: 'var(--r)', marginTop: 3, display: 'block' }}>{errors.phone}</span>}
              </FormField>

              <FormField label={t('fields.source')}>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={source} onChange={e => setSource(e.target.value)}
                >
                  <option value="">{t('placeholders.source')}</option>
                  {sources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>

              <FormField label={t('fields.company')}>
                <input style={inputStyle} value={company} onChange={e => setCompany(e.target.value)} placeholder={t('placeholders.company')} />
              </FormField>

              <FormField label={t('fields.notes')}>
                <textarea
                  style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder={t('placeholders.notes')}
                />
              </FormField>

              <button
                onClick={handleSubmit}
                style={{
                  width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 600,
                  background: 'var(--accent)', color: 'var(--accent-txt)', border: 'none',
                  borderRadius: 8, cursor: 'pointer', marginTop: 4,
                  transition: 'opacity 150ms',
                }}
              >
                {t('submit', { entity: entityLabel })}
              </button>
            </>
          ) : (
            <>
              {!csvFile ? (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '40px 20px', textAlign: 'center',
                    background: dragging ? 'var(--accent-bg)' : 'var(--bg2)',
                    transition: 'all 150ms', cursor: 'pointer',
                  }}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={28} color="var(--txt3)" style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4 }}>
                    {t('csv.dropPrompt')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--txt3)' }}>
                    {t('csv.or')} <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>{t('csv.browse')}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 8 }}>{t('csv.acceptsFormats')}</div>
                  {xlsxError && (
                    <div style={{ fontSize: 11, color: 'var(--r)', marginTop: 8, fontWeight: 600 }}>
                      {xlsxError}
                    </div>
                  )}
                  <input
                    ref={fileRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />
                </div>
              ) : (
                <>
                  {/* File info */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16,
                  }}>
                    <FileText size={18} color="var(--accent)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{csvFile.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{formatFileSize(csvFile.size)}</div>
                    </div>
                    <button
                      onClick={() => { setCsvFile(null); setCsvPreview([]); setCsvHeaders([]) }}
                      style={{
                        width: 24, height: 24, borderRadius: 6, background: 'var(--r-bg)',
                        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <X size={12} color="var(--r)" />
                    </button>
                  </div>

                  {/* Preview table */}
                  {csvPreview.length > 0 && (
                    <div style={{ overflowX: 'auto', marginBottom: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                        <thead>
                          <tr>
                            {csvHeaders.slice(0, 4).map((h, i) => (
                              <th key={i} style={{
                                padding: '8px 10px', textAlign: 'left', fontWeight: 600,
                                background: 'var(--bg2)', color: 'var(--txt2)',
                                borderBottom: '1px solid var(--border)',
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.map((row, ri) => (
                            <tr key={ri}>
                              {row.slice(0, 4).map((cell, ci) => (
                                <td key={ci} style={{
                                  padding: '6px 10px', color: 'var(--txt2)',
                                  borderBottom: '1px solid var(--border)',
                                }}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const isXlsx = csvFile.name.toLowerCase().endsWith('.xlsx')
                      onAdd?.({
                        csv: !isXlsx,         // back-compat — true when source was CSV
                        xlsx: isXlsx,
                        format: isXlsx ? 'xlsx' : 'csv',
                        rows: csvPreview.length,
                        file: csvFile.name,
                      })
                      setSuccess(true)
                      setTimeout(() => { handleClose() }, 1500)
                    }}
                    style={{
                      width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 600,
                      background: 'var(--accent)', color: 'var(--accent-txt)', border: 'none',
                      borderRadius: 8, cursor: 'pointer',
                    }}
                  >
                    {t('csv.import', { count: csvPreview.length })}
                  </button>
                </>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  )
}
