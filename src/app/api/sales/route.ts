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

    // Website leads = Meta leads + Google conversions
    const metaLeads = metaData?.totals?.leads ?? 0
    const googleConversions = googleData?.totals?.conversions ?? 0
    const websiteLeads = metaLeads + googleConversions

    // Override chatbot with DM Champ total conversations
    const chatbotGesprekken = chatbotData?.totals?.gesprekken ?? 0

    // Telefoon + buitendienst komen uit GHL pipeline (stages: "Telefoon gesprek ingepland", "Advies gesprek op locatie gepland")
    const pipeline = ghlData.pipeline.map(step => {
      if (step.stage === 'website_lead') {
        return { ...step, value: websiteLeads }
      }
      if (step.stage === 'chatbot') {
        return { ...step, value: chatbotGesprekken }
      }
      // telefoon, buitendienst, sale → direct uit GHL
      return step
    })

    // Recalculate totals — leads = alleen website leads (Meta + Google), NIET chatbot gesprekken
    const telefoon = ghlData.pipeline.find(s => s.stage === 'telefoon')?.value ?? 0
    const buitendienst = ghlData.pipeline.find(s => s.stage === 'buitendienst')?.value ?? 0
    const deals = ghlData.pipeline.find(s => s.stage === 'sale')?.value ?? 0
    const totalLeads = websiteLeads

    const result = {
      ...ghlData,
      pipeline,
      totals: {
        ...ghlData.totals,
        leads: totalLeads,
        afspraken: telefoon + buitendienst,
        deals,
        conversieRate: totalLeads > 0 ? parseFloat(((deals / totalLeads) * 100).toFixed(1)) : 0,
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
