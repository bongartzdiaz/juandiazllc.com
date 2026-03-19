# Sessie 2 — GHL API + Supabase Edge Functions + Data Hooks

## Context
Lees eerst CLAUDE.md. Sessie 1 moet compleet zijn (design systeem + components).

## Investigate (doe dit EERST)
```bash
cat CLAUDE.md
ls supabase/functions/ 2>/dev/null || echo "nog aanmaken"
npx supabase functions list 2>/dev/null || echo "supabase CLI check"
cat src/lib/supabase.ts 2>/dev/null || echo "nog aanmaken"
```

---

## Phase 1 — Supabase Client

### `src/lib/supabase.ts`
```ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

// Server-side client (voor API routes)
export const supabaseAdmin = () =>
  createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
```

### `src/lib/ghl.ts`
```ts
const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

const ghlHeaders = {
  'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
  'Version': GHL_VERSION,
  'Content-Type': 'application/json',
}

export async function triggerGhlSync() {
  const { data, error } = await supabase.functions.invoke('ghl-sync')
  return { data, error }
}

export async function triggerAgendaSync() {
  const { data, error } = await supabase.functions.invoke('ghl-agenda-sync')
  return { data, error }
}
```

---

## Phase 2 — Edge Function: ghl-sync

Maak `supabase/functions/ghl-sync/index.ts`:

Wat doet deze functie:
1. Haal alle pipeline stages op van GHL Sales pipeline
2. Sla op in `ghl_pipeline_stages` (upsert op stage_id)
3. Haal alle leads op gefilterd op custom_field_juan = 'juan'
4. Sla op in `ghl_leads` (upsert op contact_id)
5. Geef terug: { stages_count, leads_count, synced_at }

