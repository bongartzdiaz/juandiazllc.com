import { NextRequest, NextResponse } from 'next/server'
import { fetchFromMetaApi } from '@/lib/api/meta'
import type { Market } from '@/lib/types'

export async function GET(req: NextRequest) {
  const market = (req.nextUrl.searchParams.get('market') || 'NL') as Market

  try {
    const liveData = await fetchFromMetaApi(market)
    if (liveData) return NextResponse.json(liveData)
  } catch (error) {
    console.error('[API /meta] Meta fetch failed:', error instanceof Error ? error.message : error)
  }

  return NextResponse.json({ error: 'Meta Ads API niet beschikbaar — controleer META_ACCESS_TOKEN en META_AD_ACCOUNT_ID' })
}
