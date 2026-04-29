'use client'

import Link from 'next/link'
import {
  MapPin, Home, BedDouble, Bath, Ruler,
  ExternalLink, X, Calendar, Calculator,
} from 'lucide-react'
import { Modal } from '@/components/philly/ui/Modal'
import { useApi } from '@/hooks/philly/useApi'

/* Bundle V — popover quick-view for a property. Mounted from
   app/properties/page.tsx. Same pattern as ContactQuickView. */

interface PropertyDetail {
  id: string
  title: string
  type: string
  subtype?: string | null
  listingType: string
  status: string
  address: string | null
  city: string | null
  state: string | null
  district?: string | null
  town?: string | null
  zipCode: string | null
  country: string | null
  priceCents: number
  hoaCents?: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  yearBuilt: number | null
  description: string | null
  isBankOwned?: boolean
  isResale?: boolean
  createdAt: string
  _count: {
    viewings?: number
    showings?: number
    offers?: number
    openHouses?: number
  }
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  available: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  under_contract: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  sold: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  rented: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)' },
}

interface Props {
  propertyId: string | null
  onClose: () => void
}

export function PropertyQuickView({ propertyId, onClose }: Props) {
  const open = propertyId != null
  const query = useApi<{ data: PropertyDetail }>(open ? `/properties/${propertyId}` : '', { enabled: open })
  const p = query.data?.data ?? null
  const sc = (p && STATUS_COLORS[p.status]) || { bg: 'var(--bg2)', txt: 'var(--txt2)' }

  const fullAddress = p
    ? [p.address, p.town, p.city, p.state, p.zipCode, p.country].filter(Boolean).join(', ')
    : ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={p?.title ?? 'Property'}
      subtitle={p ? `${p.type}${p.subtype ? ` · ${p.subtype}` : ''}` : ''}
      size="md"
    >
      {!p ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
          {query.loading ? 'Loading…' : query.error ?? 'Property not found'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status + listingType pill row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
              background: sc.bg, color: sc.txt,
              textTransform: 'uppercase', letterSpacing: '.05em',
            }}>{p.status.replace('_', ' ')}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
              background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
              textTransform: 'capitalize',
            }}>For {p.listingType}</span>
            {p.isBankOwned && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                background: 'var(--y-bg)', color: 'var(--y-txt)',
              }}>BANK</span>
            )}
            {p.isResale && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                background: 'var(--accent-bg)', color: 'var(--accent-txt)',
              }}>RESALE</span>
            )}
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--txt3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} />
              listed {new Date(p.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Headline price */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginBottom: 2 }}>Price</div>
            <div className="mono" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>
              €{(p.priceCents / 100).toLocaleString()}
              {p.listingType === 'rent' && (
                <span style={{ fontSize: 12, color: 'var(--txt3)', fontWeight: 400 }}> /mo</span>
              )}
            </div>
            {p.hoaCents != null && p.hoaCents > 0 && (
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
                + €{(p.hoaCents / 100).toLocaleString()} HOA
              </div>
            )}
          </div>

          {/* Address */}
          {fullAddress && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              fontSize: 12.5, color: 'var(--txt2)', lineHeight: 1.4,
            }}>
              <MapPin size={13} color="var(--txt3)" style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{fullAddress}</span>
            </div>
          )}

          {/* Stats grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10,
            padding: '12px 14px',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10,
          }}>
            <Stat icon={BedDouble} label="Bed" value={p.bedrooms != null ? String(p.bedrooms) : '—'} />
            <Stat icon={Bath} label="Bath" value={p.bathrooms != null ? String(p.bathrooms) : '—'} />
            <Stat icon={Ruler} label="m²" value={p.sqft != null ? p.sqft.toLocaleString() : '—'} />
            <Stat icon={Home} label="Built" value={p.yearBuilt != null ? String(p.yearBuilt) : '—'} />
          </div>

          {/* Engagement counts */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10,
            padding: '10px 14px',
            background: 'color-mix(in srgb, var(--accent) 4%, transparent)',
            border: '1px solid var(--border)', borderRadius: 10,
          }}>
            <Count label="Viewings" value={p._count.viewings ?? 0} />
            <Count label="Showings" value={p._count.showings ?? 0} />
            <Count label="Offers" value={p._count.offers ?? 0} />
            <Count label="Open houses" value={p._count.openHouses ?? 0} />
          </div>

          {/* Description */}
          {p.description && p.description.trim() && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 4 }}>Description</div>
              <div style={{
                fontSize: 12.5, color: 'var(--txt2)', lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                padding: '10px 12px',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 10,
                maxHeight: 140, overflowY: 'auto',
              }}>
                {p.description}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Link
              href={`/properties/${p.id}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                background: 'var(--accent)', color: '#fff',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={12} />
              Open full page
            </Link>
            <Link
              href={`/properties/${p.id}/valuation`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 500,
                background: 'transparent', color: 'var(--txt2)',
                border: '1px solid var(--border)', textDecoration: 'none',
              }}
            >
              <Calculator size={12} />
              Valuation
            </Link>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 500,
                background: 'transparent', color: 'var(--txt2)',
                border: '1px solid var(--border)', cursor: 'pointer',
                fontFamily: 'inherit', marginLeft: 'auto',
              }}
            >
              <X size={12} />
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Stat({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <Icon size={14} color="var(--txt3)" />
      <div className="mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 9.5, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 3 }}>
        {label}
      </div>
    </div>
  )
}
