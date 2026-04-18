'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Heart, RefreshCw } from 'lucide-react'

type RfmSegment = 'champions' | 'loyal' | 'potential' | 'at_risk' | 'lost'

interface DonorScore {
  contactId: string
  contactName: string
  recency: number
  frequency: number
  monetary: number
  totalScore: number
  lastDonation: string | null
  totalDonations: number
  totalAmountCents: number
  segment: RfmSegment
}

interface Report {
  generatedAt: string
  count: number
  segments: Record<RfmSegment, number>
  donors: DonorScore[]
}

const SEG_ORDER: RfmSegment[] = ['champions', 'loyal', 'potential', 'at_risk', 'lost']
const SEG_TOKENS: Record<RfmSegment, { bg: string; txt: string; border: string; label: string }> = {
  champions:  { bg: 'var(--g-bg)',  txt: 'var(--g-txt)',  border: 'var(--g-border)',  label: 'Champions' },
  loyal:      { bg: 'var(--b-bg)',  txt: 'var(--b-txt)',  border: 'var(--b-border)',  label: 'Loyal' },
  potential:  { bg: 'var(--y-bg)',  txt: 'var(--y-txt)',  border: 'var(--y-border)',  label: 'Potential' },
  at_risk:    { bg: 'var(--o-bg)',  txt: 'var(--o-txt)',  border: 'var(--o-border)',  label: 'At Risk' },
  lost:       { bg: 'var(--r-bg)',  txt: 'var(--r-txt)',  border: 'var(--r-border)',  label: 'Lost' },
}

function fmtMoney(cents: number) {
  return '€' + (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function DonorsPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<RfmSegment | 'all'>('all')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/philly/api/philanthropy/donor-scores')
      .then(r => r.json())
      .then(json => setReport(json.data ?? null))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const donors = report?.donors ?? []
  const filtered = filter === 'all' ? donors : donors.filter(d => d.segment === filter)
  const segs = report?.segments ?? { champions: 0, loyal: 0, potential: 0, at_risk: 0, lost: 0 }

  return (
    <>
      <Topbar title="Donor Scoring" sub="RFM analysis of donor history" />
      <div style={{ padding: '20px 28px 40px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
          color: 'white', borderRadius: 14, padding: '18px 22px',
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Heart size={22} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {report ? `${report.count} donors scored` : 'Analyzing donations…'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {report ? `Generated ${new Date(report.generatedAt).toLocaleString()}` : 'Working…'}
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)',
              color: 'white', padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10,
          marginBottom: 20,
        }}>
          {SEG_ORDER.map(seg => {
            const tok = SEG_TOKENS[seg]
            const active = filter === seg
            return (
              <button
                key={seg}
                onClick={() => setFilter(active ? 'all' : seg)}
                style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: active ? tok.bg : 'var(--panel)',
                  border: `1px solid ${active ? tok.border : 'var(--border)'}`,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  transition: 'all 120ms ease',
                }}
              >
                <div style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  color: tok.txt, letterSpacing: '0.04em',
                }}>
                  {tok.label}
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 700, color: 'var(--txt)',
                  fontFamily: "var(--font-red-hat-mono), monospace", marginTop: 4,
                }}>
                  {segs[seg]}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {loading && !report ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--txt3)' }}>
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--txt3)' }}>
              No donors {filter !== 'all' ? `in ${SEG_TOKENS[filter].label}` : ''}. Log donations
              via Activity to see scores.
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: '54px 1fr 80px 100px 120px 100px',
              gap: 12, padding: '10px 18px',
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              color: 'var(--txt3)', letterSpacing: '0.04em',
              borderBottom: '1px solid var(--border)',
            }}>
              <div>Score</div>
              <div>Donor</div>
              <div>R/F/M</div>
              <div>Donations</div>
              <div>Total</div>
              <div>Segment</div>
            </div>
          )}
          {filtered.map((d, i) => {
            const tok = SEG_TOKENS[d.segment]
            return (
              <Link
                key={d.contactId}
                href={`/contacts/${d.contactId}`}
                style={{
                  display: 'grid', gridTemplateColumns: '54px 1fr 80px 100px 120px 100px',
                  gap: 12, alignItems: 'center',
                  padding: '12px 18px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  textDecoration: 'none', color: 'inherit',
                  background: i % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 25%, transparent)' : 'transparent',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 10,
                  background: tok.bg, border: `1px solid ${tok.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: tok.txt,
                  fontFamily: "var(--font-red-hat-mono), monospace",
                }}>
                  {d.totalScore}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--txt)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.contactName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
                    Last: {d.lastDonation ? new Date(d.lastDonation).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--txt2)',
                  fontFamily: "var(--font-red-hat-mono), monospace",
                }}>
                  {d.recency}/{d.frequency}/{d.monetary}
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{d.totalDonations}</div>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--txt)',
                  fontFamily: "var(--font-red-hat-mono), monospace",
                }}>
                  {fmtMoney(d.totalAmountCents)}
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 6,
                  background: tok.bg, color: tok.txt,
                  border: `1px solid ${tok.border}`,
                  fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  textAlign: 'center',
                }}>
                  {tok.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
