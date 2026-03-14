import { NextRequest, NextResponse } from 'next/server'
import { fetchFromGoogleApi } from '@/lib/api/google'
import type { Market } from '@/lib/types'

export async function GET(req: NextRequest) {
  const market = (req.nextUrl.searchParams.get('market') || 'NL') as Market

  try {
    const liveData = await fetchFromGoogleApi(market)
    if (liveData) return NextResponse.json(liveData)
  } catch (error) {
    console.error('[API /google] Google Ads fetch failed:', error instanceof Error ? error.message : error)
  }

  return NextResponse.json({ error: 'Google Ads API niet bereikbaar — controleer GOOGLE_ADS_* credentials' })
}
