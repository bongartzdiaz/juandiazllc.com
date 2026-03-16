import type { SalesData, GhlPipelineStep, GhlContact, GhlDailyStats, PipelineStage } from '../types'
import { API_BASE } from '../utils'

// ── Our internal stage definitions (order matters for the funnel) ──

const INTERNAL_STAGES: { stage: PipelineStage; label: string; description: string }[] = [
  { stage: 'website_lead', label: 'Website leads', description: 'Totaal ingevulde formulieren' },
  { stage: 'chatbot', label: 'Chatbot gesprekken', description: 'WhatsApp-conversatie gestart' },
  { stage: 'telefoon', label: 'Telefonische afspraken', description: 'Kwalificatiegesprek ingepland' },
  { stage: 'buitendienst', label: 'Buitendienst afspraken', description: 'Fysiek adviesgesprek' },
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
// Based on "Leads campagne facebook" pipeline in HMB location (RLEt6qob2CC2OeOyxhYI)

function mapStageName(name: string): PipelineStage | 'lost' | null {
  const n = (name || '').toLowerCase().trim()

  // Website leads
  if (n.startsWith('nieuwe lead') || n.includes('new lead')) return 'website_lead'

  // Chatbot / WhatsApp contact
  if (n.includes('wapp') || n.includes('whatsapp') || n.includes('chatbot') || n === 'contact via whatsapp') return 'chatbot'
  // Belpogingen (gebeld 1/2/3) = nog in opvolging, geen afspraak
  if (n.startsWith('bel poging') || n.startsWith('gebeld') || n === 'niet opgenomen') return 'chatbot'

  // Telefonische afspraken — alleen daadwerkelijk ingeplande afspraken
  if (n.includes('telefoon gesprek ingepland') || n.startsWith('bel afspraak') || n.includes('telefonisch')) return 'telefoon'

  // Buitendienst
  if (n.includes('advies gesprek') || n.includes('op locatie') || n.includes('buitendienst') || n === 'optionele lead met offerte') return 'buitendienst'
  if (n === 'vems rapport gestuurd' || n === 'nieuwe afspraken') return 'buitendienst'
  if (n.startsWith('tfu - afspraak geweest')) return 'buitendienst'

  // Sale
  if (n.startsWith('sale') || n.startsWith('offerte getekend') || n === 'handtekening ontvangen' || n.startsWith('finale akkoord')) return 'sale'

  // Lost
  if (n === 'geen interesse' || n === 'toekomst' || n === 'te duur' || n === 'geen reactie' || n === 'lost' || n === 'nummer niet geldig') return 'lost'
  if (n === 'no show/geannuleerd' || n.includes('daadwerkelijk cancel') || n.includes('lange termijn')) return 'lost'

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
    console.error('[GHL] Failed to fetch pipelines:', pipelinesRes.status)
    return null
  }
  const pipelinesJson = await pipelinesRes.json()
  const allPipelines = pipelinesJson.pipelines || []

  // ── 2. Find relevant pipelines (exclude D2D) ──
  const targetPipelines = allPipelines.filter(
    (p: any) => {
      const name = p.name?.toLowerCase() || ''
      return !name.includes('d2d') && (
        name.includes('marketing') ||
        name.includes('pre-sales') ||
        name === 'sales' ||
        name.includes('lead')
      )
    }
  )

  if (targetPipelines.length === 0) {
    targetPipelines.push(...allPipelines)
  }

  // ── 3. Build stage ID → internal stage mappings ──
  const stageIdToInternal: Record<string, PipelineStage> = {}

  for (const pipeline of targetPipelines) {
    for (const s of (pipeline.stages || [])) {
      const mapped = mapStageName(s.name)
      if (mapped && mapped !== 'lost') {
        stageIdToInternal[s.id] = mapped
      }
    }
  }

  // ── 4. Fetch opportunities (paginated, deduplicated) ──
  const allOpportunities: any[] = []
  const seenIds = new Set<string>()

  for (const pipeline of targetPipelines) {
    let hasMore = true
    let startAfterId = ''
    let page = 0

    while (hasMore && page < 50) {
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

      // Deduplicate — GHL pagination can return duplicates
      let newCount = 0
      for (const opp of opps) {
        if (!seenIds.has(opp.id)) {
          seenIds.add(opp.id)
          allOpportunities.push(opp)
          newCount++
        }
      }

      // Stop if no new records (pagination stuck) or less than full page
      if (newCount === 0 || opps.length < 100) {
        hasMore = false
      } else {
        startAfterId = opps[opps.length - 1]?.id || ''
        page++
      }
    }
  }

  console.log(`[GHL] ${allOpportunities.length} opportunities from ${targetPipelines.map((p: any) => p.name).join(', ')}`)

  // ── 5. Count stages ──
  const stageCounts: Record<PipelineStage, number> = {
    website_lead: 0, chatbot: 0, telefoon: 0, buitendienst: 0, sale: 0,
  }

  for (const opp of allOpportunities) {
    const internalStage = stageIdToInternal[opp.pipelineStageId]
    if (!internalStage) continue
    stageCounts[internalStage]++
  }

  console.log('[GHL] Stage counts:', stageCounts)

  // ── 6. Build pipeline response ──
  const pipeline: GhlPipelineStep[] = INTERNAL_STAGES.map(def => ({
    stage: def.stage,
    label: def.label,
    value: stageCounts[def.stage],
    description: def.description,
  }))

  // ── 7. Build contacts from opportunities (contact data is embedded) ──
  const contactMap = new Map<string, { opp: any; stage: PipelineStage }>()
  const stageOrder: PipelineStage[] = ['website_lead', 'chatbot', 'telefoon', 'buitendienst', 'sale']

  for (const opp of allOpportunities) {
    const contactId = opp.contact?.id || opp.contactId
    const stage = stageIdToInternal[opp.pipelineStageId]
    if (!contactId || !stage) continue

    const existing = contactMap.get(contactId)
    if (!existing || stageOrder.indexOf(stage) > stageOrder.indexOf(existing.stage)) {
      contactMap.set(contactId, { opp, stage })
    }
  }

  const contacts: GhlContact[] = Array.from(contactMap.values())
    .sort((a, b) => stageOrder.indexOf(b.stage) - stageOrder.indexOf(a.stage))
    .map(({ opp, stage }) => {
      const c = opp.contact || {}
      return {
        id: c.id || opp.contactId || opp.id,
        naam: c.name || opp.name || 'Onbekend',
        email: c.email || '',
        telefoon: c.phone || '',
        bron: opp.source || c.tags?.[0] || '—',
        stage,
        waarde: typeof opp.monetaryValue === 'number' ? opp.monetaryValue : parseFloat(opp.monetaryValue) || 0,
        aangemaakt: opp.createdAt || '',
        laatsteActiviteit: opp.lastStatusChangeAt || opp.updatedAt || opp.createdAt || '',
      }
    })

  // ── 9. Build daily stats ──
  const dailyMap: Record<string, { leads: number; afspraken: number; deals: number }> = {}

  for (const opp of allOpportunities) {
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
  const totalOmzet = allOpportunities
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
