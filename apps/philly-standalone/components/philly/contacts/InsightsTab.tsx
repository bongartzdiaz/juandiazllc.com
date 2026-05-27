/* InsightsTab — AI insights panel for the Klant Master Profile.
   ──────────────────────────────────────────────────────────────────
   Surfaces the Contact's AI-generated attributes (ICP fit, lead score,
   industry, narrative summary) in a deck-friendly card layout.

   The data lives on the Contact row itself (aiIcpFit, leadScore,
   aiIndustry, aiSummary) — populated by lib/philly/ai/contact-attributes.
   This tab is a READ surface; re-running the AI is gated on POST
   /api/contacts/[id]/ai-attributes and triggered via a button below. */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/hooks/philly/useToast'
import { Sparkles, TrendingUp, Briefcase, RefreshCw } from 'lucide-react'

export interface ContactInsights {
  aiIndustry: string | null
  aiIcpFit: number | null
  aiSummary: string | null
  aiAttributesStatus: string | null
  aiAttributesUpdatedAt: string | null
  leadScore: number
}

interface Props {
  contactId: string
  insights: ContactInsights
  onRefreshed?: () => void
}

function scoreColor(score: number | null): string {
  if (score == null) return 'var(--txt3)'
  if (score >= 80) return 'var(--g)'
  if (score >= 50) return 'var(--y)'
  return 'var(--r)'
}

export function InsightsTab({ contactId, insights, onRefreshed }: Props) {
  const t = useTranslations('contacts.masterProfile.insights')
  const { addToast } = useToast()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/ai-attributes`, { method: 'POST' })
      if (res.status === 401 || res.status === 403) {
        addToast(t('noData'), 'error')
        return
      }
      if (!res.ok) {
        addToast(t('noData'), 'error')
        return
      }
      onRefreshed?.()
    } catch {
      addToast(t('noData'), 'error')
    } finally {
      setRefreshing(false)
    }
  }

  const hasAny = insights.aiIndustry || insights.aiIcpFit != null || insights.aiSummary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="var(--accent)" />
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{t('heading')}</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            background: refreshing ? 'var(--bg2)' : 'var(--accent)',
            color: refreshing ? 'var(--txt3)' : 'var(--accent-txt)',
            border: 'none', fontSize: 12, fontWeight: 600,
            cursor: refreshing ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} />
          {t('runAi')}
        </button>
      </div>

      {!hasAny ? (
        <div style={{
          padding: 32, textAlign: 'center', color: 'var(--txt3)',
          background: 'var(--bg2)', borderRadius: 8, border: '1px dashed var(--border)',
        }}>{t('noData')}</div>
      ) : (
        <>
          {/* ICP fit + Lead score cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {insights.aiIcpFit != null && (
              <div style={{
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  <TrendingUp size={12} /> {t('icpFit')}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(insights.aiIcpFit) }}>
                  {insights.aiIcpFit}<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--txt3)', marginLeft: 4 }}>/ 100</span>
                </div>
              </div>
            )}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                <TrendingUp size={12} /> {t('leadScore')}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(insights.leadScore) }}>
                {insights.leadScore}<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--txt3)', marginLeft: 4 }}>/ 100</span>
              </div>
            </div>
            {insights.aiIndustry && (
              <div style={{
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  <Briefcase size={12} /> {t('industry')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{insights.aiIndustry}</div>
              </div>
            )}
          </div>

          {/* Narrative summary */}
          {insights.aiSummary && (
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 16,
            }}>
              <div style={{ fontSize: 11.5, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                {t('summary')}
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--txt)', whiteSpace: 'pre-wrap' }}>
                {insights.aiSummary}
              </div>
              {insights.aiAttributesUpdatedAt && (
                <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 10 }}>
                  {t('updatedAt', { date: new Date(insights.aiAttributesUpdatedAt).toLocaleDateString() })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
