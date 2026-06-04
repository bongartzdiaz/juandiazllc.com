'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/philly/layout/Topbar'
import Link from 'next/link'
import {
  MapPin, ArrowLeft, BedDouble, Bath, Ruler, Eye, Calendar, Clock,
  DollarSign, Check, X, Edit2, Trash2, Briefcase, Home,
} from 'lucide-react'
import { useToast } from '@/hooks/philly/useToast'
import { useFormat } from '@/hooks/philly/useFormat'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useConfirm } from '@/hooks/philly/useConfirm'

interface Property {
  id: string
  title: string
  type: string
  status: string
  address: string
  city: string
  state: string
  zipCode: string
  priceCents: number
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  yearBuilt: number | null
  description: string
  createdAt: string
  updatedAt: string
  _count?: { viewings: number; showings: number; offers: number; openHouses: number }
}

interface Showing {
  id: string
  date: string
  duration: number
  status: string
  notes: string
}

interface Offer {
  id: string
  amountCents: number
  status: string
  submittedAt: string
  contact?: { id: string; name: string } | null
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  available: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  under_contract: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  sold: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  rented: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)' },
}

const TYPE_COLORS: Record<string, { bg: string; txt: string }> = {
  residential: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  commercial: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)' },
  land: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  industrial: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
}

const SHOWING_STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  scheduled: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  confirmed: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  completed: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  cancelled: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
  no_show: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
}

