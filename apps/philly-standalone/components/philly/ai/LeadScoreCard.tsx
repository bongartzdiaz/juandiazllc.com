'use client'

/* Top AI-scored leads for dashboard. Calls /api/ai/score. */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, ArrowRight } from 'lucide-react'

type LeadTier = 'hot' | 'warm' | 'nurture' | 'cold' | 'dormant'

interface LeadScore {
  contactId: string
  contactName: string
  score: number
  tier: LeadTier
  reasons: string[]
}

interface Report {
  generatedAt: string
  total: number
  distribution: Record<LeadTier, number>
  scores: LeadScore[]
}

const TIER_TOKENS: Record<LeadTier, { bg: string; txt: string; border: string }> = {
  hot:     { bg: 'var(--r-bg)', txt: 'var(--r-txt)', border: 'var(--r-border)' },
  warm:    { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
  nurture: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
  cold:    { bg: 'var(--b-bg)', txt: 'var(--b-txt)', border: 'var(--b-border)' },
  dormant: { bg: 'var(--bg2)',  txt: 'var(--txt3)', border: 'var(--border)' },
}

export function LeadScoreCard({ limit = 5 }: { limit?: number }) {
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/ai/score?limit=200')
      .then(r => r.json())
      .then(json => { if (!cancelled) setData(json.data ?? null) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const top = (data?.scores ?? []).slice(0, limit)

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Flame size={14} color="#fff" strokeWidth={2.3} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', letterSpacing: '-0.01em' }}>
            Top Leads — AI Scored
          </div>
          <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
            {data ? `${data.total} scored · ${data.distribution.hot} hot · ${data.distribution.warm} warm` : 'Loading scores…'}
          </div>
        </div>
        <Link href="/ai/scoring" style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 600, color: 'var(--accent)',
          textDecoration: 'none',
        }}>
          View all <ArrowRight size={11} />
        </Link>
      </div>

      {/* List */}
      <div>
        {loading ? (
          <div style={{ padding: 26, textAlign: 'center', fontSize: 12, color: 'var(--txt3)' }}>
            Analyzing contacts…
          </div>
        ) : top.length === 0 ? (
          <div style={{ padding: 26, textAlign: 'center', fontSize: 12, color: 'var(--txt3)' }}>
            No contacts to score yet. Add contacts to see predictions.
          </div>
        ) : top.map((lead, i) => {
          const tok = TIER_TOKENS[lead.tier]
          return (
            <Link
              key={lead.contactId}
              href={`/contacts/${lead.contactId}`}
              style={{
                display: 'grid', gridTemplateColumns: '44px 1fr auto',
                gap: 12, alignItems: 'center',
                padding: '11px 18px',
                borderBottom: i < top.length - 1 ? '1px solid var(--border)' : 'none',
                textDecoration: 'none', color: 'inherit',
                transition: 'background 150ms ease',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: tok.bg, border: `1px solid ${tok.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: tok.txt,
                fontFamily: "var(--font-red-hat-mono), monospace",
              }}>
                {lead.score}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lead.contactName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lead.reasons[0] ?? '—'}
                </div>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: 6,
                background: tok.bg, color: tok.txt,
                border: `1px solid ${tok.border}`,
                fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {lead.tier}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default LeadScoreCard
