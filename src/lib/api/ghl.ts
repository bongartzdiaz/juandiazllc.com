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

  const salesPipeline = allPipelines.find(
    (p: any) => p.name?.toLowerCase() === (process.env.GHL_PIPELINE_NAME || 'Sales').toLowerCase()
  )
  if (!salesPipeline) {
    console.error(`[GHL] Pipeline "${(process.env.GHL_PIPELINE_NAME || 'Sales')}" not found. Available:`, allPipelines.map((p: any) => p.name))
    return null
  }

  const pipelineId: string = salesPipeline.id
  const ghlStages: { id: string; name: string }[] = salesPipeline.stages || []

  const stageIdToInternal: Record<string, PipelineStage> = {}

  for (const ghlStage of ghlStages) {
    const nameLower = (ghlStage.name || '').toLowerCase().trim()

    let mapped: PipelineStage | undefined
    if (['website lead', 'website_lead', 'new', 'lead', 'new lead', 'nieuw'].includes(nameLower)) {
      mapped = 'website_lead'
    } else if (['chatbot', 'chatbot gesprek', 'whatsapp', 'chat'].includes(nameLower)) {
      mapped = 'chatbot'
    } else if (['telefoon', 'telefonische afspraak', 'phone', 'call', 'appointment', 'telefoonafspraak'].includes(nameLower)) {
      mapped = 'telefoon'
    } else if (['buitendienst', 'buitendienst afspraak', 'field visit', 'field_visit', 'field', 'bezoek'].includes(nameLower)) {
      mapped = 'buitendienst'
    } else if (['sale', 'won', 'closed', 'gewonnen', 'verkocht', 'deal'].includes(nameLower)) {
      mapped = 'sale'
    }

    if (mapped) {
      stageIdToInternal[ghlStage.id] = mapped
    }
  }

  if (Object.keys(stageIdToInternal).length === 0 && ghlStages.length > 0) {
    const internalOrder: PipelineStage[] = ['website_lead', 'chatbot', 'telefoon', 'buitendienst', 'sale']
    for (let i = 0; i < Math.min(ghlStages.length, internalOrder.length); i++) {
      stageIdToInternal[ghlStages[i].id] = internalOrder[i]
    }
  }

  const opportunitiesRes = await fetch(
    `${baseUrl}/opportunities/search?location_id=${locationId}&pipeline_id=${pipelineId}&limit=100`,
    { headers }
  )
  if (!opportunitiesRes.ok) {
    console.error('[GHL] Failed to fetch opportunities:', opportunitiesRes.status, await opportunitiesRes.text())
    return null
  }
  const opportunitiesJson = await opportunitiesRes.json()
  const opportunities: any[] = opportunitiesJson.opportunities || []

  const contactsRes = await fetch(
    `${baseUrl}/contacts/?locationId=${locationId}&limit=100&sortBy=dateAdded&order=desc`,
    { headers }
  )
  const contactsJson = contactsRes.ok ? await contactsRes.json() : { contacts: [] }
  const rawContacts: any[] = contactsJson.contacts || []

  const filteredContacts = rawContacts.filter((c: any) => {
    if (!c.customFields || !Array.isArray(c.customFields)) return false
    return c.customFields.some(
      (cf: any) =>
        cf.key?.toLowerCase() === (process.env.GHL_CUSTOM_FIELD_NAME || 'Juan').toLowerCase() ||
        cf.name?.toLowerCase() === (process.env.GHL_CUSTOM_FIELD_NAME || 'Juan').toLowerCase()
    )
  })

  const contactsToUse = filteredContacts.length > 0 ? filteredContacts : rawContacts

  const stageCounts: Record<PipelineStage, number> = {
    website_lead: 0, chatbot: 0, telefoon: 0, buitendienst: 0, sale: 0,
  }

  for (const opp of opportunities) {
    const internalStage = stageIdToInternal[opp.pipelineStageId]
    if (internalStage) {
      stageCounts[internalStage]++
    } else {
      stageCounts['website_lead']++
    }
  }

  const pipeline: GhlPipelineStep[] = INTERNAL_STAGES.map(def => ({
    stage: def.stage,
    label: def.label,
    value: stageCounts[def.stage],
    description: def.description,
  }))

  const contactStageMap: Record<string, PipelineStage> = {}
  for (const opp of opportunities) {
    const contactId = opp.contact?.id || opp.contactId
    if (contactId) {
      contactStageMap[contactId] = stageIdToInternal[opp.pipelineStageId] || 'website_lead'
    }
  }

  const contacts: GhlContact[] = contactsToUse.map((c: any) => ({
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

  const dailyMap: Record<string, { leads: number; afspraken: number; deals: number }> = {}

  for (const opp of opportunities) {
    const dateStr = (opp.createdAt || opp.dateAdded || '').substring(0, 10)
    if (!dateStr) continue
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { leads: 0, afspraken: 0, deals: 0 }
    }
    dailyMap[dateStr].leads++
    const stage = stageIdToInternal[opp.pipelineStageId]
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

  const totalLeads = stageCounts.website_lead + stageCounts.chatbot + stageCounts.telefoon + stageCounts.buitendienst + stageCounts.sale
  const totalAfspraken = stageCounts.telefoon + stageCounts.buitendienst
  const totalDeals = stageCounts.sale
  const totalOmzet = opportunities
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
