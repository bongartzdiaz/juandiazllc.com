'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { MapPin, Filter, Search, Tag } from 'lucide-react'
import Link from 'next/link'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useApi } from '@/hooks/philly/useApi'

type Option = { value: string; label: string }
type Flag = { key: string; label: string }
interface Taxonomy {
  countryLabel: string
  districts: Option[]
  propertyTypes: Option[]
  subtypes: Record<string, Option[]>
  listingTypes: Option[]
  flags: Flag[]
}

interface Property {
  id: string
  title: string
  type: string
  subtype: string
  listingType: string
  district: string
  town: string
  status: string
  address: string
  city: string
  state: string
  priceCents: number
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  isBankOwned: boolean
  isResale: boolean
  createdAt: string
  _count: { viewings: number }
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  available: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  under_contract: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  sold: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  rented: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)' },
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
}

const selectBarStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--panel)',
  fontSize: 12,
}

const selectStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 12,
  color: 'var(--txt)', fontFamily: 'inherit',
  cursor: 'pointer', outline: 'none',
}

export default function PropertiesPage() {
  const [page, setPage] = useState(1)
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null)

  // Filters
  const [listingType, setListingType] = useState<string>('sale')
  const [district, setDistrict] = useState<string>('')
  const [type, setType] = useState<string>('')
  const [subtype, setSubtype] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState('')
  const [bankOwned, setBankOwned] = useState(false)
  const [resaleOnly, setResaleOnly] = useState(false)
  const [search, setSearch] = useState('')

  // Add modal
  const [showAdd, setShowAdd] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addAddress, setAddAddress] = useState('')
  const [addCity, setAddCity] = useState('')
  const [addType, setAddType] = useState('residential')
  const [addSubtype, setAddSubtype] = useState('')
  const [addListingType, setAddListingType] = useState<'sale' | 'rent'>('sale')
  const [addDistrict, setAddDistrict] = useState('')
  const [addTown, setAddTown] = useState('')
  const [addBankOwned, setAddBankOwned] = useState(false)
  const [addResale, setAddResale] = useState(false)
  const [addPrice, setAddPrice] = useState('')
  const [addBedrooms, setAddBedrooms] = useState('')
  const [addBathrooms, setAddBathrooms] = useState('')
  const [addSqft, setAddSqft] = useState('')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const t = useTranslations('properties')

  const closeAddModal = () => {
    setShowAdd(false)
    setAddError(null)
  }

  const handleAddProperty = async () => {
    if (saving) return
    setSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: addTitle,
          address: addAddress,
          city: addCity,
          country: 'Cyprus',
          type: addType,
          subtype: addSubtype,
          listingType: addListingType,
          district: addDistrict,
          town: addTown,
          isBankOwned: addBankOwned,
          isResale: addResale,
          priceCents: Number(addPrice) || 0,
          bedrooms: addBedrooms ? Number(addBedrooms) : null,
          bathrooms: addBathrooms ? Number(addBathrooms) : null,
          sqft: addSqft ? Number(addSqft) : null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(json?.error ?? json?.message ?? `Failed (${res.status})`)
        return
      }
      setAddTitle(''); setAddAddress(''); setAddCity(''); setAddType('residential'); setAddSubtype('')
      setAddListingType('sale'); setAddDistrict(''); setAddTown('')
      setAddBankOwned(false); setAddResale(false)
      setAddPrice(''); setAddBedrooms(''); setAddBathrooms(''); setAddSqft('')
      setAddError(null)
      setShowAdd(false)
      fetchData()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const districts = taxonomy?.districts ?? []
  const propertyTypes = taxonomy?.propertyTypes ?? []
  const listingTypes = taxonomy?.listingTypes ?? []
  const flags = taxonomy?.flags ?? []
  const districtLabel = useMemo(
    () => Object.fromEntries(districts.map(d => [d.value, d.label])),
    [districts],
  )
  const subtypeLabel = useMemo(() => {
    const m: Record<string, string> = {}
    if (taxonomy) for (const arr of Object.values(taxonomy.subtypes)) for (const s of arr) m[s.value] = s.label
    return m
  }, [taxonomy])

  const subtypeOptions = useMemo(() => {
    if (!type || !taxonomy) return [{ value: '', label: 'All Subtypes' }]
    return [{ value: '', label: 'All Subtypes' }, ...(taxonomy.subtypes[type] ?? [])]
  }, [type, taxonomy])

  const addSubtypeOptions = useMemo(() => {
    if (!taxonomy) return [{ value: '', label: 'All Subtypes' }]
    return [{ value: '', label: 'All Subtypes' }, ...(taxonomy.subtypes[addType] ?? [])]
  }, [addType, taxonomy])

  // Fetch taxonomy once on mount
  useEffect(() => {
    let cancelled = false
    fetch('/api/properties/taxonomy')
      .then(r => r.json())
      .then(json => { if (!cancelled && json.data) setTaxonomy(json.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Once taxonomy loaded, set default listingType from taxonomy (first option)
  useEffect(() => {
    if (taxonomy && listingTypes.length > 0 && !listingTypes.some(l => l.value === listingType)) {
      setListingType(listingTypes[0].value)
    }
  }, [taxonomy, listingTypes, listingType])

  // Set default addType/addListingType when taxonomy loads
  useEffect(() => {
    if (taxonomy) {
      if (propertyTypes.length > 0 && !propertyTypes.some(t => t.value === addType)) setAddType(propertyTypes[0].value)
      if (listingTypes.length > 0 && !listingTypes.some(l => l.value === addListingType)) setAddListingType(listingTypes[0].value as 'sale' | 'rent')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxonomy])

  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (listingType) params.set('listingType', listingType)
  if (district) params.set('district', district)
  if (type) params.set('type', type)
  if (subtype) params.set('subtype', subtype)
  if (statusFilter) params.set('status', statusFilter)
  if (bankOwned) params.set('bankOwned', 'true')
  if (resaleOnly) params.set('resale', 'true')
  if (search) params.set('q', search)
  interface PropertiesResponse { data: Property[]; pagination: { total: number; totalPages: number } }
  const propertiesQuery = useApi<PropertiesResponse>(`/properties?${params}`)
  const properties = propertiesQuery.data?.data ?? []
  const total = propertiesQuery.data?.pagination.total ?? 0
  const totalPages = propertiesQuery.data?.pagination.totalPages ?? 0
  const loading = propertiesQuery.loading
  const fetchData = propertiesQuery.refetch

  // Live-refresh on any property mutation in the org
  useEntitySubscription('property', fetchData)

  const totalValue = properties.reduce((s, p) => s + p.priceCents, 0)
  const available = properties.filter(p => p.status === 'available').length

  const resetFilters = () => {
    setDistrict(''); setType(''); setSubtype(''); setStatusFilter('')
    setBankOwned(false); setResaleOnly(false); setSearch(''); setPage(1)
  }

  // When type changes, clear subtype
  useEffect(() => { setSubtype('') }, [type])
  useEffect(() => { setAddSubtype('') }, [addType])

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel="Property" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="folder" label="Total Properties" value={String(total)} />
          <KpiCard icon="dollar-sign" label="Portfolio Value" value={`€${(totalValue / 100).toLocaleString()}`} />
          <KpiCard icon="target" label="Available" value={String(available)} />
          <KpiCard icon="chart" label="Total Viewings" value={String(properties.reduce((s, p) => s + p._count.viewings, 0))} />
        </div>

        {/* Listing type tabs — For Sale / For Rent */}
        <div style={{
          display: 'inline-flex', gap: 4, padding: 4,
          background: 'var(--bg2)', borderRadius: 10,
          border: '1px solid var(--border)', marginBottom: 16,
        }}>
          {listingTypes.map(lt => (
            <button
              key={lt.value}
              onClick={() => { setListingType(lt.value); setPage(1) }}
              style={{
                padding: '7px 18px', borderRadius: 7, border: 'none',
                background: listingType === lt.value ? 'var(--panel)' : 'transparent',
                color: listingType === lt.value ? 'var(--txt)' : 'var(--txt3)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                boxShadow: listingType === lt.value ? 'var(--shadow-sm)' : 'none',
                fontFamily: 'inherit',
              }}
            >{lt.label}</button>
          ))}
        </div>

        {/* Filters row 1 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ ...selectBarStyle, flex: 1, minWidth: 220, maxWidth: 320 }}>
            <Search size={13} style={{ color: 'var(--txt3)' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search title, address, city, town..."
              style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', outline: 'none', width: '100%' }}
            />
          </div>

          <div style={selectBarStyle}>
            <MapPin size={13} style={{ color: 'var(--txt3)' }} />
            <select value={district} onChange={e => { setDistrict(e.target.value); setPage(1) }} style={selectStyle}>
              <option value="">All {taxonomy?.countryLabel ?? 'Locations'}</option>
              {districts.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          <div style={selectBarStyle}>
            <Tag size={13} style={{ color: 'var(--txt3)' }} />
            <select value={type} onChange={e => { setType(e.target.value); setPage(1) }} style={selectStyle}>
              <option value="">All Types</option>
              {propertyTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
            </select>
          </div>

          {type && (
            <div style={selectBarStyle}>
              <select value={subtype} onChange={e => { setSubtype(e.target.value); setPage(1) }} style={selectStyle}>
                {subtypeOptions.map(s => <option key={s.value || 'all'} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}

          <div style={selectBarStyle}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={selectStyle}>
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="under_contract">Under Contract</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
            </select>
          </div>
        </div>

        {/* Filters row 2 — tick boxes (labels driven by taxonomy.flags) */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {flags.find(f => f.key === 'isBankOwned') && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={bankOwned}
                onChange={e => { setBankOwned(e.target.checked); setPage(1) }}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              {flags.find(f => f.key === 'isBankOwned')?.label ?? 'Bank Owned Properties'}
            </label>
          )}
          {flags.find(f => f.key === 'isResale') && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={resaleOnly}
                onChange={e => { setResaleOnly(e.target.checked); setPage(1) }}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              {flags.find(f => f.key === 'isResale')?.label ?? 'Resale Properties'}
            </label>
          )}
          <Link
            href="/settings/property-taxonomy"
            style={{
              marginLeft: (district || type || subtype || statusFilter || bankOwned || resaleOnly || search) ? 0 : 'auto',
              padding: '6px 12px', borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--panel)',
              fontSize: 11, color: 'var(--txt3)', textDecoration: 'none',
            }}
          >Customize filters</Link>
          {(district || type || subtype || statusFilter || bankOwned || resaleOnly || search) && (
            <button
              onClick={resetFilters}
              style={{
                marginLeft: 'auto', padding: '6px 12px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--panel)',
                fontSize: 11, color: 'var(--txt2)', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >Clear filters</button>
          )}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : properties.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>No properties found.</div>
          ) : properties.map(prop => {
            const sc = STATUS_COLORS[prop.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
            return (
              <Link key={prop.id} href={`/properties/${prop.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card-hover" style={{ padding: '16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)', lineHeight: 1.3 }}>{prop.title}</div>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: sc.bg, color: sc.txt, whiteSpace: 'nowrap' }}>{prop.status.replace('_', ' ')}</span>
                  </div>

                  {/* Chips */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {prop.district && (
                      <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 600, background: 'var(--bg2)', color: 'var(--txt2)', textTransform: 'uppercase' }}>
                        {districtLabel[prop.district] ?? prop.district}
                      </span>
                    )}
                    {prop.subtype && (
                      <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 600, background: 'var(--bg2)', color: 'var(--txt2)' }}>
                        {subtypeLabel[prop.subtype] ?? prop.subtype}
                      </span>
                    )}
                    {prop.isBankOwned && (
                      <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 700, background: 'var(--y-bg)', color: 'var(--y-txt)' }}>
                        BANK
                      </span>
                    )}
                    {prop.isResale && (
                      <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 700, background: 'var(--accent-bg)', color: 'var(--accent-txt)' }}>
                        RESALE
                      </span>
                    )}
                  </div>

                  {(prop.address || prop.city || prop.town) && (
                    <div style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                      <MapPin size={11} /> {[prop.address, prop.town, prop.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--font-red-hat-mono), monospace', marginBottom: 8 }}>
                    €{(prop.priceCents / 100).toLocaleString()}{prop.listingType === 'rent' ? <span style={{ fontSize: 11, color: 'var(--txt3)' }}> /mo</span> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--txt2)' }}>
                    {prop.bedrooms != null && <span>{prop.bedrooms} bed</span>}
                    {prop.bathrooms != null && <span>{prop.bathrooms} bath</span>}
                    {prop.sqft != null && <span>{prop.sqft.toLocaleString()} m²</span>}
                    <span style={{ marginLeft: 'auto' }}>{prop._count.viewings} viewings</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

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
            aria-labelledby="property-add-title"
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px', width: 480, maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            <div id="property-add-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Add Property</div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>Create a new {taxonomy?.countryLabel ?? ''} property listing</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Listing Type</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {listingTypes.map(lt => (
                    <button key={lt.value} onClick={() => setAddListingType(lt.value as 'sale' | 'rent')} style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8,
                      border: `1px solid ${addListingType === lt.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: addListingType === lt.value ? 'var(--accent-bg)' : 'var(--bg2)',
                      color: addListingType === lt.value ? 'var(--accent-txt)' : 'var(--txt2)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{lt.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Title</label>
                <input value={addTitle} onChange={e => setAddTitle(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>District</label>
                  <select value={addDistrict} onChange={e => setAddDistrict(e.target.value)} style={inputStyle}>
                    <option value="">— Select —</option>
                    {districts.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Town / Area</label>
                  <input value={addTown} onChange={e => setAddTown(e.target.value)} placeholder="e.g. Kato Paphos" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Address</label>
                <input value={addAddress} onChange={e => setAddAddress(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>City</label>
                <input value={addCity} onChange={e => setAddCity(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Type</label>
                  <select value={addType} onChange={e => setAddType(e.target.value)} style={inputStyle}>
                    {propertyTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Subtype</label>
                  <select value={addSubtype} onChange={e => setAddSubtype(e.target.value)} style={inputStyle}>
                    {addSubtypeOptions.map(s => <option key={s.value || 'all'} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>
                  Price € {addListingType === 'rent' ? '(per month)' : ''}
                </label>
                <input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Bedrooms</label>
                  <input type="number" value={addBedrooms} onChange={e => setAddBedrooms(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Bathrooms</label>
                  <input type="number" value={addBathrooms} onChange={e => setAddBathrooms(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Sqm</label>
                  <input type="number" value={addSqft} onChange={e => setAddSqft(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                {flags.find(f => f.key === 'isBankOwned') && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={addBankOwned} onChange={e => setAddBankOwned(e.target.checked)} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                    {flags.find(f => f.key === 'isBankOwned')?.label ?? 'Bank Owned'}
                  </label>
                )}
                {flags.find(f => f.key === 'isResale') && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={addResale} onChange={e => setAddResale(e.target.checked)} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                    {flags.find(f => f.key === 'isResale')?.label ?? 'Resale'}
                  </label>
                )}
              </div>
            </div>
            {addError && (
              <div role="alert" style={{
                padding: '8px 12px', borderRadius: 8, marginTop: 8,
                background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
              }}>{addError}</div>
            )}
            <button onClick={handleAddProperty} disabled={saving} style={{
              width: '100%', marginTop: 18, padding: '10px 0',
              borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving...' : 'Add Property'}</button>
          </div>
        </div>
      )}
    </>
  )
}
