'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { X, Trash2, Edit2 } from 'lucide-react'
import { useToast } from '@/hooks/philly/useToast'

interface SoiCategory {
  id: string
  name: string
  touchFrequency: number
  color: string
  createdAt: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
  outline: 'none',
}

export default function SoiPage() {
  const [categories, setCategories] = useState<SoiCategory[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addFrequency, setAddFrequency] = useState('30')
  const [addColor, setAddColor] = useState('#4f46e5')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const t = useTranslations('soi')
  const { addToast } = useToast()

  function openEdit(c: SoiCategory) {
    setEditingId(c.id)
    setAddName(c.name)
    setAddFrequency(String(c.touchFrequency))
    setAddColor(c.color)
    setShowAdd(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category?')) return
    try {
      const res = await fetch(`/api/soi?id=${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast('Category deleted', 'success')
        fetchData()
      } else { addToast('Delete failed', 'error') }
    } catch { addToast('Network error', 'error') }
  }

  const closeAddModal = () => {
    setShowAdd(false)
    setEditingId(null)
    setAddError(null)
    setAddName(''); setAddFrequency('30'); setAddColor('#4f46e5')
  }

  const handleAddCategory = async () => {
    if (saving) return
    if (!addName.trim()) {
      setAddError('Name is required')
      return
    }
    setSaving(true)
    setAddError(null)
    try {
      const payload = {
        name: addName.trim(),
        touchFrequency: Number(addFrequency) || 30,
        color: addColor,
      }
      const res = editingId
        ? await fetch('/api/soi', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingId, ...payload }),
          })
        : await fetch('/api/soi', {
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
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      const res = await fetch(`/api/soi?${params}`)
      const json = await res.json()
      setCategories(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setCategories([]) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const avgFrequency = categories.length > 0
    ? Math.round(categories.reduce((s, c) => s + c.touchFrequency, 0) / categories.length)
    : 0

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel="Category" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="folder" label="Total Categories" value={String(total)} />
          <KpiCard icon="calendar" label="Avg Touch Frequency" value={`${avgFrequency} days`} />
          <KpiCard icon="users" label="Categories" value={String(categories.length)} />
        </div>

        {/* Category Cards Grid */}
        {loading ? (
          <div style={{
            padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13,
            background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)',
          }}>Loading...</div>
        ) : categories.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13,
            background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)',
          }}>No SOI categories yet. Add one to get started.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{
                padding: '16px 18px', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--panel)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: cat.color, flexShrink: 0,
                  }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)', flex: 1 }}>{cat.name}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt2)' }}>
                  Every {cat.touchFrequency} days
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 6, borderTop: '1px solid var(--border)', marginTop: 'auto',
                }}>
                  <span style={{ fontSize: 10, color: 'var(--txt3)' }}>
                    Created {new Date(cat.createdAt).toLocaleDateString()}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(cat)} title="Edit" style={miniBtn('var(--txt2)')}>
                      <Edit2 size={10} />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} title="Delete" style={miniBtn('var(--r-txt)')}>
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Add Category Modal */}
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
            aria-labelledby="soi-add-title"
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px', width: 420, maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div id="soi-add-title" style={{ fontSize: 16, fontWeight: 700 }}>{editingId ? 'Edit Category' : 'Add Category'}</div>
              <button onClick={closeAddModal} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 2, display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>Create a new SOI category</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Name</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="e.g. Close Friends" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Days between touches</label>
                <input type="number" min={1} value={addFrequency} onChange={e => setAddFrequency(e.target.value)} placeholder="30" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={addColor} onChange={e => setAddColor(e.target.value)} style={{
                    width: 40, height: 34, borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg2)', cursor: 'pointer', padding: 2,
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--txt2)', fontFamily: "var(--font-red-hat-mono), monospace" }}>{addColor}</span>
                </div>
              </div>
            </div>
            {addError && (
              <div role="alert" style={{
                padding: '8px 12px', borderRadius: 8, marginTop: 8,
                background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
              }}>{addError}</div>
            )}
            <button onClick={handleAddCategory} disabled={saving} style={{
              width: '100%', marginTop: 18, padding: '10px 0',
              borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add Category'}</button>
          </div>
        </div>
      )}
    </>
  )
}

function miniBtn(color: string): React.CSSProperties {
  return {
    width: 22, height: 22, borderRadius: 5,
    background: 'transparent', border: '1px solid var(--border)',
    color, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
