'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { Flame, RefreshCw } from 'lucide-react'

type LeadTier = 'hot' | 'warm' | 'nurture' | 'cold' | 'dormant'

interface LeadScore {
  contactId: string
  contactName: string
  score: number
  tier: LeadTier
  signals: { label: string; points: number; positive: boolean }[]
  reasons: string[]
}

interface Report {
  generatedAt: string
  total: number
  distribution: Record<LeadTier, number>
  scores: LeadScore[]
}

const TIER_ORDER: LeadTier[] = ['hot', 'warm', 'nurture', 'cold', 'dormant']
const TIER_TOKENS: Record<LeadTier, { bg: string; txt: string; border: string }> = {
  hot:     { bg: 'var(--r-bg)', txt: 'var(--r-txt)', border: 'var(--r-border)' },
  warm:    { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
  nurture: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
  cold:    { bg: 'var(--b-bg)', txt: 'var(--b-txt)', border: 'var(--b-border)' },
  dormant: { bg: 'var(--bg2)',  txt: 'var(--txt3)', border: 'var(--border)' },
}

export default function AIScoringPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<LeadTier | 'all'>('all')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/ai/score?limit=500')
      .then(r => r.json())
      .then(json => setReport(json.data ?? null))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const scores = report?.scores ?? []
  const filtered = filter === 'all' ? scores : scores.filter(s => s.tier === filter)
  const dist = report?.distribution ?? { hot: 0, warm: 0, nurture: 0, cold: 0, dormant: 0 }

  return (
    <>
      <Topbar title="AI Lead Scoring" sub="Predictive score for every contact" />
      <div style={{ padding: '20px 28px 40px' }}>
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
          color: 'white', borderRadius: 14, padding: '18px 22px',
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Flame size={22} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {report ? `${report.total} contacts scored` : 'Analyzing contacts…'}
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

        {/* Distribution */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10,
          marginBottom: 20,
        }}>
          {TIER_ORDER.map(tier => {
            const tok = TIER_TOKENS[tier]
            const active = filter === tier
            return (
              <button
                key={tier}
                onClick={() => setFilter(active ? 'all' : tier)}
                style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: active ? tok.bg : 'var(--panel)',
                  border: `1px solid ${active ? tok.border : 'var(--border)'}`,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  transition: 'all 120ms ease',
                  boxShadow: active ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <div style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  color: tok.txt, letterSpacing: '0.04em',
                }}>
                  {tier}
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 700, color: 'var(--txt)',
                  fontFamily: "var(--font-red-hat-mono), monospace", marginTop: 4,
                }}>
                  {dist[tier]}
                </div>
              </button>
            )
          })}
        </div>

        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            style={{
              marginBottom: 10, padding: '5px 10px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--panel)',
              fontSize: 11, fontWeight: 600, color: 'var(--txt2)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Clear filter · Showing {filter}
          </button>
        )}

        {/* Scores list */}
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
              No contacts {filter !== 'all' ? `in the ${filter} tier` : ''} yet.
            </div>
          ) : filtered.map((lead, i) => {
            const tok = TIER_TOKENS[lead.tier]
            return (
              <Link
                key={lead.contactId}
                href={`/contacts/${lead.contactId}`}
                style={{
                  display: 'grid', gridTemplateColumns: '54px 1fr 160px 80px',
                  gap: 14, alignItems: 'center',
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
                  {lead.score}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--txt)',
                    marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lead.contactName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lead.reasons.join(' · ') || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 3,
                    background: 'var(--bg2)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${lead.score}%`,
                      background: tok.txt, transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)',
                    fontFamily: "var(--font-red-hat-mono), monospace", minWidth: 28, textAlign: 'right' }}>
                    {lead.score}
                  </span>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 6,
                  background: tok.bg, color: tok.txt,
                  border: `1px solid ${tok.border}`,
                  fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  textAlign: 'center',
                }}>
                  {lead.tier}
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