GHL endpoints:
```
GET /pipelines/{pipelineId}/stages
  Headers: Authorization Bearer + Version 2021-07-28
  Location: ozS18XeeiEdjYK4xpoWJ

GET /contacts/
  Params: locationId, limit=100, page=1
  Filter: customField[juan] = juan
  Paginate tot geen meer
```

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const GHL_KEY = Deno.env.get('GHL_API_KEY')!
  const LOCATION_ID = Deno.env.get('GHL_LOCATION_ID')!
  const headers = {
    'Authorization': `Bearer ${GHL_KEY}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
  }

  // 1. Haal pipeline stages op
  // Zoek eerst de Sales pipeline ID via GET /pipelines?locationId=LOCATION_ID
  // Filter op naam === 'Sales'
  // Dan GET /pipelines/{pipelineId}/stages

  // 2. Upsert stages naar ghl_pipeline_stages

  // 3. Haal leads op (pagineer, filter op custom field juan)
  // GET /contacts?locationId=LOCATION_ID&limit=100&page=N

  // 4. Upsert leads naar ghl_leads

  return new Response(
    JSON.stringify({ success: true, synced_at: new Date().toISOString() }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
```

Vergeet NIET: `supabase secrets set GHL_API_KEY=... GHL_LOCATION_ID=...`

---

## Phase 3 — Edge Function: ghl-agenda-sync

Maak `supabase/functions/ghl-agenda-sync/index.ts`:

Wat doet deze functie:
1. Haal calendar events op: 7 dagen terug + 30 dagen vooruit
2. Voor elk event: zoek matching ghl_lead via contact_id
3. Sla op in `agenda_events` (upsert op ghl_event_id)
4. Geef terug: { events_count, synced_at }

GHL endpoint:
```
GET /calendars/events
  Params: locationId, startTime (unix ms), endTime (unix ms), limit=100
```

Status mapping van GHL naar ons schema:
- 'confirmed' → 'gepland'
- 'cancelled'  → 'geannuleerd'
- 'showed'     → 'afgerond'
- 'noshow'     → 'no_show'

---

## Phase 4 — React Hooks

### `src/hooks/useGhlPipeline.ts`
```ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type PipelineStage = {
  stage_id: string
  stage_naam: string
  volgorde: number
  leads_count: number
  total_value: number
}

export function useGhlPipeline() {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const fetchStages = async () => {
    const { data } = await supabase
      .from('ghl_pipeline_stages')
      .select('*')
      .order('volgorde')

    if (data) {
      setStages(data)
      setLastSync(data[0]?.synced_at ?? null)
    }
    setLoading(false)
  }

  // Auto-sync als > 30 min geleden
  const maybeSync = async () => {
    if (!lastSync) return triggerSync()
    const diff = Date.now() - new Date(lastSync).getTime()
    if (diff > 30 * 60 * 1000) triggerSync()
  }

  const triggerSync = async () => {
    await supabase.functions.invoke('ghl-sync')
    await fetchStages()
  }

  useEffect(() => { fetchStages().then(maybeSync) }, [])

  return { stages, loading, triggerSync }
}
```

### `src/hooks/useGhlLeadsByStage.ts`
Haalt leads per stage op, gesorteerd op ghl_created_at DESC
Ondersteunt filter: status = 'open' | 'gewonnen' | etc.

### `src/hooks/useAgenda.ts`
```ts
// Haalt agenda_events op voor huidige week (maandag t/m zondag)
// Groepeert per medewerker_naam
// Berekent week stats: totaal, deals, omzet, conv.rate
// Real-time via supabase.channel() subscribing op agenda_events
```

### `src/hooks/useMetaAds.ts`
```ts
// Haalt ads op gefilterd op country_code = 'NL' (BE standaard verborgen)
// Sorteert op spend DESC
// Berekent totalen: total_spend, avg_cpl, total_leads
// Refresh: elke 10 minuten
```

### `src/hooks/useAlerts.ts`
```ts
// Berekent alerts op basis van live data:
export type Alert = {
  id: string
  type: 'crit' | 'warn' | 'ok'
  message: string
  sub: string
  action?: string
}

export function calculateAlerts(ads, dmchampReport, agenda): Alert[] {
  const alerts: Alert[] = []

  // CPL te hoog
  ads.filter(a => getCplStatus(a.cpl, a.spend) === 'slecht').forEach(a => {
    alerts.push({ type: 'warn', message: `${a.campaign_name} CPL €${a.cpl}`, sub: 'Pauzeer of pas creative aan' })
  })

  // Goede funnel — schaal
  ads.filter(a => getCplStatus(a.cpl, a.spend) === 'goed' && a.spend > 50).forEach(a => {
    alerts.push({ type: 'ok', message: `${a.campaign_name} draait op CPL €${a.cpl}`, sub: 'Schaal budget op' })
  })

  // Human handoff chatbot
  if (dmchampReport?.human_alerts > 0) {
    alerts.push({ type: 'crit', message: `${dmchampReport.human_alerts} chatbot chats wachten`, sub: 'Human handoff vereist' })
  }

  return alerts.sort((a, b) => ['crit','warn','ok'].indexOf(a.type) - ['crit','warn','ok'].indexOf(b.type))
}
```

### `src/hooks/useDashboardData.ts`
```ts
// Parallel fetch van alles wat de hoofdpagina nodig heeft:
// Promise.all([
//   fetchLeadsVandaag(),
//   fetchLeadsDezeMaand(),
//   fetchCplGemiddeld(),
//   fetchBotConversie(),
//   fetchAfsprakenWeek(),
//   fetchDeelsMaand(),
//   fetchFunnelStappen(),
// ])
// Auto-refresh elke 5 minuten
// Geeft loading: boolean terug voor skeleton states
```

---

## Phase 5 — Sync trigger in Topbar

In `src/components/layout/Topbar.tsx`:
```tsx
const [syncing, setSyncing] = useState(false)

const handleSync = async () => {
  setSyncing(true)
  await Promise.all([triggerGhlSync(), triggerAgendaSync()])
  setSyncing(false)
  // toast: "GHL gesynchroniseerd"
}

// Button: "↺ Sync GHL" — draait als syncing=true
```

---

## Validation Checklist
- [ ] `supabase functions deploy ghl-sync` succesvol
- [ ] `supabase functions deploy ghl-agenda-sync` succesvol
- [ ] Secrets gezet in Supabase dashboard
- [ ] useGhlPipeline() returned stages zonder errors
- [ ] useAgenda() returned events voor huidige week
- [ ] useAlerts() berekent correct op basis van mock data
- [ ] Sync knop in topbar triggert functies en toont loading state
- [ ] Geen TypeScript errors
