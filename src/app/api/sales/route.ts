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

    // Pipeline uses GHL cumulative data consistently (no external overrides)
    // This ensures the funnel is always decreasing and numbers match KPIs
    const result = {
      ...ghlData,
      // Pass through Meta/DM Champ data for reference (not mixed into funnel)
      metaLeads: (metaData?.totals?.leads ?? 0) + (googleData?.totals?.conversions ?? 0),
      dmChampGesprekken: chatbotData?.totals?.gesprekken ?? 0,
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  } catch (error) {
    console.error('[API /sales] fetch failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Sales data niet beschikbaar' })
  }
}
