import type { SalesData, GhlPipelineStep, GhlContact, GhlDailyStats, PipelineStage } from '../types'
import { API_BASE } from '../utils'

// ── GHL API v2 — credentials from environment only ──

// ── Our internal stage definitions (order matters for the funnel) ──

const INTERNAL_STAGES: { stage: PipelineStage; label: string; description: string }[] = [
  { stage: 'website_lead', label: 'Website lead', description: 'Totaal ingevulde formulieren' },
  { stage: 'chatbot', label: 'Chatbot gesprek', description: 'WhatsApp-conversatie gestart' },
  { stage: 'telefoon', label: 'Telefonische afspraak', description: 'Kwalificatiegesprek ingepland' },
  { stage: 'buitendienst', label: 'Buitendienst afspraak', description: 'Fysiek adviesgesprek' },
  { stage: 'sale', label: 'Sale', description: 'Getekende overeenkomst' },
]

// ── Mock data (GoHighLevel) ──

const MOCK_PIPELINE: GhlPipelineStep[] = [
  { stage: 'website_lead', label: 'Website lead', value: 1247, description: 'Totaal ingevulde formulieren' },
  { stage: 'chatbot', label: 'Chatbot gesprek', value: 399, description: 'WhatsApp-conversatie gestart' },
  { stage: 'telefoon', label: 'Telefonische afspraak', value: 178, description: 'Kwalificatiegesprek ingepland' },
  { stage: 'buitendienst', label: 'Buitendienst afspraak', value: 72, description: 'Fysiek adviesgesprek' },
  { stage: 'sale', label: 'Sale', value: 36, description: 'Getekende overeenkomst' },
]

const MOCK_CONTACTS: GhlContact[] = [
  { id: 'h1', naam: 'Jan de Vries', email: 'jan@email.nl', telefoon: '06-12345678', bron: 'Meta F1', stage: 'sale', waarde: 4500, aangemaakt: '2026-03-01', laatsteActiviteit: '2026-03-12' },
  { id: 'h2', naam: 'Maria Jansen', email: 'maria@email.nl', telefoon: '06-23456789', bron: 'Google Search', stage: 'buitendienst', waarde: 3200, aangemaakt: '2026-03-03', laatsteActiviteit: '2026-03-14' },
  { id: 'h3', naam: 'Peter Bakker', email: 'peter@email.nl', telefoon: '06-34567890', bron: 'Meta F7', stage: 'telefoon', waarde: 0, aangemaakt: '2026-03-05', laatsteActiviteit: '2026-03-13' },
  { id: 'h4', naam: 'Lisa van Dijk', email: 'lisa@email.nl', telefoon: '06-45678901', bron: 'Meta F1', stage: 'sale', waarde: 5800, aangemaakt: '2026-03-02', laatsteActiviteit: '2026-03-11' },
  { id: 'h5', naam: 'Tom Hendriks', email: 'tom@email.nl', telefoon: '06-56789012', bron: 'Google PMax', stage: 'chatbot', waarde: 0, aangemaakt: '2026-03-10', laatsteActiviteit: '2026-03-14' },
]

const MOCK_DAILY: GhlDailyStats[] = [
  { date: '2026-03-01', label: '1/3', leads: 22, afspraken: 4, deals: 1 },
  { date: '2026-03-02', label: '2/3', leads: 31, afspraken: 5, deals: 2 },
  { date: '2026-03-03', label: '3/3', leads: 28, afspraken: 4, deals: 1 },
  { date: '2026-03-04', label: '4/3', leads: 35, afspraken: 6, deals: 2 },
  { date: '2026-03-05', label: '5/3', leads: 41, afspraken: 7, deals: 3 },
  { date: '2026-03-06', label: '6/3', leads: 38, afspraken: 6, deals: 2 },
  { date: '2026-03-07', label: '7/3', leads: 44, afspraken: 8, deals: 3 },
  { date: '2026-03-08', label: '8/3', leads: 39, afspraken: 6, deals: 2 },
  { date: '2026-03-09', label: '9/3', leads: 48, afspraken: 9, deals: 3 },
  { date: '2026-03-10', label: '10/3', leads: 52, afspraken: 8, deals: 3 },
  { date: '2026-03-11', label: '11/3', leads: 47, afspraken: 7, deals: 2 },
  { date: '2026-03-12', label: '12/3', leads: 56, afspraken: 10, deals: 4 },
  { date: '2026-03-13', label: '13/3', leads: 51, afspraken: 8, deals: 3 },
  { date: '2026-03-14', label: '14/3', leads: 47, afspraken: 7, deals: 2 },
]

