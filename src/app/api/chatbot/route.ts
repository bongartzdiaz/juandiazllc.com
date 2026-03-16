import { NextResponse } from 'next/server'
import { fetchFromDmChampApi } from '@/lib/api/chatbot-server'

export async function GET() {
  try {
    const liveData = await fetchFromDmChampApi()
    if (liveData) {
      return NextResponse.json(liveData, {
        headers: { 'Cache-Control': 'private, max-age=30' },
      })
    }
  } catch (error) {
    console.error('[API /chatbot] DM Champ fetch failed:', error instanceof Error ? error.message : error)
  }

  return NextResponse.json({
    error: 'DM Champ data niet beschikbaar — controleer CSV bestand en webhook configuratie',
  })
}
