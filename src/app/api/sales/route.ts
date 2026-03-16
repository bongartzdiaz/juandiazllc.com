import { NextResponse } from 'next/server'
import { fetchFromGhlApi } from '@/lib/api/ghl'
import { fetchFromMetaApi } from '@/lib/api/meta'
import { fetchFromDmChampApi } from '@/lib/api/chatbot-server'

export async function GET() {
  try {
    // Fetch all 3 data sources in parallel
    const [ghlData, metaData, chatbotData] = await Promise.all([
      fetchFromGhlApi().catch(() => null),
      fetchFromMetaApi('NL').catch(() => null),
      fetchFromDmChampApi().catch(() => null),
    ])

    if (!ghlData) {
      return NextResponse.json({ error: 'GoHighLevel API niet bereikbaar — controleer GHL_API_KEY en GHL_LOCATION_ID' })
    }

    // Override website_lead with Meta total leads
    const metaLeads = metaData?.totals?.leads ?? 0

    // Override chatbot with DM Champ total conversations
    const chatbotGesprekken = chatbotData?.totals?.gesprekken ?? 0

    // Telefoon + buitendienst komen uit GHL pipeline (stages: "Telefoon gesprek ingepland", "Advies gesprek op locatie gepland")
    const pipeline = ghlData.pipeline.map(step => {
      if (step.stage === 'website_lead') {
        return { ...step, value: metaLeads }
      }
      if (step.stage === 'chatbot') {
        return { ...step, value: chatbotGesprekken }
      }
      // telefoon, buitendienst, sale → direct uit GHL
      return step
    })

    // Recalculate totals
    const telefoon = ghlData.pipeline.find(s => s.stage === 'telefoon')?.value ?? 0
    const buitendienst = ghlData.pipeline.find(s => s.stage === 'buitendienst')?.value ?? 0
    const deals = ghlData.pipeline.find(s => s.stage === 'sale')?.value ?? 0
    const totalLeads = metaLeads + chatbotGesprekken + telefoon + buitendienst + deals

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
