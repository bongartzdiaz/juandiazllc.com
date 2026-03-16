import type { ChatbotData, ChatConversation, ChatDailyStats, ChatResponseTime, ChatStatus } from '../types'
import { promises as fs } from 'fs'
import path from 'path'

// ── Server-side: build ChatbotData from CSV + webhook + DM Champ API ──

interface StoredEvent {
  id: string
  event: string
  contactName: string
  contactPhone: string
  message?: string
  status?: string
  timestamp: string
  summary?: string
  tag?: string
}

interface CsvContact {
  contactId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  botMessageCount: number
  channel: string
  creditsUsed: number
  campaign: string
  doNotDisturb: boolean
  isBotActive: boolean
  lastActivityAt: string
  markChatClosed: boolean
  tags: string[]
  createdAt: string
}

// DM Champ API contact (enriched via /v1/contacts?phoneNumber=...)
interface ApiContact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  channel: string
  isBotActive: boolean
  doNotDisturb: boolean
  doNotDisturbReason: string | null
  createdAt: string
  lastActivityAt: string
  lastIncomingMessageAt: string
  hasHadActivity: boolean
  creditsUsed: number
  botMessageCount: number
  chatConcluded: boolean
  tags: string[]
  campaign: string
  fetchedAt: string // when we fetched this from API
}

const DATA_DIR = path.join(process.cwd(), '.data')
const EVENTS_FILE = path.join(DATA_DIR, 'dmchamp-events.json')
const CSV_FILE = path.join(DATA_DIR, 'dmchamp-contacts.csv')
const API_CACHE_FILE = path.join(DATA_DIR, 'dmchamp-api-cache.json')

// Cache: max 5 min old, then refresh from API
const API_CACHE_MAX_AGE_MS = 5 * 60 * 1000