const OFFER_STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  pending: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  accepted: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  rejected: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
  countered: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  withdrawn: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('properties')
  const tpr = useTranslations('propertyDetail')
  const fmt = useFormat() // LOC-03 — locale-aware € (was hardcoded $ + toLocaleString)
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()
  const router = useRouter()
  const { addToast } = useToast()

  const [property, setProperty] = useState<Property | null>(null)
  const [showings, setShowings] = useState<Showing[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const fetchProperty = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${id}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? tpr('toasts.notFound')); return }
      setProperty(json.data ?? null)
    } catch { setError(tpr('toasts.loadFailed')) }
    finally { setLoading(false) }
  }, [id])

  const fetchShowings = useCallback(async () => {
    try {
      const res = await fetch(`/api/showings?propertyId=${id}&limit=50`)
      const json = await res.json()
      setShowings(Array.isArray(json.data) ? json.data : [])
    } catch { setShowings([]) }
  }, [id])

  const fetchOffers = useCallback(async () => {
    try {
      const res = await fetch(`/api/offers?propertyId=${id}&limit=50`)
      const json = await res.json()
      setOffers(Array.isArray(json.data) ? json.data : [])
    } catch { setOffers([]) }
  }, [id])

  useEffect(() => {
    fetchProperty()
    fetchShowings()
    fetchOffers()
  }, [fetchProperty, fetchShowings, fetchOffers])

  useEntitySubscription('property', (evt) => {
    if (evt.entityId === id) fetchProperty()
  })
  useEntitySubscription('showing', fetchShowings)
  useEntitySubscription('offer', fetchOffers)

  const fullAddress = property
    ? [property.address, property.city, property.state, property.zipCode].filter(Boolean).join(', ')
    : ''

  const sc = property ? (STATUS_COLORS[property.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }) : { bg: 'var(--bg2)', txt: 'var(--txt2)' }
  const tc = property ? (TYPE_COLORS[property.type] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }) : { bg: 'var(--bg2)', txt: 'var(--txt2)' }

  function startEdit(field: string, value: unknown) {
    setEditField(field)
    setEditValue(value == null ? '' : String(value))
  }
  function cancelEdit() { setEditField(null); setEditValue('') }

  async function saveEdit() {
    if (!property || !editField) return
    const patch: Record<string, unknown> = {}
    switch (editField) {
      case 'title':
        if (!editValue.trim()) { addToast(tpr('toasts.titleRequired'), 'error'); return }
        patch.title = editValue.trim()
        break
      case 'priceCents': {
        const n = Math.round(parseFloat(editValue) * 100)
        if (!isFinite(n) || n < 0) { addToast(tpr('toasts.invalidPrice'), 'error'); return }
        patch.priceCents = n
        break
      }
      case 'bedrooms':
      case 'bathrooms':
      case 'sqft':
      case 'yearBuilt': {
        if (editValue === '') { patch[editField] = null; break }
        const n = parseInt(editValue, 10)
        if (isNaN(n) || n < 0) { addToast(tpr('toasts.invalidNumber'), 'error'); return }
        patch[editField] = n
        break
      }
      case 'address':
      case 'city':
      case 'state':
      case 'zipCode':
      case 'type':
      case 'status':
      case 'description':
        patch[editField] = editValue
        break
    }

    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? tpr('toasts.saveFailed'), 'error'); return }
      addToast(tpr('toasts.saved'), 'success')
      setEditField(null)
      fetchProperty()
    } catch { addToast(tpr('toasts.networkError'), 'error') }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: tConfirms('deleteGeneric.title', { entityType: tConfirms('entities.property') }),
      body: tConfirms('deleteGeneric.body'),
      confirmLabel: tCommon('delete'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast(tpr('toasts.deleted'), 'success')
        router.push('/properties')
      } else {
        const j = await res.json().catch(() => ({}))
        addToast(j.error ?? tpr('toasts.deleteFailed'), 'error')
      }
    } catch { addToast(tpr('toasts.networkError'), 'error') }
  }

  return (
    <>
      <Topbar title={property?.title ?? tpr('titleFallback')} sub={fullAddress || tpr('loading')} />
      <div style={{ padding: '18px 24px 40px' }}>

        <Link href="/properties" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, color: 'var(--accent)',
          textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={14} />
          {tpr('backToProperties')}
        </Link>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
            {tpr('loading')}
          </div>
        ) : error || !property ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--r-txt)', fontSize: 13 }}>
            {error || tpr('empty.notFound')}
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              marginBottom: 20, flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editField === 'title' ? (
                  <InlineEdit value={editValue} onChange={setEditValue} onSave={saveEdit} onCancel={cancelEdit} big ariaLabel="Title" />
                ) : (
                  <h1
                    onClick={() => startEdit('title', property.title)}
                    style={{
                      fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--txt)',
                      cursor: 'pointer', display: 'inline-block',
                      letterSpacing: '-0.02em',
                    }}
                    title={tpr('hints.clickToEdit')}
                  >
                    {property.title}
                  </h1>
                )}
                <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>{fullAddress}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {editField === 'status' ? (
                  <select autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                    aria-label="Status"
                    style={{ ...inputStyle, width: 150 }}>
                    <option value="available">{tpr('statuses.available')}</option>
                    <option value="under_contract">{tpr('statuses.underContract')}</option>
                    <option value="sold">{tpr('statuses.sold')}</option>
                    <option value="rented">{tpr('statuses.rented')}</option>
                  </select>
                ) : (
                  <span
                    onClick={() => startEdit('status', property.status)}
                    style={{
                      padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', background: sc.bg, color: sc.txt,
                      cursor: 'pointer',
                    }}
                    title={tpr('hints.clickToChange')}
                  >
                    {property.status.replace('_', ' ')}
                  </span>
                )}
                {editField === 'type' ? (
                  <select autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                    aria-label="Type"
                    style={{ ...inputStyle, width: 140 }}>
                    <option value="residential">{tpr('types.residential')}</option>
                    <option value="commercial">{tpr('types.commercial')}</option>
                    <option value="land">{tpr('types.land')}</option>
                    <option value="industrial">{tpr('types.industrial')}</option>
                  </select>
                ) : (
                  <span
                    onClick={() => startEdit('type', property.type)}
                    style={{
                      padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', background: tc.bg, color: tc.txt,
                      cursor: 'pointer',
                    }}
                    title={tpr('hints.clickToChange')}
                  >
                    {property.type}
                  </span>
                )}
              </div>
            </div>

            {/* Action bar */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap',
              padding: '10px 14px', borderRadius: 12,
              background: 'var(--bg2)', border: '1px solid var(--border)',
            }}>
              <Link href={`/showings`} style={actionBtn('var(--accent)')}>
                <Calendar size={13} /> {tpr('actions.scheduleShowing')}
              </Link>
              <Link href={`/open-houses`} style={actionBtn('var(--p)')}>
                <Home size={13} /> {tpr('actions.scheduleOpenHouse')}
              </Link>
              <Link href={`/offers`} style={actionBtn('var(--g)')}>
                <DollarSign size={13} /> {tpr('actions.submitOffer')}
              </Link>
              <div style={{ flex: 1 }} />
              <button onClick={handleDelete} style={outlineBtn('var(--r-txt)', 'var(--r-border)')}>
                <Trash2 size={12} /> {tpr('actions.delete')}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18, alignItems: 'start' }}>

              {/* LEFT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Price + details */}
                <div style={{
                  padding: 20, borderRadius: 14, border: '1px solid var(--border)',
                  background: 'var(--panel)', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', marginBottom: 12 }}>{tpr('sections.propertyDetails')}</div>

                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                      {tpr('fields.price')}
                    </div>
                    {editField === 'priceCents' ? (
                      <InlineEdit value={editValue} onChange={setEditValue} onSave={saveEdit} onCancel={cancelEdit} type="number" ariaLabel={tpr('fields.price')} />
                    ) : (
                      <div
                        onClick={() => startEdit('priceCents', (property.priceCents / 100).toString())}
                        className="mono"
                        style={{ fontSize: 26, fontWeight: 700, color: 'var(--txt)', cursor: 'pointer' }}
                        title={tpr('hints.clickToEdit')}
                      >
                        {fmt.currency(property.priceCents, { cents: true })}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 22px' }}>
                    <EditableField label={tpr('fields.address')} field="address" value={property.address} editField={editField} editValue={editValue} setEditValue={setEditValue} startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} clickToEditTitle={tpr('hints.clickToEdit')} />
                    <EditableField label={tpr('fields.city')} field="city" value={property.city} editField={editField} editValue={editValue} setEditValue={setEditValue} startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} clickToEditTitle={tpr('hints.clickToEdit')} />
                    <EditableField label={tpr('fields.state')} field="state" value={property.state} editField={editField} editValue={editValue} setEditValue={setEditValue} startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} clickToEditTitle={tpr('hints.clickToEdit')} />
                    <EditableField label={tpr('fields.zip')} field="zipCode" value={property.zipCode} editField={editField} editValue={editValue} setEditValue={setEditValue} startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} clickToEditTitle={tpr('hints.clickToEdit')} />
                    <EditableField label={tpr('fields.bedrooms')} field="bedrooms" value={property.bedrooms != null ? String(property.bedrooms) : ''} editField={editField} editValue={editValue} setEditValue={setEditValue} startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} type="number" clickToEditTitle={tpr('hints.clickToEdit')} />
                    <EditableField label={tpr('fields.bathrooms')} field="bathrooms" value={property.bathrooms != null ? String(property.bathrooms) : ''} editField={editField} editValue={editValue} setEditValue={setEditValue} startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} type="number" clickToEditTitle={tpr('hints.clickToEdit')} />
                    <EditableField label={tpr('fields.squareFeet')} field="sqft" value={property.sqft != null ? String(property.sqft) : ''} editField={editField} editValue={editValue} setEditValue={setEditValue} startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} type="number" clickToEditTitle={tpr('hints.clickToEdit')} />
                    <EditableField label={tpr('fields.yearBuilt')} field="yearBuilt" value={property.yearBuilt != null ? String(property.yearBuilt) : ''} editField={editField} editValue={editValue} setEditValue={setEditValue} startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} type="number" clickToEditTitle={tpr('hints.clickToEdit')} />
                  </div>

                  {fullAddress && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      marginTop: 16, padding: '10px 14px', borderRadius: 8,
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      fontSize: 12, color: 'var(--txt2)',
                    }}>
                      <MapPin size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      {fullAddress}
                    </div>
                  )}
                </div>

                {/* Showings */}
                <div style={{
                  padding: 20, borderRadius: 14, border: '1px solid var(--border)',
                  background: 'var(--panel)', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>
                      {tpr('sections.showings')} ({showings.length})
                    </span>
                    <Link href="/showings" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                      {tpr('actions.viewAll')}
                    </Link>
                  </div>
                  {showings.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--txt3)', fontSize: 12, background: 'var(--bg2)', borderRadius: 8 }}>
                      {tpr('empty.noShowings')}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {showings.map(s => {
                        const ssc = SHOWING_STATUS_COLORS[s.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
                        const d = new Date(s.date)
                        return (
                          <div key={s.id} style={{
                            display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12,
                            alignItems: 'center', padding: '10px 12px', borderRadius: 8,
                            background: 'var(--bg2)', border: '1px solid var(--border)',
                          }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--txt)' }}>
                                <Calendar size={11} style={{ color: 'var(--txt3)' }} />
                                {d.toLocaleDateString()}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>
                                <Clock size={10} />
                                {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <span className="mono" style={{ fontSize: 11, color: 'var(--txt2)' }}>{s.duration}min</span>
                            <span style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700,
                              textTransform: 'uppercase', background: ssc.bg, color: ssc.txt,
                            }}>{s.status.replace('_', ' ')}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Stats */}
                <SideCard title={tpr('sections.stats')}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {property.bedrooms != null && <StatRow icon={<BedDouble size={13} />} label={tpr('fields.bedrooms')} value={String(property.bedrooms)} />}
                    {property.bathrooms != null && <StatRow icon={<Bath size={13} />} label={tpr('fields.bathrooms')} value={String(property.bathrooms)} />}
                    {property.sqft != null && <StatRow icon={<Ruler size={13} />} label={tpr('fields.squareFeet')} value={property.sqft.toLocaleString()} />}
                    <StatRow icon={<Eye size={13} />} label={tpr('fields.viewings')} value={String(property._count?.viewings ?? 0)} />
                    <StatRow icon={<Calendar size={13} />} label={tpr('fields.openHouses')} value={String(property._count?.openHouses ?? 0)} />
                    <StatRow icon={<Briefcase size={13} />} label={tpr('fields.offers')} value={String(property._count?.offers ?? 0)} />
                  </div>
                </SideCard>

                {/* Listed */}
                <SideCard title={tpr('sections.listed')}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                    {new Date(property.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 4 }}>
                    {tpr('hints.daysOnMarket', { days: Math.floor((Date.now() - new Date(property.createdAt).getTime()) / 86400000) })}
                  </div>
                </SideCard>

                {/* Offers */}
                <SideCard
                  title={`${tpr('sections.offers')} (${offers.length})`}
                  action={<Link href="/offers" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{tpr('actions.viewAll')}</Link>}
                >
                  {offers.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--txt3)', padding: '6px 0' }}>{tpr('empty.noOffers')}</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {offers.slice(0, 5).map(o => {
                        const osc = OFFER_STATUS_COLORS[o.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
                        return (
                          <div key={o.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 10px', borderRadius: 8,
                            background: 'var(--bg2)', fontSize: 11,
                          }}>
                            <div style={{ minWidth: 0 }}>
                              <div className="mono" style={{ fontWeight: 700, color: 'var(--txt)' }}>
                                {fmt.currency(o.amountCents, { cents: true })}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--txt3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {o.contact?.name ?? '—'}
                              </div>
                            </div>
                            <span style={{
                              padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 700,
                              textTransform: 'uppercase', background: osc.bg, color: osc.txt, flexShrink: 0,
                            }}>{o.status}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </SideCard>
              </div>
            </div>

            {/* Description */}
            {(property.description || editField === 'description') && (
              <div style={{
                marginTop: 16, padding: 20, borderRadius: 14, border: '1px solid var(--border)',
                background: 'var(--panel)', boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{tpr('sections.description')}</span>
                  {editField !== 'description' && (
                    <button onClick={() => startEdit('description', property.description)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Edit2 size={11} /> {tpr('actions.edit')}
                    </button>
                  )}
                </div>
                {editField === 'description' ? (
                  <>
                    <textarea
                      autoFocus rows={5} value={editValue} onChange={e => setEditValue(e.target.value)}
                      aria-label={tpr('sections.description')}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                      <button onClick={cancelEdit} style={outlineBtn('var(--txt2)', 'var(--border)')}>{tpr('actions.cancel')}</button>
                      <button onClick={saveEdit} style={{
                        padding: '7px 14px', borderRadius: 8, background: 'var(--accent)', color: '#fff',
                        border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>{tpr('actions.save')}</button>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--txt2)', whiteSpace: 'pre-wrap' }}>
                    {property.description || tpr('empty.noDescription')}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: 7,
  border: '1px solid var(--accent)',
  background: 'var(--panel)',
  color: 'var(--txt)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
}

function actionBtn(bg: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 10,
    background: bg, color: '#fff',
    border: 'none', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    textDecoration: 'none',
  }
}

function outlineBtn(color: string, border: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 10,
    background: 'transparent', color,
    border: `1px solid ${border}`, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

function InlineEdit({ value, onChange, onSave, onCancel, type, big, ariaLabel }: {
  value: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void; type?: string; big?: boolean; ariaLabel?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        autoFocus
        type={type ?? 'text'}
        value={value}
        aria-label={ariaLabel}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
        style={{
          ...inputStyle,
          fontSize: big ? 20 : 13,
          fontWeight: big ? 700 : 500,
          padding: big ? '6px 12px' : '6px 10px',
        }}
      />
      <button onClick={onSave} style={iconBtn('var(--accent)', '#fff')}><Check size={13} /></button>
      <button onClick={onCancel} style={iconBtn('var(--panel)', 'var(--txt2)', 'var(--border)')}><X size={13} /></button>
    </div>
  )
}

function iconBtn(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    width: 28, height: 28, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: bg, color, border: border ? `1px solid ${border}` : 'none',
    cursor: 'pointer', flexShrink: 0,
  }
}

function EditableField({
  label, field, value, editField, editValue, setEditValue, startEdit, onSave, onCancel, type, clickToEditTitle,
}: {
  label: string; field: string; value: string;
  editField: string | null; editValue: string; setEditValue: (v: string) => void;
  startEdit: (f: string, v: unknown) => void; onSave: () => void; onCancel: () => void;
  type?: string;
  clickToEditTitle?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
        {label}
      </div>
      {editField === field ? (
        <InlineEdit value={editValue} onChange={setEditValue} onSave={onSave} onCancel={onCancel} type={type} ariaLabel={label} />
      ) : (
        <div
          onClick={() => startEdit(field, value)}
          style={{ fontSize: 13, color: 'var(--txt)', fontWeight: 500, cursor: 'pointer', minHeight: 18 }}
          title={clickToEditTitle ?? 'Click to edit'}
        >
          {value || <span style={{ color: 'var(--txt3)', fontStyle: 'italic' }}>—</span>}
        </div>
      )}
    </div>
  )
}

function SideCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12, border: '1px solid var(--border)',
      background: 'var(--panel)', boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--txt3)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 10px', borderRadius: 8,
      background: 'var(--bg2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--txt2)' }}>
        <span style={{ color: 'var(--txt3)' }}>{icon}</span>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>
        {value}
      </div>
    </div>
  )
}
