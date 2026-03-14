import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Store webhook events in a JSON file on disk
const DATA_DIR = path.join(process.cwd(), '.data')
const EVENTS_FILE = path.join(DATA_DIR, 'dmchamp-events.json')

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
