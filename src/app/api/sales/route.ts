import { NextResponse } from 'next/server'
import { fetchFromGhlApi } from '@/lib/api/ghl'
import { fetchFromMetaApi } from '@/lib/api/meta'
import { fetchFromGoogleApi } from '@/lib/api/google'
import { fetchFromDmChampApi } from '@/lib/api/chatbot-server'

export async function GET() {
  try {
    // Fetch all 4 data sources in parallel
    const [ghlData, metaData, googleData, chatbotData] = await Promise.all([
      fetchFromGhlApi().catch(() => null),
      fetchFromMetaApi('NL').catch(() => null),
      fetchFromGoogleApi('NL').catch(() => null),
      fetchFromDmChampApi().catch(() => null),
    ])

    if (!ghlData) {
      return NextResponse.json({ error: 'GoHighLevel API niet bereikbaar — controleer GHL_API_KEY en GHL_LOCATION_ID' })
    }

    // Website leads = Meta + Google (actual ad-generated leads)
    const metaLeads = metaData?.totals?.leads ?? 0
    const googleConversions = googleData?.totals?.conversions ?? 0
    const websiteLeads = metaLeads + googleConversions

    // Override step 1 (website_lead) with Meta+Google leads
    // Math.max ensures funnel stays decreasing (Meta+Google >= GHL cumulative)
    const pipeline = ghlData.pipeline.map((step: any) => {
      if (step.stage === 'website_lead') {
        return { ...step, value: Math.max(websiteLeads, step.value) }
      }
      return step
    })

    const leadsTotal = Math.max(websiteLeads, ghlData.totals.leads)

    const result = {
      ...ghlData,
      pipeline,
      totals: {
        ...ghlData.totals,
        leads: leadsTotal,
        conversieRate: leadsTotal > 0
          ? parseFloat(((ghlData.totals.deals / leadsTotal) * 100).toFixed(1))
          : 0,
      },
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  } catch (error) {
    console.error('[API /sales] fetch failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Sales data niet beschikbaar' })
  }
}
