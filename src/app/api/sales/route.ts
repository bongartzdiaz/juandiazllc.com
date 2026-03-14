import { NextResponse } from 'next/server'
import { fetchFromGhlApi } from '@/lib/api/ghl'

export async function GET() {
  try {
    const liveData = await fetchFromGhlApi()
    if (liveData) {
      return NextResponse.json(liveData, {
        headers: { 'Cache-Control': 'private, max-age=60' },
      })
    }
  } catch (error) {
    console.error('[API /sales] GHL fetch failed:', error instanceof Error ? error.message : error)
  }

  return NextResponse.json({ error: 'GoHighLevel API niet bereikbaar — controleer GHL_API_KEY en GHL_LOCATION_ID' })
}
