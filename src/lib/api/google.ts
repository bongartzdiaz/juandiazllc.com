import type { GoogleAdsData, GoogleCampaign, GoogleKeyword, GoogleDailyStats, Market } from '../types'
import { API_BASE } from '../utils'

function computeTotals(campaigns: GoogleCampaign[]) {
  const spend = campaigns.reduce((s, c) => s + c.spend, 0)
  const conversions = campaigns.reduce((s, c) => s + c.conversions, 0)
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  return {
    spend,
    conversions,
    clicks,
    impressions,
    avgCpa: conversions > 0 ? Math.round(spend / conversions) : 0,
    avgCtr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(1)) : 0,
  }
}

export async function fetchGoogleAds(market: Market = 'NL'): Promise<GoogleAdsData | null> {
  try {
    const res = await fetch(`${API_BASE}/google?market=${market}`)
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

// ── Google Ads API route handler ──

export async function fetchFromGoogleApi(market: Market): Promise<GoogleAdsData | null> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  if (!clientId || !customerId || !devToken || !refreshToken) return null

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!tokenRes.ok) return null
  const { access_token } = await tokenRes.json()

  const query = `
    SELECT campaign.id, campaign.name, campaign.advertising_channel_type,
           metrics.cost_micros, metrics.impressions, metrics.clicks,
           metrics.ctr, metrics.average_cpc, metrics.conversions, metrics.cost_per_conversion
    FROM campaign
    WHERE segments.date DURING THIS_MONTH
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
  `

  const searchRes = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': devToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )
  if (!searchRes.ok) return null

  const searchJson = await searchRes.json()
  const rows = searchJson[0]?.results || []

  const typeMap: Record<string, 'Search' | 'Display' | 'PMax' | 'Video'> = {
    SEARCH: 'Search', DISPLAY: 'Display', PERFORMANCE_MAX: 'PMax', VIDEO: 'Video',
  }

  const campaigns: GoogleCampaign[] = rows
    .filter((r: any) => {
      const name = r.campaign?.name || ''
      const isNL = name.includes('NL') || !name.includes('BE')
      return market === 'NL' ? isNL : !isNL
    })
    .map((r: any) => {
      const m = r.metrics || {}
      const spend = (m.costMicros || 0) / 1_000_000
      const conversions = Math.round(m.conversions || 0)
      return {
        id: r.campaign.id,
        name: r.campaign.name,
        type: typeMap[r.campaign.advertisingChannelType] || 'Search',
        status: 'ok' as const,
        market,
        spend: Math.round(spend),
        impressions: parseInt(m.impressions || '0'),
        clicks: parseInt(m.clicks || '0'),
        ctr: parseFloat((m.ctr * 100 || 0).toFixed(1)),
        cpc: (m.averageCpc || 0) / 1_000_000,
        conversions,
        cpa: conversions > 0 ? Math.round(spend / conversions) : null,
      }
    })

  return { campaigns, keywords: [], daily: [], totals: computeTotals(campaigns) }
}