async function readStoredEvents(): Promise<StoredEvent[]> {
  try {
    const raw = await fs.readFile(EVENTS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

// ── API cache read/write ──
async function readApiCache(): Promise<Map<string, ApiContact>> {
  try {
    const raw = await fs.readFile(API_CACHE_FILE, 'utf-8')
    const arr: ApiContact[] = JSON.parse(raw)
    const map = new Map<string, ApiContact>()
    for (const c of arr) {
      map.set(c.phone, c)
    }
    return map
  } catch {
    return new Map()
  }
}

async function writeApiCache(cache: Map<string, ApiContact>) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(API_CACHE_FILE, JSON.stringify([...cache.values()], null, 2))
}

// ── Fetch single contact from DM Champ API ──
async function fetchContactFromApi(phone: string): Promise<ApiContact | null> {
  const apiKey = process.env.DMCHAMP_API_KEY
  if (!apiKey) return null
  const baseUrl = process.env.DMCHAMP_BASE_URL || 'https://api.dmchamp.com/v1'

  try {
    const res = await fetch(`${baseUrl}/contacts?apiKey=${apiKey}&phoneNumber=${encodeURIComponent(phone)}`)
    if (!res.ok) return null
    const json = await res.json()
    if (!json.success || !json.contact) return null

    const c = json.contact
    return {
      id: c.id || json.contactId,
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      email: c.email || '',
      phone: c.phoneNumber || phone,
      channel: c.channel || 'whatsapp',
      isBotActive: c.isBotActive ?? false,
      doNotDisturb: c.doNotDisturb ?? false,
      doNotDisturbReason: c.doNotDisturbReason || null,
      createdAt: c.createdAt || '',
      lastActivityAt: c.lastActivityAt || '',
      lastIncomingMessageAt: c.lastIncomingMessageAt || '',
      hasHadActivity: c.hasHadActivity ?? false,
      creditsUsed: c.creditsUsed || 0,
      botMessageCount: c.botMessageCount || 0,
      chatConcluded: c.chatConcluded ?? false,
      tags: (c.tags || []).map((t: any) => typeof t === 'string' ? t : t.name || ''),
      campaign: c.currentCampaign?.name || c.campaigns?.[0]?.name || '',
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

// ── Batch enrich: for webhook phones not in CSV, fetch from API (with cache) ──
async function enrichWebhookContacts(phones: string[]): Promise<Map<string, ApiContact>> {
  const cache = await readApiCache()
  const now = Date.now()
  const toFetch: string[] = []

  for (const phone of phones) {
    const cached = cache.get(phone)
    if (cached && (now - new Date(cached.fetchedAt).getTime()) < API_CACHE_MAX_AGE_MS) {
      continue // fresh enough
    }
    toFetch.push(phone)
  }

  // Fetch max 20 per request cycle to avoid rate limits
  const batchSize = Math.min(toFetch.length, 20)
  const fetching = toFetch.slice(0, batchSize)

  if (fetching.length > 0) {
    const results = await Promise.allSettled(
      fetching.map(phone => fetchContactFromApi(phone))
    )

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled' && result.value) {
        cache.set(fetching[i], result.value)
      }
    }

    // Save updated cache
    await writeApiCache(cache).catch(() => {})
  }

  return cache
}

// ── CSV parser ──
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}

async function readCsvContacts(): Promise<CsvContact[]> {
  try {
    const raw = await fs.readFile(CSV_FILE, 'utf-8')
    const lines = raw.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []

    // Skip header
    const contacts: CsvContact[] = []
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCsvLine(lines[i])
      if (fields.length < 19) continue

      const firstName = fields[1] || ''
      const lastName = fields[2] || ''
      const email = fields[3] || ''
      const phone = fields[4] || ''

      // Skip test/dummy contacts
      if (email.includes('test@') || email.includes('@f01.nl') || email.includes('@f02.nl') || email.includes('@f03.nl')) continue
      if (firstName === 'Unknown' && lastName === 'Unknown' && email === 'unknown@unknown.com') continue
      if (phone === '' && email === '') continue

      contacts.push({
        contactId: fields[0],
        firstName,
        lastName,
        email,
        phone,
        botMessageCount: parseInt(fields[5]) || 0,
        channel: fields[6] || '',
        creditsUsed: parseFloat(fields[7]) || 0,
        campaign: fields[8] || '',
        doNotDisturb: fields[9] === 'true',
        isBotActive: fields[12] === 'true',
        lastActivityAt: fields[13] || '',
        markChatClosed: fields[14] === 'true',
        tags: (fields[17] || '').split(';').map(t => t.trim()).filter(Boolean),
        createdAt: fields[18] || '',
      })
    }
    return contacts
  } catch {
    return []
  }
}

// ── Map CSV tags to chat status ──
function mapTagsToStatus(tags: string[], doNotDisturb: boolean, markChatClosed: boolean, botMessages: number): ChatStatus {
  const tagSet = new Set(tags.map(t => t.toLowerCase()))

  if (tagSet.has('appointment_booked')) return 'gekwalificeerd'
  if (tagSet.has('lead_qualified')) return 'gekwalificeerd'
  if (tagSet.has('lead_interested') && botMessages >= 4) return 'gekwalificeerd'
  if (tagSet.has('heeft al een batterij')) return 'afgevallen'
  if (doNotDisturb && botMessages === 0) return 'afgevallen'
  if (markChatClosed) return 'afgerond'
  if (tagSet.has('lead_interested')) return 'wachtend'
  if (tagSet.has('lead_new') && botMessages > 0) return 'wachtend'
  if (botMessages > 0) return 'wachtend'
  if (tagSet.has('lead_new')) return 'wachtend'

  // Contacted but no response
  if (doNotDisturb) return 'afgevallen'

  return 'afgerond'
}

function mapApiContactToStatus(c: ApiContact): ChatStatus {
  const tags = c.tags.map(t => t.toLowerCase())
  if (tags.includes('appointment_booked') || tags.includes('lead_qualified')) return 'gekwalificeerd'
  if (tags.includes('lead_interested') && c.botMessageCount >= 4) return 'gekwalificeerd'
  if (tags.includes('heeft al een batterij')) return 'afgevallen'
  if (c.doNotDisturb && c.botMessageCount === 0) return 'afgevallen'
  if (c.chatConcluded) return 'afgerond'
  if (tags.includes('lead_interested')) return 'wachtend'
  if (c.botMessageCount > 0) return 'wachtend'
  if (tags.includes('lead_new')) return 'wachtend'
  if (c.doNotDisturb) return 'afgevallen'
  return 'afgerond'
}

function contactDisplayName(first: string, last: string): string {
  const f = first && first !== 'Unknown' ? first.trim() : ''
  const l = last && last !== 'Unknown' ? last.trim() : ''
  if (f && l) return `${f} ${l}`
  if (f) return f
  if (l) return l
  return 'Onbekend'
}

export async function fetchFromDmChampApi(): Promise<ChatbotData | null> {
  // Read both data sources
  const [csvContacts, webhookEvents] = await Promise.all([
    readCsvContacts(),
    readStoredEvents(),
  ])

  // If no data at all, check API connectivity
  if (csvContacts.length === 0 && webhookEvents.length === 0) {
    const apiKey = process.env.DMCHAMP_API_KEY
    if (!apiKey) return null

    const baseUrl = process.env.DMCHAMP_BASE_URL || 'https://api.dmchamp.com/v1'
    try {
      await fetch(`${baseUrl}/contacts?apiKey=${apiKey}&phoneNumber=%2B31600000000`)
    } catch {
      return null
    }

    return {
      conversations: [],
      daily: [],
      responseTime: [],
      totals: { gesprekken: 0, gekwalificeerd: 0, conversieRate: 0, gemReactietijd: 0, wachtendOpHandoff: 0 },
    }
  }

  // Track which phones came from CSV
  const csvPhones = new Set<string>()
  for (const c of csvContacts) {
    if (c.phone) csvPhones.add(c.phone)
  }

  // ── Collect unique webhook phones NOT in CSV ──
  const webhookPhones = new Set<string>()
  for (const e of webhookEvents) {
    if (e.contactPhone && e.contactPhone.length > 5 && !csvPhones.has(e.contactPhone)) {
      webhookPhones.add(e.contactPhone)
    }
  }

  // ── Enrich webhook contacts via DM Champ API ──
  const apiCache = await enrichWebhookContacts([...webhookPhones])

  // ── Build conversations ──
  const allConversations: ChatConversation[] = []
  const processedPhones = new Set<string>()

  // 1. Process CSV contacts (historical baseline)
  for (const c of csvContacts) {
    if (!c.campaign.includes('Thuisbatterijen')) continue
    if (c.phone) processedPhones.add(c.phone)

    // Check if API has fresher data for this contact
    const apiData = c.phone ? apiCache.get(c.phone) : null
    const status = apiData
      ? mapApiContactToStatus(apiData)
      : mapTagsToStatus(c.tags, c.doNotDisturb, c.markChatClosed, c.botMessageCount)
    const naam = apiData
      ? contactDisplayName(apiData.firstName, apiData.lastName)
      : contactDisplayName(c.firstName, c.lastName)
    const lastActivity = apiData?.lastActivityAt || c.lastActivityAt || c.createdAt
    const ts = new Date(lastActivity)

    allConversations.push({
      id: apiData?.id || c.contactId,
      naam,
      status,
      berichten: apiData?.botMessageCount ?? c.botMessageCount,
      duur: (apiData?.channel || c.channel) === 'whatsapp' ? 'WhatsApp' : (apiData?.channel || c.channel || '—'),
      onderwerp: (apiData?.tags || c.tags).filter(t => !t.startsWith('Follow_') && !t.startsWith('followup_')).join(', ') || '—',
      tijdstip: ts.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      datum: (c.createdAt || c.lastActivityAt || '').slice(0, 10),
    })
  }

  // 2. Add webhook/API contacts NOT in CSV (new leads since CSV export)
  for (const phone of webhookPhones) {
    if (processedPhones.has(phone)) continue
    processedPhones.add(phone)

    const apiData = apiCache.get(phone)

    if (apiData) {
      // We have full API data — use it
      // Only include if in the right campaign
      if (apiData.campaign && !apiData.campaign.includes('Thuisbatterij')) continue

      const status = mapApiContactToStatus(apiData)
      const naam = contactDisplayName(apiData.firstName, apiData.lastName)
      const ts = new Date(apiData.lastActivityAt || apiData.createdAt)

      allConversations.push({
        id: apiData.id,
        naam,
        status,
        berichten: apiData.botMessageCount,
        duur: apiData.channel === 'whatsapp' ? 'WhatsApp' : apiData.channel || '—',
        onderwerp: apiData.tags.filter(t => !t.startsWith('Follow_') && !t.startsWith('followup_')).join(', ') || '—',
        tijdstip: ts.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
        datum: (apiData.createdAt || '').slice(0, 10),
      })
    } else {
      // Fallback: use webhook event data
      const latestEvent = webhookEvents
        .filter(e => e.contactPhone === phone)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
      if (!latestEvent) continue

      const evtType = (latestEvent.event || '').toLowerCase()
      if (['read', 'delivered', 'sent', 'failed', 'unknown'].includes(evtType)) continue

      const status = mapWebhookEventToStatus(latestEvent)
      const ts = new Date(latestEvent.timestamp)

      allConversations.push({
        id: latestEvent.id,
        naam: latestEvent.contactName || 'Onbekend',
        status,
        berichten: latestEvent.message ? 1 : 0,
        duur: '—',
        onderwerp: latestEvent.summary || latestEvent.message?.substring(0, 40) || latestEvent.tag || '—',
        tijdstip: ts.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
        datum: (latestEvent.timestamp || '').slice(0, 10),
      })
    }
  }

  // Sort: most recent activity first
  allConversations.sort((a, b) => {
    const statusOrder: Record<string, number> = { gekwalificeerd: 0, wachtend: 1, handoff: 2, afgerond: 3, afgevallen: 4 }
    return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
  })

  // ── Build daily stats ──
  const dailyMap = new Map<string, { gesprekken: number; gekwalificeerd: number }>()

  // From all conversations (CSV + API enriched)
  for (const c of allConversations) {
    const date = c.datum
    if (!date) continue
    const entry = dailyMap.get(date) || { gesprekken: 0, gekwalificeerd: 0 }
    entry.gesprekken++
    if (c.status === 'gekwalificeerd') {
      entry.gekwalificeerd++
    }
    dailyMap.set(date, entry)
  }

  const daily: ChatDailyStats[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, d]) => ({
      date,
      label: new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric' }),
      gesprekken: d.gesprekken,
      gekwalificeerd: d.gekwalificeerd,
    }))

  const responseTime: ChatResponseTime[] = daily.map(d => ({
    date: d.date,
    label: d.label,
    sec: 0,
  }))

  // ── Totals ──
  const totalGesprekken = allConversations.length
  const gekwalificeerd = allConversations.filter(c => c.status === 'gekwalificeerd').length
  const wachtend = allConversations.filter(c => c.status === 'wachtend' || c.status === 'handoff').length

  return {
    conversations: allConversations,
    daily,
    responseTime,
    totals: {
      gesprekken: totalGesprekken,
      gekwalificeerd,
      conversieRate: totalGesprekken > 0 ? Math.round((gekwalificeerd / totalGesprekken) * 100) : 0,
      gemReactietijd: 0,
      wachtendOpHandoff: wachtend,
    },
  }
}

function mapWebhookEventToStatus(event: StoredEvent): ChatStatus {
  const s = (event.status || event.event || '').toLowerCase()
  if (s.includes('qualified')) return 'gekwalificeerd'
  if (s.includes('waiting') || s.includes('paused')) return 'wachtend'
  if (s.includes('handoff') || s.includes('hand_off')) return 'handoff'
  if (s.includes('dropped') || s.includes('failed')) return 'afgevallen'
  return 'afgerond'
}
