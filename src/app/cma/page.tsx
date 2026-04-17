'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { Filter, MapPin, Bed, Bath, Maximize, BarChart3, Trash2, Edit2, Send, Eye } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface CMA {
  id: string
  agentId: string
  contactId: string
  propertyId: string
  subjectAddress: string
  subjectCity: string
  subjectZip: string
  subjectBeds: number
  subjectBaths: number
  subjectSqft: number
  estimatedValue: number
  comparablesJson: string
  adjustmentsJson: string
  status: string
  createdAt: string
}

const STATUS_COLORS: Record<string, { bg: string; txt: string; border: string }> = {
  draft:  { bg: 'var(--y-bg)',  txt: 'var(--y-txt)',  border: 'var(--y-border)' },
  sent:   { bg: 'var(--b-bg)',  txt: 'var(--b-txt)',  border: 'var(--b-border)' },
  viewed: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
}

export default function CmaPage() {
  const [cmas, setCmas] = useState<CMA[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addAddress, setAddAddress] = useState('')
  const [addCity, setAddCity] = useState('')
  const [addZip, setAddZip] = useState('')
  const [addBeds, setAddBeds] = useState('')
  const [addBaths, setAddBaths] = useState('')
  const [addSqft, setAddSqft] = useState('')
  const [addValue, setAddValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const t = useTranslations('cma')
  const { addToast } = useToast()

  const closeAddModal = () => {
    setShowAdd(false)
    setEditingId(null)
    setAddError(null)
    setAddAddress(''); setAddCity(''); setAddZip('')
    setAddBeds(''); setAddBaths(''); setAddSqft('')
    setAddValue('')
  }

  function openEdit(c: CMA) {
    setEditingId(c.id)
    setAddAddress(c.subjectAddress)
    setAddCity(c.subjectCity)
    setAddZip(c.subjectZip)
    setAddBeds(String(c.subjectBeds || ''))
    setAddBaths(String(c.subjectBaths || ''))
    setAddSqft(String(c.subjectSqft || ''))
    setAddValue(String((c.estimatedValue || 0) / 100))
    setShowAdd(true)
  }

  async function changeStatus(id: string, status: string) {
    try {
      const res = await fetch('/api/cma', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) { addToast('Update failed', 'error'); return }
      addToast(`Marked ${status}`, 'success')
      fetchData()
    } catch { addToast('Network error', 'error') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this CMA report?')) return
    try {
      const res = await fetch(`/api/cma?id=${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast('CMA deleted', 'success')
        fetchData()
      } else { addToast('Delete failed', 'error') }
    } catch { addToast('Network error', 'error') }
  }

  const handleAddCma = async () => {
    if (saving) return
    if (!addAddress.trim()) { setAddError('Address is required'); return }
    setSaving(true)
    setAddError(null)
    try {
      const payload: Record<string, unknown> = {
        subjectAddress: addAddress.trim(),
        subjectCity: addCity.trim(),
        subjectZip: addZip.trim(),
        subjectBeds: Number(addBeds) || 0,
        subjectBaths: Number(addBaths) || 0,
        subjectSqft: Number(addSqft) || 0,
        estimatedValue: Math.round((parseFloat(addValue) || 0) * 100),
      }
      const res = editingId
        ? await fetch('/api/cma', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingId, ...payload }),
          })
        : await fetch('/api/cma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(json?.error ?? json?.message ?? `Failed (${res.status})`)
        return
      }
      closeAddModal()
      fetchData()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/cma?${params}`)
      const json = await res.json()
      setCmas(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setCmas([]) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const drafts = cmas.filter(c => c.status === 'draft').length
  const sent = cmas.filter(c => c.status === 'sent').length
  const avgValue = cmas.length
    ? Math.round(cmas.reduce((s, c) => s + c.estimatedValue, 0) / cmas.length / 100)
    : 0

  const getComparablesCount = (json: string): number => {
    try { return JSON.parse(json)?.length ?? 0 } catch { return 0 }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel="CMA" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="folder" label="Total CMAs" value={String(total)} />
          <KpiCard icon="target" label="Draft" value={String(drafts)} />
          <KpiCard icon="trending-up" label="Sent" value={String(sent)} />
          <KpiCard icon="dollar-sign" label="Avg Estimated Value" value={`$${avgValue.toLocaleString()}`} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'sent', label: 'Sent' },
              { value: 'viewed', label: 'Viewed' },
            ]} />
        </div>

        {/* Card Grid */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
        ) : cmas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No CMA reports found.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {cmas.map(cma => {
              const sc = STATUS_COLORS[cma.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt3)', border: 'var(--border)' }
              const comps = getComparablesCount(cma.comparablesJson)
              return (
                <div key={cma.id} style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  {/* Header: address + status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <MapPin size={12} style={{ color: 'var(--txt3)', flexShrink: 0 }} />
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cma.subjectAddress}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)', paddingLeft: 18 }}>
                        {cma.subjectCity}{cma.subjectZip ? `, ${cma.subjectZip}` : ''}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', background: sc.bg, color: sc.txt,
                      border: `1px solid ${sc.border}`, flexShrink: 0,
                    }}>{cma.status}</span>
                  </div>

                  {/* Property details row */}
                  <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--txt2)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Bed size={12} style={{ color: 'var(--txt3)' }} /> {cma.subjectBeds} bd
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Bath size={12} style={{ color: 'var(--txt3)' }} /> {cma.subjectBaths} ba
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Maximize size={12} style={{ color: 'var(--txt3)' }} /> {cma.subjectSqft.toLocaleString()} sqft
                    </span>
                  </div>

                  {/* Estimated value */}
                  <div className="mono" style={{
                    fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em',
                    color: 'var(--txt)',
                    fontFamily: "var(--font-red-hat-mono), 'Red Hat Mono', monospace",
                  }}>
                    ${(cma.estimatedValue / 100).toLocaleString()}
                  </div>

                  {/* Footer: comparables + date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--txt3)' }}>
                      <BarChart3 size={11} /> {comps} comparable{comps !== 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {cma.status === 'draft' && (
                        <button onClick={() => changeStatus(cma.id, 'sent')} title="Mark sent" style={miniBtn('var(--b-txt)')}>
                          <Send size={10} />
                        </button>
                      )}
                      {cma.status === 'sent' && (
                        <button onClick={() => changeStatus(cma.id, 'viewed')} title="Mark viewed" style={miniBtn('var(--accent-txt)')}>
                          <Eye size={10} />
                        </button>
                      )}
                      <button onClick={() => openEdit(cma)} title="Edit" style={miniBtn('var(--txt2)')}>
                        <Edit2 size={10} />
                      </button>
                      <button onClick={() => handleDelete(cma.id)} title="Delete" style={miniBtn('var(--r-txt)')}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Add CMA Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }} onClick={closeAddModal}>
          <div
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cma-add-title"
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px', width: 460, maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div id="cma-add-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{editingId ? 'Edit CMA' : 'Add CMA'}</div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>{editingId ? 'Update CMA report details' : 'Create a new Comparative Market Analysis'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ModalField label="Subject Address">
                <input value={addAddress} onChange={e => setAddAddress(e.target.value)} style={inputStyle} placeholder="123 Main St" />
              </ModalField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ModalField label="City">
                  <input value={addCity} onChange={e => setAddCity(e.target.value)} style={inputStyle} placeholder="Philadelphia" />
                </ModalField>
                <ModalField label="ZIP">
                  <input value={addZip} onChange={e => setAddZip(e.target.value)} style={inputStyle} placeholder="19103" />
                </ModalField>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <ModalField label="Beds">
                  <input type="number" min={0} value={addBeds} onChange={e => setAddBeds(e.target.value)} style={inputStyle} />
                </ModalField>
                <ModalField label="Baths">
                  <input type="number" min={0} step={0.5} value={addBaths} onChange={e => setAddBaths(e.target.value)} style={inputStyle} />
                </ModalField>
                <ModalField label="Sqft">
                  <input type="number" min={0} value={addSqft} onChange={e => setAddSqft(e.target.value)} style={inputStyle} />
                </ModalField>
              </div>
              <ModalField label="Estimated Value ($)">
                <input type="number" min={0} value={addValue} onChange={e => setAddValue(e.target.value)} style={inputStyle} placeholder="350000" />
              </ModalField>
            </div>
            {addError && (
              <div role="alert" style={{
                padding: '8px 12px', borderRadius: 8, marginTop: 8,
                background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
              }}>{addError}</div>
            )}
            <button onClick={handleAddCma} disabled={saving} style={{
              width: '100%', marginTop: 18, padding: '10px 0',
              borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add CMA'}</button>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Helpers ── */

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
}

function miniBtn(color: string): React.CSSProperties {
  return {
    width: 22, height: 22, borderRadius: 5,
    background: 'transparent', border: '1px solid var(--border)',
    color, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{label}</label>
      {children}
    </div>
  )
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
      <Filter size={13} style={{ color: 'var(--txt3)' }} />
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
