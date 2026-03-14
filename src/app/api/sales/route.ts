import { NextResponse } from 'next/server'
import { fetchFromGhlApi } from '@/lib/api/ghl'

const MOCK_PIPELINE = [
  { stage: 'website_lead', label: 'Website lead', value: 1247, description: 'Totaal ingevulde formulieren' },
  { stage: 'chatbot', label: 'Chatbot gesprek', value: 399, description: 'WhatsApp-conversatie gestart' },
  { stage: 'telefoon', label: 'Telefonische afspraak', value: 178, description: 'Kwalificatiegesprek ingepland' },
  { stage: 'buitendienst', label: 'Buitendienst afspraak', value: 72, description: 'Fysiek adviesgesprek' },
  { stage: 'sale', label: 'Sale', value: 36, description: 'Getekende overeenkomst' },
]

export async function GET() {
  try {
    const liveData = await fetchFromGhlApi()
    if (liveData) {
      return NextResponse.json(liveData, {
        headers: {
          'Cache-Control': 'private, max-age=60',
        },
      })
    }
  } catch (error) {
    console.error('[API /sales] GHL fetch failed:', error instanceof Error ? error.message : error)
  }

  // Fallback to mock data when GHL is unavailable
  return NextResponse.json({
    pipeline: MOCK_PIPELINE,
    contacts: [],
    daily: [],
    totals: { leads: 87, afspraken: 24, deals: 14, omzet: 28000, conversieRate: 2.9 },
  })
}
