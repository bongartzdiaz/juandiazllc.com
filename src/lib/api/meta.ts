import type { MetaAdsData, MetaCampaign, MetaDailyStats, Market } from '../types'
import { API_BASE } from '../utils'

// Lead action types in priority order — Meta uses different types depending on pixel setup
const LEAD_ACTION_TYPES = [
  'complete_registration',
  'offsite_conversion.fb_pixel_complete_registration',
  'lead',
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.messaging_first_reply',
]

function extractLeads(actions: any[]): number {
  if (!actions || actions.length === 0) return 0
  for (const type of LEAD_ACTION_TYPES) {
    const found = actions.find((a: any) => a.action_type === type)
    if (found) return parseInt(found.value) || 0
  }
  return 0
}

// ── Compute totals for a filtered set ──

function computeTotals(campaigns: MetaCampaign[]) {
  const spend = campaigns.reduce((s, c) => s + c.spend, 0)
  const leads = campaigns.reduce((s, c) => s + c.leads, 0)
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  return {
    spend,
    leads,
    impressions,
    clicks,
    avgCpl: leads > 0 ? Math.round(spend / leads) : 0,
    avgCtr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(1)) : 0,
  }
}

// ── Fetch Meta Ads data (client-side) ──

export async function fetchMetaAds(market: Market = 'NL'): Promise<MetaAdsData | null> {
  try {
    const res = await fetch(`${API_BASE}/meta?market=${market}`)
    if (res.ok) {
      const json = await res.json()
      if (json.error) return null
      return json
    }
  } catch {
    // API not available
  }
  return null
}

// ── Campaign name mapping ──

const CAMPAIGN_NAMES: Record<string, string> = {
  'CAM_001_FUNNEL_F1': 'F1 Thuisbatterij — Interesse NL',
  'CAM_002_FUNNEL_F2': 'F2 Zonnepanelen — Interesse NL',
  'CAM_003_FUNNEL_F3': 'F3 Combi Deal — Interesse NL',
  'CAM_004_FUNNEL_F4': 'F4 Retarget — 30 dagen',
  'CAM_005_FUNNEL_F5': 'F5 Koude Traffic — Video',
  'CAM_006_FUNNEL_F6': 'F6 Video Testimonial',
  'CAM_007_FUNNEL_F7': 'F7 Lookalike — Zonnepanelen',
  'CAM_009_FUNNEL_F1': 'F1 Thuisbatterij — Breed NL',
  'CAM_010_FUNNEL_F2': 'F2 Zonnepanelen — Breed NL',
  'CAM_011_FUNNEL_F3': 'F3 Combi Deal — Breed NL',
  'CAM_012_FUNNEL_F4': 'F4 Retarget — Breed',
  'CAM_013_FUNNEL_F5': 'F5 Koude Video — Breed',
  'CAM_014_FUNNEL_F6': 'F6 Video Testimonial — Breed',
  'CAM_015_FUNNEL_F7': 'F7 Lookalike — Breed',
  'CAM_014_FUNNEL_F1_I01': 'F1 Thuisbatterij — Interesse NL',
  'CAM_015_FUNNEL_F2_I01': 'F2 Zonnepanelen — Interesse NL',
  'CAM_016_FUNNEL_F3_I01': 'F3 Combi — Interesse NL',
  'CAM_017_FUNNEL_F4_I01': 'F4 Retarget — Interesse',
  'CAM_018_FUNNEL_F5_I01': 'F5 Koude Traffic — Interesse',
}

function mapCampaignName(rawName: string): string {
  return CAMPAIGN_NAMES[rawName] || rawName
}

// ── Meta API route handler (for use in /api/meta/route.ts) ──

export async function fetchFromMetaApi(market: Market): Promise<MetaAdsData | null> {
  const token = process.env.META_ACCESS_TOKEN
  const accountId = process.env.META_AD_ACCOUNT_ID
  if (!token || !accountId) return null

  const baseUrl = `https://graph.facebook.com/v21.0/act_${accountId}`

  // Fetch campaigns list
  const campaignsRes = await fetch(
    `${baseUrl}/campaigns?fields=name,status&limit=50&access_token=${token}`
  )
  if (!campaignsRes.ok) return null
  const campaignsJson = await campaignsRes.json()

  // Filter by market (exclude BE)
  const filteredCampaigns = (campaignsJson.data || []).filter((c: any) => {
    const hasBE = c.name?.toUpperCase().includes('_BE') || c.name?.toUpperCase().endsWith(' BE')
    return market === 'NL' ? !hasBE : hasBE
  })

  const campaignIds = filteredCampaigns.map((c: any) => c.id)
  if (campaignIds.length === 0) {
    return { campaigns: [], daily: [], totals: computeTotals([]) }
  }

  // Fetch insights per campaign (this_month)
  const filterParam = encodeURIComponent(
    JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: campaignIds }])
  )

  const insightsRes = await fetch(
    `${baseUrl}/insights?fields=campaign_id,campaign_name,spend,impressions,clicks,ctr,actions&date_preset=this_month&level=campaign&filtering=${filterParam}&limit=50&access_token=${token}`
  )
  const insightsJson = insightsRes.ok ? await insightsRes.json() : { data: [] }

  // Build insights lookup by campaign ID
  const insightsMap = new Map<string, any>()
  for (const row of (insightsJson.data || [])) {
    insightsMap.set(row.campaign_id, row)
  }

  // Build campaigns with insights
  const campaigns: MetaCampaign[] = filteredCampaigns.map((c: any) => {
    const ins = insightsMap.get(c.id) || {}
    const leads = extractLeads(ins.actions)
    const spend = parseFloat(ins.spend || '0')
    return {
      id: c.id,
      name: mapCampaignName(c.name),
      funnel: c.name?.match(/F\d+/)?.[0] || '—',
      status: 'ok' as const,
      market,
      spend,
      budget: 0,
      impressions: parseInt(ins.impressions || '0'),
      clicks: parseInt(ins.clicks || '0'),
      ctr: parseFloat(ins.ctr || '0'),
      cpl: leads > 0 ? Math.round(spend / leads) : null,
      leads,
    }
  })

  // Fetch daily insights (filtered to NL campaigns)
  const dailyRes = await fetch(
    `${baseUrl}/insights?fields=spend,impressions,clicks,actions&time_increment=1&date_preset=this_month&filtering=${filterParam}&limit=50&access_token=${token}`
  )
  const dailyJson = dailyRes.ok ? await dailyRes.json() : { data: [] }

  const daily: MetaDailyStats[] = (dailyJson.data || []).map((d: any) => {
    const leads = extractLeads(d.actions)
    return {
      date: d.date_start,
      label: new Date(d.date_start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric' }),
      spend: parseFloat(d.spend || '0'),
      leads,
      impressions: parseInt(d.impressions || '0'),
      clicks: parseInt(d.clicks || '0'),
    }
  })

  return { campaigns, daily, totals: computeTotals(campaigns) }
}
