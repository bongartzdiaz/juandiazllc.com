import type { ChatbotData, ChatConversation, ChatDailyStats, ChatResponseTime, ChatStatus } from '../types'
import { promises as fs } from 'fs'
import path from 'path'

// ── Server-side: build ChatbotData from CSV export + webhook events ──

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

const DATA_DIR = path.join(process.cwd(), '.data')
const EVENTS_FILE = path.join(DATA_DIR, 'dmchamp-events.json')
const CSV_FILE = path.join(DATA_DIR, 'dmchamp-contacts.csv')

async function readStoredEvents(): Promise<StoredEvent[]> {
  try {
    const raw = await fs.readFile(EVENTS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
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

  // ── Build conversations from CSV (baseline) ──
  // Index webhook events by phone for merging
  const webhookByPhone = new Map<string, StoredEvent>()
  for (const e of webhookEvents) {
    if (e.contactPhone) {
      webhookByPhone.set(e.contactPhone, e)
    }
  }

  // Track which phones came from CSV
  const csvPhones = new Set<string>()

  const allConversations: ChatConversation[] = []

  // 1. Process CSV contacts (primary source — complete history)
  for (const c of csvContacts) {
    csvPhones.add(c.phone)

    // Only include contacts in the campaign (actual leads)
    if (!c.campaign.includes('Thuisbatterijen')) continue

    const status = mapTagsToStatus(c.tags, c.doNotDisturb, c.markChatClosed, c.botMessageCount)
    const naam = contactDisplayName(c.firstName, c.lastName)
    const ts = new Date(c.lastActivityAt || c.createdAt)

    // Enrich with webhook data if available
    const webhook = webhookByPhone.get(c.phone)

    allConversations.push({
      id: c.contactId,
      naam,
      status,
      berichten: c.botMessageCount,
      duur: c.channel === 'whatsapp' ? 'WhatsApp' : c.channel || '—',
      onderwerp: webhook?.summary || c.tags.filter(t => !t.startsWith('Follow_') && !t.startsWith('followup_')).join(', ') || '—',
      tijdstip: ts.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
    })
  }

  // 2. Add webhook-only contacts (newer than CSV export)
  for (const e of webhookEvents) {
    if (e.contactPhone && csvPhones.has(e.contactPhone)) continue // Already in CSV

    const status = mapWebhookEventToStatus(e)
    const ts = new Date(e.timestamp)

    allConversations.push({
      id: e.id,
      naam: e.contactName,
      status,
      berichten: e.message ? 1 : 0,
      duur: '—',
      onderwerp: e.summary || e.message?.substring(0, 40) || e.tag || '—',
      tijdstip: ts.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
    })
  }

  // Sort: most recent activity first
  allConversations.sort((a, b) => {
    // Prioritize active statuses
    const statusOrder: Record<string, number> = { gekwalificeerd: 0, wachtend: 1, handoff: 2, afgerond: 3, afgevallen: 4 }
    return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
  })

  // ── Build daily stats ──
  const dailyMap = new Map<string, { gesprekken: number; gekwalificeerd: number }>()

  // From CSV: group by created date
  for (const c of csvContacts) {
    if (!c.campaign.includes('Thuisbatterijen')) continue
    const date = (c.createdAt || '').slice(0, 10)
    if (!date) continue
    const entry = dailyMap.get(date) || { gesprekken: 0, gekwalificeerd: 0 }
    entry.gesprekken++
    const tags = c.tags.map(t => t.toLowerCase())
    if (tags.includes('appointment_booked') || tags.includes('lead_qualified')) {
      entry.gekwalificeerd++
    }
    dailyMap.set(date, entry)
  }

  // From webhooks: add newer events
  for (const e of webhookEvents) {
    if (e.contactPhone && csvPhones.has(e.contactPhone)) continue
    const date = e.timestamp.slice(0, 10)
    if (!date) continue
    const entry = dailyMap.get(date) || { gesprekken: 0, gekwalificeerd: 0 }
    entry.gesprekken++
    if (e.status === 'qualified' || e.tag === 'qualified' || e.event === 'contact_qualified') {
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
    conversations: allConversations.slice(0, 100),
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