export async function fetchSalesData(): Promise<SalesData> {
  try {
    const res = await fetch(`${API_BASE}/sales`)
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // API not available — fall back to mock
  }

  const leads = MOCK_PIPELINE[0].value
  const sales = MOCK_PIPELINE[MOCK_PIPELINE.length - 1].value
  return {
    pipeline: MOCK_PIPELINE,
    contacts: MOCK_CONTACTS,
    daily: MOCK_DAILY,
    totals: {
      leads: 87,
      afspraken: 24,
      deals: 14,
      omzet: 28000,
      conversieRate: leads > 0 ? parseFloat(((sales / leads) * 100).toFixed(1)) : 0,
    },
  }
}

// ── GoHighLevel API v2 route handler ──
// Call from /api/sales/route.ts

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

  // ── Step 1: Fetch all pipelines and find "Sales" by name ──

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

  // ── Build dynamic stage mapping: GHL stage name → our internal PipelineStage ──
  // We match GHL stage names (case-insensitive) to our internal stages.

  const stageNameToInternal: Record<string, PipelineStage> = {}
  const stageIdToInternal: Record<string, PipelineStage> = {}

  for (const ghlStage of ghlStages) {
    const nameLower = (ghlStage.name || '').toLowerCase().trim()

    // Try to match by similar/equivalent names
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
      stageNameToInternal[nameLower] = mapped
      stageIdToInternal[ghlStage.id] = mapped
    }
  }

  // If we couldn't map by name, fall back to positional mapping (first N stages)
  if (Object.keys(stageIdToInternal).length === 0 && ghlStages.length > 0) {
    const internalOrder: PipelineStage[] = ['website_lead', 'chatbot', 'telefoon', 'buitendienst', 'sale']
    for (let i = 0; i < Math.min(ghlStages.length, internalOrder.length); i++) {
      stageIdToInternal[ghlStages[i].id] = internalOrder[i]
    }
  }

  // ── Step 2: Fetch opportunities from the Sales pipeline ──

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

  // ── Step 3: Fetch contacts ──

  const contactsRes = await fetch(
    `${baseUrl}/contacts/?locationId=${locationId}&limit=100&sortBy=dateAdded&order=desc`,
    { headers }
  )
  const contactsJson = contactsRes.ok ? await contactsRes.json() : { contacts: [] }
  const rawContacts: any[] = contactsJson.contacts || []

  // ── Step 4: Filter contacts where custom field "Juan" is set ──

  const filteredContacts = rawContacts.filter((c: any) => {
    if (!c.customFields || !Array.isArray(c.customFields)) return false
    return c.customFields.some(
      (cf: any) =>
        cf.key?.toLowerCase() === (process.env.GHL_CUSTOM_FIELD_NAME || 'Juan').toLowerCase() ||
        cf.name?.toLowerCase() === (process.env.GHL_CUSTOM_FIELD_NAME || 'Juan').toLowerCase()
    )
  })

  // If no contacts have the custom field, use all contacts (graceful fallback)
  const contactsToUse = filteredContacts.length > 0 ? filteredContacts : rawContacts

  // ── Step 5: Count opportunities per internal stage ──

  const stageCounts: Record<PipelineStage, number> = {
    website_lead: 0,
    chatbot: 0,
    telefoon: 0,
    buitendienst: 0,
    sale: 0,
  }

  for (const opp of opportunities) {
    const internalStage = stageIdToInternal[opp.pipelineStageId]
    if (internalStage) {
      stageCounts[internalStage]++
    } else {
      // Unknown stage — count as website_lead
      stageCounts['website_lead']++
    }
  }

  // ── Step 6: Build pipeline steps ──

  const pipeline: GhlPipelineStep[] = INTERNAL_STAGES.map(def => ({
    stage: def.stage,
    label: def.label,
    value: stageCounts[def.stage],
    description: def.description,
  }))

  // ── Step 7: Map contacts ──

  // Build a lookup: opportunity contact ID → stage
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

  // ── Step 8: Build daily stats from opportunities ──

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
    return {
      date,
      label,
      ...dailyMap[date],
    }
  })

  // Use mock daily data as fallback if no daily data was computed
  const dailyResult = daily.length > 0 ? daily : MOCK_DAILY

  // ── Step 9: Calculate totals from real data ──

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
    daily: dailyResult,
    totals: {
      leads: totalLeads,
      afspraken: totalAfspraken,
      deals: totalDeals,
      omzet: totalOmzet,
      conversieRate: totalLeads > 0 ? parseFloat(((totalDeals / totalLeads) * 100).toFixed(1)) : 0,
    },
  }
}
