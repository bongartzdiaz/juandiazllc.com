import type { ChatbotData, ChatConversation, ChatDailyStats, ChatResponseTime } from '../types'
import { promises as fs } from 'fs'
import path from 'path'

// ── Server-side: build ChatbotData from webhook events ──

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

const DATA_DIR = path.join(process.cwd(), '.data')
const EVENTS_FILE = path.join(DATA_DIR, 'dmchamp-events.json')

async function readStoredEvents(): Promise<StoredEvent[]> {
  try {
    const raw = await fs.readFile(EVENTS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function fetchFromDmChampApi(): Promise<ChatbotData | null> {
  const apiKey = process.env.DMCHAMP_API_KEY
  if (!apiKey) return null

  const events = await readStoredEvents()

  // If no webhook events stored yet, check API connectivity
  if (events.length === 0) {
    const baseUrl = process.env.DMCHAMP_BASE_URL || 'https://api.dmchamp.com/v1'
    try {
      const testRes = await fetch(`${baseUrl}/contacts?apiKey=${apiKey}&phoneNumber=%2B31600000000`)
      // Any HTTP response means the API is reachable
      if (!testRes) return null
    } catch {
      return null
    }

    // API reachable but no webhook data yet
    return {
      conversations: [],
      daily: [],
      responseTime: [],
      totals: {
        gesprekken: 0,
        gekwalificeerd: 0,
        conversieRate: 0,
        gemReactietijd: 0,
        wachtendOpHandoff: 0,
      },
    }
  }

  // Build conversations from events
  const conversations: ChatConversation[] = events.slice(0, 50).map(e => {
    const status = mapEventToStatus(e)
    const ts = new Date(e.timestamp)
    return {
      id: e.id,
      naam: e.contactName,
      status,
      berichten: e.message ? 1 : 0,
      duur: '—',
      onderwerp: e.summary || e.message?.substring(0, 40) || e.tag || '—',
      tijdstip: ts.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
    }
  })

  // Build daily stats from events grouped by date
  const dailyMap = new Map<string, { gesprekken: number; gekwalificeerd: number }>()
  for (const e of events) {
    const date = e.timestamp.slice(0, 10)
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

  const gesprekken = events.length
  const gekwalificeerd = events.filter(e =>
    e.status === 'qualified' || e.tag === 'qualified' || e.event === 'contact_qualified'
  ).length
  const wachtend = events.filter(e =>
    e.status === 'waiting' || e.status === 'paused' || e.event === 'contact_paused'
  ).length

  return {
    conversations,
    daily,
    responseTime,
    totals: {
      gesprekken,
      gekwalificeerd,
      conversieRate: gesprekken > 0 ? Math.round((gekwalificeerd / gesprekken) * 100) : 0,
      gemReactietijd: 0,
      wachtendOpHandoff: wachtend,
    },
  }
}

function mapEventToStatus(event: StoredEvent): ChatConversation['status'] {
  const s = (event.status || event.event || '').toLowerCase()
  if (s.includes('qualified')) return 'gekwalificeerd'
  if (s.includes('waiting') || s.includes('paused')) return 'wachtend'
  if (s.includes('handoff') || s.includes('hand_off')) return 'handoff'
  if (s.includes('dropped') || s.includes('failed')) return 'afgevallen'
  return 'afgerond'
}
