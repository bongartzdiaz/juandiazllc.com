import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Store webhook events in a JSON file on disk
const DATA_DIR = path.join(process.cwd(), '.data')
const EVENTS_FILE = path.join(DATA_DIR, 'dmchamp-events.json')
const API_CACHE_FILE = path.join(DATA_DIR, 'dmchamp-api-cache.json')

interface DmChampEvent {
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
  fetchedAt: string
}

async function readEvents(): Promise<DmChampEvent[]> {
  try {
    const raw = await fs.readFile(EVENTS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeEvents(events: DmChampEvent[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2))
}

// Proactive API enrichment: when a webhook has a phone, immediately cache the contact
async function enrichContactInBackground(phone: string) {
  const apiKey = process.env.DMCHAMP_API_KEY
  if (!apiKey || !phone || phone.length <= 5) return

  const baseUrl = process.env.DMCHAMP_BASE_URL || 'https://api.dmchamp.com/v1'

  try {
    const res = await fetch(`${baseUrl}/contacts?apiKey=${apiKey}&phoneNumber=${encodeURIComponent(phone)}`)
    if (!res.ok) return
    const json = await res.json()
    if (!json.success || !json.contact) return

    const c = json.contact
    const apiContact: ApiContact = {
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

    // Read existing cache, update/add this contact, write back
    let cache: ApiContact[] = []
    try {
      const raw = await fs.readFile(API_CACHE_FILE, 'utf-8')
      cache = JSON.parse(raw)
    } catch { /* empty cache */ }

    const idx = cache.findIndex(x => x.phone === phone)
    if (idx >= 0) {
      cache[idx] = apiContact
    } else {
      cache.push(apiContact)
    }

    await fs.writeFile(API_CACHE_FILE, JSON.stringify(cache, null, 2))
    console.log(`[Webhook] Enriched contact: ${apiContact.firstName} ${apiContact.lastName} (${phone})`)
  } catch (err) {
    console.error(`[Webhook] API enrich failed for ${phone}:`, err instanceof Error ? err.message : err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // DM Champ webhook payload — extract relevant fields
    const event: DmChampEvent = {
      id: body.id || body.contactId || `evt_${Date.now()}`,
      event: body.event || body.type || 'unknown',
      contactName: body.contactName || body.contact?.name || body.name || 'Onbekend',
      contactPhone: body.contactPhone || body.contact?.phone || body.phone || '',
      message: body.message || body.lastMessage || body.text || '',
      status: body.status || body.contactStatus || '',
      timestamp: body.timestamp || body.createdAt || new Date().toISOString(),
      summary: body.summary || body.conversationSummary || '',
      tag: body.tag || body.tags?.[0] || '',
    }

    const events = await readEvents()

    // Update existing event by id or add new
    const idx = events.findIndex(e => e.id === event.id)
    if (idx >= 0) {
      events[idx] = event
    } else {
      events.unshift(event)
    }

    // Keep max 500 events (rolling window)
    const trimmed = events.slice(0, 500)
    await writeEvents(trimmed)

    // Proactive enrichment: if event has a phone number, immediately fetch full contact data
    if (event.contactPhone && event.contactPhone.length > 5) {
      // Fire and forget — don't block the webhook response
      enrichContactInBackground(event.contactPhone).catch(() => {})
    }

    console.log(`[Webhook] DM Champ event: ${event.event} — ${event.contactName}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Webhook] DM Champ error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}

// GET endpoint to read stored events (used by /api/chatbot)
export async function GET() {
  const events = await readEvents()
  return NextResponse.json({ events, count: events.length })
}
