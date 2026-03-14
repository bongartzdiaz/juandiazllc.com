import { NextRequest, NextResponse } from 'next/server'
import { fetchFromMetaApi } from '@/lib/api/meta'
import type { MetaCampaign, Market } from '@/lib/types'

// Mock data for fallback
const MOCK_CAMPAIGNS: MetaCampaign[] = [
  { id: 'f1', name: 'F1 Thuisbatterij — Interesse NL', funnel: 'F1', status: 'goed', market: 'NL', spend: 1284, impressions: 53400, clicks: 1282, ctr: 2.4, cpl: 12, leads: 107, budget: 2000 },
  { id: 'f7', name: 'F7 Lookalike — Zonnepanelen', funnel: 'F7', status: 'goed', market: 'NL', spend: 876, impressions: 48700, clicks: 877, ctr: 1.8, cpl: 13, leads: 67, budget: 1500 },
  { id: 'f4', name: 'F4 Retarget — 30 dagen', funnel: 'F4', status: 'ok', market: 'NL', spend: 654, impressions: 59500, clicks: 655, ctr: 1.1, cpl: 18, leads: 36, budget: 1000 },
  { id: 'f2', name: 'F2 Zonnepanelen — Breed NL', funnel: 'F2', status: 'goed', market: 'NL', spend: 542, impressions: 31200, clicks: 499, ctr: 1.6, cpl: 15, leads: 36, budget: 800 },
  { id: 'f3', name: 'F3 Combi Deal — Test', funnel: 'F3', status: 'testfase', market: 'NL', spend: 38, impressions: 4200, clicks: 38, ctr: 0.9, cpl: null, leads: 4, budget: 200 },
  { id: 'f5', name: 'F5 Koude Traffic — Video', funnel: 'F5', status: 'slecht', market: 'NL', spend: 523, impressions: 174300, clicks: 523, ctr: 0.3, cpl: 34, leads: 15, budget: 600 },
  { id: 'f6', name: 'F6 Video Testimonial', funnel: 'F6', status: 'testfase', market: 'NL', spend: 95, impressions: 8100, clicks: 73, ctr: 0.9, cpl: 20, leads: 5, budget: 300 },
]

const MOCK_DAILY = [
  { date: '2026-03-01', label: '1/3', spend: 95, leads: 8, impressions: 5200, clicks: 130 },
  { date: '2026-03-02', label: '2/3', spend: 112, leads: 11, impressions: 6100, clicks: 155 },
  { date: '2026-03-03', label: '3/3', spend: 108, leads: 9, impressions: 5800, clicks: 142 },
  { date: '2026-03-04', label: '4/3', spend: 134, leads: 14, impressions: 7200, clicks: 178 },
  { date: '2026-03-05', label: '5/3', spend: 141, leads: 16, impressions: 7600, clicks: 192 },
  { date: '2026-03-06', label: '6/3', spend: 128, leads: 13, impressions: 6800, clicks: 168 },
  { date: '2026-03-07', label: '7/3', spend: 155, leads: 18, impressions: 8200, clicks: 210 },
  { date: '2026-03-08', label: '8/3', spend: 137, leads: 15, impressions: 7300, clicks: 185 },
  { date: '2026-03-09', label: '9/3', spend: 162, leads: 19, impressions: 8700, clicks: 225 },
  { date: '2026-03-10', label: '10/3', spend: 148, leads: 17, impressions: 7900, clicks: 205 },
  { date: '2026-03-11', label: '11/3', spend: 139, leads: 14, impressions: 7400, clicks: 188 },
  { date: '2026-03-12', label: '12/3', spend: 168, leads: 21, impressions: 9100, clicks: 238 },
  { date: '2026-03-13', label: '13/3', spend: 152, leads: 18, impressions: 8200, clicks: 212 },
  { date: '2026-03-14', label: '14/3', spend: 143, leads: 16, impressions: 7700, clicks: 198 },
]

function computeTotals(campaigns: MetaCampaign[]) {
  const spend = campaigns.reduce((s, c) => s + c.spend, 0)
  const leads = campaigns.reduce((s, c) => s + c.leads, 0)
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  return { spend, leads, impressions, clicks, avgCpl: leads > 0 ? Math.round(spend / leads) : 0, avgCtr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(1)) : 0 }
}

export async function GET(req: NextRequest) {
  const market = (req.nextUrl.searchParams.get('market') || 'NL') as Market

  // Try real Meta API first
  try {
    const liveData = await fetchFromMetaApi(market)
    if (liveData) return NextResponse.json(liveData)
  } catch {
    // API failed — fall through to mock
  }

  // Fallback to mock
  const campaigns = MOCK_CAMPAIGNS.filter(c => c.market === market)
  return NextResponse.json({ campaigns, daily: MOCK_DAILY, totals: computeTotals(campaigns) })
}
