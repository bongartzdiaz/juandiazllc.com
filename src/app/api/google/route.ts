import { NextRequest, NextResponse } from 'next/server'
import { fetchFromGoogleApi } from '@/lib/api/google'
import type { Market } from '@/lib/types'

const MOCK_CAMPAIGNS = [
  { id: 'g1', name: 'Thuisbatterij — Zoekwoorden NL', type: 'Search', status: 'goed', market: 'NL', spend: 892, impressions: 12400, clicks: 496, ctr: 4.0, cpc: 1.80, conversions: 38, cpa: 23 },
  { id: 'g2', name: 'Zonnepanelen — Zoekwoorden NL', type: 'Search', status: 'goed', market: 'NL', spend: 654, impressions: 9800, clicks: 382, ctr: 3.9, cpc: 1.71, conversions: 28, cpa: 23 },
  { id: 'g3', name: 'Display — Remarketing 30d', type: 'Display', status: 'ok', market: 'NL', spend: 312, impressions: 87500, clicks: 875, ctr: 1.0, cpc: 0.36, conversions: 12, cpa: 26 },
  { id: 'g4', name: 'Performance Max — Energie', type: 'PMax', status: 'ok', market: 'NL', spend: 445, impressions: 34200, clicks: 615, ctr: 1.8, cpc: 0.72, conversions: 15, cpa: 30 },
  { id: 'g5', name: 'Brand — HelpMijBesparen', type: 'Search', status: 'goed', market: 'NL', spend: 124, impressions: 3200, clicks: 288, ctr: 9.0, cpc: 0.43, conversions: 22, cpa: 6 },
]

const MOCK_KEYWORDS = [
  { keyword: 'thuisbatterij kopen', clicks: 245, cpc: 1.92, conversions: 18, cpa: 26 },
  { keyword: 'zonnepanelen prijs 2026', clicks: 189, cpc: 1.64, conversions: 14, cpa: 22 },
  { keyword: 'energie besparen thuis', clicks: 156, cpc: 1.45, conversions: 8, cpa: 28 },
  { keyword: 'helpmijbesparen', clicks: 288, cpc: 0.43, conversions: 22, cpa: 6 },
  { keyword: 'thuisbatterij subsidie', clicks: 134, cpc: 2.10, conversions: 11, cpa: 26 },
  { keyword: 'zonnepanelen installatie', clicks: 112, cpc: 1.88, conversions: 7, cpa: 30 },
]

const MOCK_DAILY = [
  { date: '2026-03-01', label: '1/3', spend: 62, conversions: 3 }, { date: '2026-03-02', label: '2/3', spend: 78, conversions: 5 },
  { date: '2026-03-03', label: '3/3', spend: 71, conversions: 4 }, { date: '2026-03-04', label: '4/3', spend: 89, conversions: 6 },
  { date: '2026-03-05', label: '5/3', spend: 95, conversions: 7 }, { date: '2026-03-06', label: '6/3', spend: 82, conversions: 5 },
  { date: '2026-03-07', label: '7/3', spend: 104, conversions: 9 }, { date: '2026-03-08', label: '8/3', spend: 91, conversions: 7 },
  { date: '2026-03-09', label: '9/3', spend: 110, conversions: 10 }, { date: '2026-03-10', label: '10/3', spend: 98, conversions: 8 },
  { date: '2026-03-11', label: '11/3', spend: 88, conversions: 6 }, { date: '2026-03-12', label: '12/3', spend: 115, conversions: 11 },
  { date: '2026-03-13', label: '13/3', spend: 102, conversions: 9 }, { date: '2026-03-14', label: '14/3', spend: 96, conversions: 8 },
]

function computeTotals(campaigns: typeof MOCK_CAMPAIGNS) {
  const spend = campaigns.reduce((s, c) => s + c.spend, 0)
  const conversions = campaigns.reduce((s, c) => s + c.conversions, 0)
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  return { spend, conversions, clicks, impressions, avgCpa: conversions > 0 ? Math.round(spend / conversions) : 0, avgCtr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(1)) : 0 }
}

export async function GET(req: NextRequest) {
  const market = (req.nextUrl.searchParams.get('market') || 'NL') as Market

  try {
    const liveData = await fetchFromGoogleApi(market)
    if (liveData) return NextResponse.json(liveData)
  } catch {}

  const campaigns = MOCK_CAMPAIGNS.filter(c => c.market === market)
  return NextResponse.json({ campaigns, keywords: MOCK_KEYWORDS, daily: MOCK_DAILY, totals: computeTotals(campaigns) })
}
