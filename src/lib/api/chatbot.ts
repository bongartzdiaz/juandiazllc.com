import type { ChatbotData, ChatConversation, ChatDailyStats, ChatResponseTime } from '../types'
import { API_BASE } from '../utils'

// ── Mock data (DM Champ) ──

const MOCK_CONVERSATIONS: ChatConversation[] = [
  { id: 'c1', naam: 'Jan de Vries', status: 'gekwalificeerd', berichten: 12, duur: '4m 22s', onderwerp: 'Thuisbatterij-offerte', tijdstip: '14:32' },
  { id: 'c2', naam: 'Maria Jansen', status: 'wachtend', berichten: 3, duur: '1m 08s', onderwerp: 'Zonnepanelen-informatie', tijdstip: '14:28' },
  { id: 'c3', naam: 'Peter Bakker', status: 'handoff', berichten: 8, duur: '3m 45s', onderwerp: 'Combi-pakket vraag', tijdstip: '14:15' },
  { id: 'c4', naam: 'Lisa van Dijk', status: 'afgerond', berichten: 15, duur: '6m 12s', onderwerp: 'Subsidie thuisbatterij', tijdstip: '13:52' },
  { id: 'c5', naam: 'Tom Hendriks', status: 'gekwalificeerd', berichten: 10, duur: '3m 58s', onderwerp: 'Zonnepanelen + batterij', tijdstip: '13:41' },
  { id: 'c6', naam: 'Eva Smits', status: 'afgerond', berichten: 7, duur: '2m 34s', onderwerp: 'Teruglevering stroom', tijdstip: '13:22' },
  { id: 'c7', naam: 'Kees Mulder', status: 'afgevallen', berichten: 2, duur: '0m 45s', onderwerp: 'Niet bereikbaar', tijdstip: '13:10' },
]

const MOCK_DAILY: ChatDailyStats[] = [
  { date: '2026-03-01', label: '1/3', gesprekken: 18, gekwalificeerd: 6 },
  { date: '2026-03-02', label: '2/3', gesprekken: 24, gekwalificeerd: 9 },
  { date: '2026-03-03', label: '3/3', gesprekken: 21, gekwalificeerd: 7 },
  { date: '2026-03-04', label: '4/3', gesprekken: 28, gekwalificeerd: 11 },
  { date: '2026-03-05', label: '5/3', gesprekken: 33, gekwalificeerd: 14 },
  { date: '2026-03-06', label: '6/3', gesprekken: 27, gekwalificeerd: 10 },
  { date: '2026-03-07', label: '7/3', gesprekken: 35, gekwalificeerd: 15 },
  { date: '2026-03-08', label: '8/3', gesprekken: 30, gekwalificeerd: 12 },
  { date: '2026-03-09', label: '9/3', gesprekken: 38, gekwalificeerd: 17 },
  { date: '2026-03-10', label: '10/3', gesprekken: 42, gekwalificeerd: 19 },
  { date: '2026-03-11', label: '11/3', gesprekken: 36, gekwalificeerd: 14 },
  { date: '2026-03-12', label: '12/3', gesprekken: 45, gekwalificeerd: 21 },
  { date: '2026-03-13', label: '13/3', gesprekken: 40, gekwalificeerd: 18 },
  { date: '2026-03-14', label: '14/3', gesprekken: 37, gekwalificeerd: 16 },
]

const MOCK_RESPONSE_TIME: ChatResponseTime[] = [
  { date: '2026-03-01', label: '1/3', sec: 4.2 },
  { date: '2026-03-02', label: '2/3', sec: 3.8 },
  { date: '2026-03-03', label: '3/3', sec: 3.5 },
  { date: '2026-03-04', label: '4/3', sec: 3.9 },
  { date: '2026-03-05', label: '5/3', sec: 3.2 },
  { date: '2026-03-06', label: '6/3', sec: 3.6 },
  { date: '2026-03-07', label: '7/3', sec: 2.9 },
  { date: '2026-03-08', label: '8/3', sec: 3.1 },
  { date: '2026-03-09', label: '9/3', sec: 2.8 },
  { date: '2026-03-10', label: '10/3', sec: 3.0 },
  { date: '2026-03-11', label: '11/3', sec: 2.7 },
  { date: '2026-03-12', label: '12/3', sec: 2.5 },
  { date: '2026-03-13', label: '13/3', sec: 2.6 },
  { date: '2026-03-14', label: '14/3', sec: 2.4 },
]

