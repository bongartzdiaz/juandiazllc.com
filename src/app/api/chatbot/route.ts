import { NextResponse } from 'next/server'
import { fetchFromDmChampApi } from '@/lib/api/chatbot'

const MOCK_CONVERSATIONS = [
  { id: 'c1', naam: 'Jan de Vries', status: 'gekwalificeerd', berichten: 12, duur: '4m 22s', onderwerp: 'Thuisbatterij-offerte', tijdstip: '14:32' },
  { id: 'c2', naam: 'Maria Jansen', status: 'wachtend', berichten: 3, duur: '1m 08s', onderwerp: 'Zonnepanelen-informatie', tijdstip: '14:28' },
  { id: 'c3', naam: 'Peter Bakker', status: 'handoff', berichten: 8, duur: '3m 45s', onderwerp: 'Combi-pakket vraag', tijdstip: '14:15' },
  { id: 'c4', naam: 'Lisa van Dijk', status: 'afgerond', berichten: 15, duur: '6m 12s', onderwerp: 'Subsidie thuisbatterij', tijdstip: '13:52' },
  { id: 'c5', naam: 'Tom Hendriks', status: 'gekwalificeerd', berichten: 10, duur: '3m 58s', onderwerp: 'Zonnepanelen + batterij', tijdstip: '13:41' },
  { id: 'c6', naam: 'Eva Smits', status: 'afgerond', berichten: 7, duur: '2m 34s', onderwerp: 'Teruglevering stroom', tijdstip: '13:22' },
  { id: 'c7', naam: 'Kees Mulder', status: 'afgevallen', berichten: 2, duur: '0m 45s', onderwerp: 'Niet bereikbaar', tijdstip: '13:10' },
]

const MOCK_DAILY = [
  { date: '2026-03-01', label: '1/3', gesprekken: 18, gekwalificeerd: 6 }, { date: '2026-03-02', label: '2/3', gesprekken: 24, gekwalificeerd: 9 },
  { date: '2026-03-03', label: '3/3', gesprekken: 21, gekwalificeerd: 7 }, { date: '2026-03-04', label: '4/3', gesprekken: 28, gekwalificeerd: 11 },
  { date: '2026-03-05', label: '5/3', gesprekken: 33, gekwalificeerd: 14 }, { date: '2026-03-06', label: '6/3', gesprekken: 27, gekwalificeerd: 10 },
  { date: '2026-03-07', label: '7/3', gesprekken: 35, gekwalificeerd: 15 }, { date: '2026-03-08', label: '8/3', gesprekken: 30, gekwalificeerd: 12 },
  { date: '2026-03-09', label: '9/3', gesprekken: 38, gekwalificeerd: 17 }, { date: '2026-03-10', label: '10/3', gesprekken: 42, gekwalificeerd: 19 },
  { date: '2026-03-11', label: '11/3', gesprekken: 36, gekwalificeerd: 14 }, { date: '2026-03-12', label: '12/3', gesprekken: 45, gekwalificeerd: 21 },
  { date: '2026-03-13', label: '13/3', gesprekken: 40, gekwalificeerd: 18 }, { date: '2026-03-14', label: '14/3', gesprekken: 37, gekwalificeerd: 16 },
]

const MOCK_RESPONSE_TIME = [
  { date: '2026-03-01', label: '1/3', sec: 4.2 }, { date: '2026-03-02', label: '2/3', sec: 3.8 },
  { date: '2026-03-03', label: '3/3', sec: 3.5 }, { date: '2026-03-04', label: '4/3', sec: 3.9 },
  { date: '2026-03-05', label: '5/3', sec: 3.2 }, { date: '2026-03-06', label: '6/3', sec: 3.6 },
  { date: '2026-03-07', label: '7/3', sec: 2.9 }, { date: '2026-03-08', label: '8/3', sec: 3.1 },
  { date: '2026-03-09', label: '9/3', sec: 2.8 }, { date: '2026-03-10', label: '10/3', sec: 3.0 },
  { date: '2026-03-11', label: '11/3', sec: 2.7 }, { date: '2026-03-12', label: '12/3', sec: 2.5 },
  { date: '2026-03-13', label: '13/3', sec: 2.6 }, { date: '2026-03-14', label: '14/3', sec: 2.4 },
]

export async function GET() {
  try {
    const liveData = await fetchFromDmChampApi()
    if (liveData && liveData.conversations?.length > 0) return NextResponse.json(liveData)
  } catch {}

  const gesprekken = MOCK_DAILY.reduce((s, d) => s + d.gesprekken, 0)
  const gekwalificeerd = MOCK_DAILY.reduce((s, d) => s + d.gekwalificeerd, 0)
  const wachtend = MOCK_CONVERSATIONS.filter(c => c.status === 'handoff' || c.status === 'wachtend').length
  const gemReactietijd = parseFloat((MOCK_RESPONSE_TIME.reduce((s, d) => s + d.sec, 0) / MOCK_RESPONSE_TIME.length).toFixed(1))

  return NextResponse.json({
    conversations: MOCK_CONVERSATIONS,
    daily: MOCK_DAILY,
    responseTime: MOCK_RESPONSE_TIME,
    totals: { gesprekken, gekwalificeerd, conversieRate: Math.round((gekwalificeerd / gesprekken) * 100), gemReactietijd, wachtendOpHandoff: wachtend },
  })
}
