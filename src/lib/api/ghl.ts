import type { SalesData, GhlPipelineStep, GhlContact, GhlDailyStats, PipelineStage } from '../types'
import { API_BASE } from '../utils'

// ── Our internal stage definitions (order matters for the funnel) ──

const INTERNAL_STAGES: { stage: PipelineStage; label: string; description: string }[] = [
  { stage: 'website_lead', label: 'Website lead', description: 'Totaal ingevulde formulieren' },
  { stage: 'chatbot', label: 'Chatbot gesprek', description: 'WhatsApp-conversatie gestart' },
  { stage: 'telefoon', label: 'Telefonische afspraak', description: 'Kwalificatiegesprek ingepland' },
  { stage: 'buitendienst', label: 'Buitendienst afspraak', description: 'Fysiek adviesgesprek' },
  { stage: 'sale', label: 'Sale', description: 'Getekende overeenkomst' },
]

export async function fetchSalesData(): Promise<SalesData | null> {
  try {
    const res = await fetch(`${API_BASE}/sales`)
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

// ── GHL stage name → internal stage mapping ──
// Based on actual GHL pipeline stage names (D2D, Marketing & Pre-sales, Sales)

function mapMarketingStageName(name: string): PipelineStage | 'lost' | null {
  const n = (name || '').toLowerCase().trim()

  // Website leads
  if (n.startsWith('nieuwe lead')) return 'website_lead'
  // Chatbot / WhatsApp
  if (n.includes('whatsapp') || n === 'contact via whatsapp') return 'chatbot'
  // Telefonische afspraken
  if (n.startsWith('bel poging') || n.startsWith('bel afspraak') || n === 'niet opgenomen') return 'telefoon'
  // Buitendienst
  if (n.includes('advies gesprek') || n.includes('op locatie') || n === 'optionele lead met offerte') return 'buitendienst'
  // Sale
  if (n.startsWith('sale')) return 'sale'
  // Lost
  if (n === 'geen interesse' || n === 'toekomst' || n === 'te duur' || n === 'geen reactie' || n === 'lost' || n === 'nummer niet geldig') return 'lost'

  return null
}

function mapSalesPipelineStageName(name: string): PipelineStage | 'lost' | null {
  const n = (name || '').toLowerCase().trim()

  // VEMS rapport = pre-buitendienst
  if (n === 'vems rapport gestuurd') return 'buitendienst'
  // Nieuwe afspraken = buitendienst gepland
  if (n === 'nieuwe afspraken') return 'buitendienst'
  // TFU - Afspraak geweest = buitendienst geweest
  if (n.startsWith('tfu - afspraak geweest')) return 'buitendienst'
  // Offerte getekend variants = sale!
  if (n.startsWith('offerte getekend') || n === 'handtekening ontvangen' || n.startsWith('finale akkoord')) return 'sale'
  // Lost/cancelled
  if (n === 'geen interesse' || n.includes('toekomst') || n === 'no show/geannuleerd' || n.includes('daadwerkelijk cancel')) return 'lost'

  return null
}

// ── GoHighLevel API v2 route handler ──

export async function fetchFromGhlApi(): Promise<SalesData | null> {
  const apiKey = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  const baseUrl = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com'

  if (!apiKey || !locationId) return null

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
  }

  // ── 1. Fetch all pipelines ──
  const pipelinesRes = await fetch(
    `${baseUrl}/opportunities/pipelines?locationId=${locationId}`,
    { headers }
  )
  if (!pipelinesRes.ok) {
    console.error('[GHL] Failed to fetch pipelines:', pipelinesRes.status, await pipelinesRes.text())
    return null
  }
  const pipelinesJson = await pipelinesRes.json()
  const allPipelines = pipelinesJson.pipelines || []

  // ── 2. Find Marketing & Pre-sales + Sales pipelines (helpmijbesparen only, no D2D) ──
  const marketingPipeline = allPipelines.find(
    (p: any) => p.name?.toLowerCase().includes('marketing') || p.name?.toLowerCase().includes('pre-sales')
  )
  const salesPipeline = allPipelines.find(
    (p: any) => p.name?.toLowerCase() === 'sales'
  )

  if (!marketingPipeline && !salesPipeline) {
    console.error('[GHL] No Marketing & Pre-sales or Sales pipeline found. Available:', allPipelines.map((p: any) => p.name))
    return null
  }

  // ── 3. Build stage ID → internal stage mappings for each pipeline ──
  const stageIdToInternal: Record<string, PipelineStage> = {}

  if (marketingPipeline) {
    for (const s of (marketingPipeline.stages || [])) {
      const mapped = mapMarketingStageName(s.name)
      if (mapped && mapped !== 'lost') {
        stageIdToInternal[s.id] = mapped
      }
    }
  }

  if (salesPipeline) {
    for (const s of (salesPipeline.stages || [])) {
      const mapped = mapSalesPipelineStageName(s.name)
      if (mapped && mapped !== 'lost') {
        stageIdToInternal[s.id] = mapped
      }
    }
  }

  console.log('[GHL] Stage mappings:', Object.keys(stageIdToInternal).length, 'stages mapped')

  // ── 4. Fetch opportunities from Marketing & Sales pipelines (paginated, max 20 pages each) ──
  const allOpportunities: any[] = []

  for (const pipeline of [marketingPipeline, salesPipeline].filter(Boolean)) {
    let hasMore = true
    let startAfterId = ''
    let page = 0

    while (hasMore && page < 20) {
      const searchUrl = new URL(`${baseUrl}/opportunities/search`)
      searchUrl.searchParams.set('location_id', locationId)
      searchUrl.searchParams.set('pipeline_id', pipeline.id)
      searchUrl.searchParams.set('limit', '100')
      if (startAfterId) {
        searchUrl.searchParams.set('startAfterId', startAfterId)
      }

      const res = await fetch(searchUrl.toString(), { headers })
      if (!res.ok) {
        console.error(`[GHL] Failed to fetch opportunities for ${pipeline.name}:`, res.status)
        break
      }

      const json = await res.json()
      const opps = json.opportunities || []
      allOpportunities.push(...opps)

      if (opps.length < 100) {
        hasMore = false
      } else {
        startAfterId = opps[opps.length - 1]?.id || ''
        page++
      }
    }

    console.log(`[GHL] ${pipeline.name}: fetched opportunities`)
  }

  // ── Filter: alleen HMB/helpmijbesparen leads (Facebook campagnes + Voltafy) ──
  const HMB_SOURCES = ['facebook', 'voltafy lead', 'voltafy', 'helpmijbesparen', 'hmb']
  const hmbOpportunities = allOpportunities.filter(opp => {
    const src = (opp.source || '').toLowerCase()
    return HMB_SOURCES.some(s => src.includes(s)) || src === ''
  })

  console.log(`[GHL] Total fetched: ${allOpportunities.length}, HMB filtered: ${hmbOpportunities.length}`)

  // ── 5. Fetch contacts ──
  const contactsRes = await fetch(
    `${baseUrl}/contacts/?locationId=${locationId}&limit=100&sortBy=dateAdded&order=desc`,
    { headers }
  )
  const contactsJson = contactsRes.ok ? await contactsRes.json() : { contacts: [] }
  const rawContacts: any[] = contactsJson.contacts || []

  // ── 6. Count stages ──
  const stageCounts: Record<PipelineStage, number> = {
    website_lead: 0, chatbot: 0, telefoon: 0, buitendienst: 0, sale: 0,
  }

  for (const opp of hmbOpportunities) {
    const internalStage = stageIdToInternal[opp.pipelineStageId]
    if (!internalStage) continue // Skip unmapped/lost stages
    stageCounts[internalStage]++
  }

  console.log('[GHL] Stage counts:', stageCounts)

  // ── 7. Build pipeline response ──
  const pipeline: GhlPipelineStep[] = INTERNAL_STAGES.map(def => ({
    stage: def.stage,
    label: def.label,
    value: stageCounts[def.stage],
    description: def.description,
  }))

  // ── 8. Map contacts to stages ──
  const contactStageMap: Record<string, PipelineStage> = {}
  for (const opp of hmbOpportunities) {
    const contactId = opp.contact?.id || opp.contactId
    if (contactId && stageIdToInternal[opp.pipelineStageId]) {
      // Use the furthest-along stage for each contact
      const current = contactStageMap[contactId]
      const newStage = stageIdToInternal[opp.pipelineStageId]
      const stageOrder: PipelineStage[] = ['website_lead', 'chatbot', 'telefoon', 'buitendienst', 'sale']
      if (!current || stageOrder.indexOf(newStage) > stageOrder.indexOf(current)) {
        contactStageMap[contactId] = newStage
      }
    }
  }

  const contacts: GhlContact[] = rawContacts.map((c: any) => ({
    id: c.id,
    naam: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Onbekend',
    email: c.email || '',
    telefoon: c.phone || '',
    bron: c.source || c.tags?.[0] || '—',
    stage: contactStageMap[c.id] || 'website_lead',
    waarde: typeof c.monetaryValue === 'number' ? c.monetaryValue : parseFloat(c.monetaryValue) || 0,
    aangemaakt: c.dateAdded || '',
    laatsteActiviteit: c.lastActivity || c.dateUpdated || '',
  }))

  // ── 9. Build daily stats ──
  const dailyMap: Record<string, { leads: number; afspraken: number; deals: number }> = {}

  for (const opp of hmbOpportunities) {
    const dateStr = (opp.createdAt || opp.dateAdded || '').substring(0, 10)
    if (!dateStr) continue
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { leads: 0, afspraken: 0, deals: 0 }
    }
    const stage = stageIdToInternal[opp.pipelineStageId]
    if (!stage) continue

    dailyMap[dateStr].leads++
    if (stage === 'telefoon' || stage === 'buitendienst') {
      dailyMap[dateStr].afspraken++
    }
    if (stage === 'sale' || opp.status === 'won') {
      dailyMap[dateStr].deals++
    }
  }

  const sortedDates = Object.keys(dailyMap).sort()
  const daily: GhlDailyStats[] = sortedDates.map(date => {
    const d = new Date(date)
    const label = `${d.getDate()}/${d.getMonth() + 1}`
    return { date, label, ...dailyMap[date] }
  })

  // ── 10. Totals ──
  const totalLeads = stageCounts.website_lead + stageCounts.chatbot + stageCounts.telefoon + stageCounts.buitendienst + stageCounts.sale
  const totalAfspraken = stageCounts.telefoon + stageCounts.buitendienst
  const totalDeals = stageCounts.sale
  const totalOmzet = hmbOpportunities
    .filter((o: any) => {
      const stage = stageIdToInternal[o.pipelineStageId]
      return stage === 'sale' || o.status === 'won'
    })
    .reduce((sum: number, o: any) => sum + (typeof o.monetaryValue === 'number' ? o.monetaryValue : parseFloat(o.monetaryValue) || 0), 0)

  return {
    pipeline,
    contacts,
    daily,
    totals: {
      leads: totalLeads,
      afspraken: totalAfspraken,
      deals: totalDeals,
      omzet: totalOmzet,
      conversieRate: totalLeads > 0 ? parseFloat(((totalDeals / totalLeads) * 100).toFixed(1)) : 0,
    },
  }
}