function computeTotals(daily: ChatDailyStats[], conversations: ChatConversation[]) {
  const gesprekken = daily.reduce((s, d) => s + d.gesprekken, 0)
  const gekwalificeerd = daily.reduce((s, d) => s + d.gekwalificeerd, 0)
  const wachtend = conversations.filter(c => c.status === 'handoff' || c.status === 'wachtend').length
  return {
    gesprekken,
    gekwalificeerd,
    conversieRate: gesprekken > 0 ? Math.round((gekwalificeerd / gesprekken) * 100) : 0,
    gemReactietijd: parseFloat((MOCK_RESPONSE_TIME.reduce((s, d) => s + d.sec, 0) / MOCK_RESPONSE_TIME.length).toFixed(1)),
    wachtendOpHandoff: wachtend,
  }
}

export async function fetchChatbot(): Promise<ChatbotData> {
  try {
    const res = await fetch(`${API_BASE}/chatbot`)
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // API not available — fall back to mock
  }

  return {
    conversations: MOCK_CONVERSATIONS,
    daily: MOCK_DAILY,
    responseTime: MOCK_RESPONSE_TIME,
    totals: computeTotals(MOCK_DAILY, MOCK_CONVERSATIONS),
  }
}

// ── DM Champ API route handler ──
// Call from /api/chatbot/route.ts when DMCHAMP_API_KEY is configured.

export async function fetchFromDmChampApi(): Promise<ChatbotData | null> {
  const apiKey = process.env.DMCHAMP_API_KEY
  const baseUrl = process.env.DMCHAMP_BASE_URL || 'https://api.dmchamp.nl/v1'
  if (!apiKey) return null

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  // Fetch recent conversations
  const convoRes = await fetch(`${baseUrl}/conversations?limit=50&status=all`, { headers })
  if (!convoRes.ok) return null
  const convoJson = await convoRes.json()

  // Fetch analytics
  const analyticsRes = await fetch(`${baseUrl}/analytics?period=this_month`, { headers })
  const analyticsJson = analyticsRes.ok ? await analyticsRes.json() : null

  // Transform DM Champ response to our types
  const conversations: ChatConversation[] = (convoJson.data || []).map((c: any) => ({
    id: c.id,
    naam: c.contact_name || 'Onbekend',
    status: mapDmChampStatus(c.status),
    berichten: c.message_count || 0,
    duur: formatDuration(c.duration_seconds || 0),
    onderwerp: c.topic || c.first_message?.substring(0, 40) || '—',
    tijdstip: new Date(c.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
  }))

  const daily: ChatDailyStats[] = (analyticsJson?.daily || []).map((d: any) => ({
    date: d.date,
    label: new Date(d.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric' }),
    gesprekken: d.total_conversations || 0,
    gekwalificeerd: d.qualified || 0,
  }))

  return {
    conversations,
    daily,
    responseTime: (analyticsJson?.response_times || []).map((d: any) => ({
      date: d.date,
      label: new Date(d.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric' }),
      sec: d.avg_seconds || 0,
    })),
    totals: computeTotals(daily, conversations),
  }
}

function mapDmChampStatus(status: string): ChatConversation['status'] {
  const map: Record<string, ChatConversation['status']> = {
    qualified: 'gekwalificeerd',
    waiting: 'wachtend',
    handoff: 'handoff',
    completed: 'afgerond',
    dropped: 'afgevallen',
  }
  return map[status] || 'afgerond'
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}
