# Claude Code — Live Dashboard Connection Prompt
> Paste this entire prompt into Claude Code to wire up and edit the dashboard live.

---

## CONTEXT

You are working on an HMB-style energy ops dashboard built with:
- Next.js 14 App Router + TypeScript
- Tailwind CSS with dual-theme CSS variables
- Supabase (PostgreSQL + Edge Functions)
- Chart.js / Recharts for data visualisation
- GoHighLevel CRM, Meta Ads API, DM Champ WhatsApp bot

The dashboard design system uses:
- DM Sans for UI text, DM Mono for ALL numbers
- Dual-theme: `[data-theme="light"]` and `[data-theme="dark"]` CSS variables
- Color tokens: `--g` (green=success), `--o` (orange=spend), `--y` (amber=warning), `--r` (red=error), `--b` (blue=info)
- NEVER hardcode hex colors — always use `var(--token-name)`

---

## STEP 1 — INVESTIGATE FIRST

Before touching any code, always run these checks:

```bash
# 1. Read the master context
cat CLAUDE.md

# 2. Check what exists
ls src/
ls src/app/
ls src/components/
ls src/hooks/
ls src/lib/

# 3. Check current env setup
cat .env.local 2>/dev/null || cat .env.example 2>/dev/null || echo "No env file found"

# 4. Check package.json for installed deps
cat package.json | grep -A 50 '"dependencies"'

# 5. Check if Supabase is already wired
cat src/lib/supabase.ts 2>/dev/null || echo "supabase.ts not found"

# 6. TypeScript check before starting
npx tsc --noEmit 2>&1 | head -20
```

---

## STEP 2 — CREATE .env.local

If `.env.local` doesn't exist or is incomplete, create it:

```bash
cat > .env.local << 'ENVEOF'
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECTID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# GHL
GHL_API_KEY=pit-xxxx
GHL_LOCATION_ID=xxxx
GHL_PIPELINE_NAME=Sales
GHL_CUSTOM_FIELD_FILTER=

# META ADS
META_ACCESS_TOKEN=EAAx
META_AD_ACCOUNT_ID=act_xxxx

# DM CHAMP
DMCHAMP_API_KEY=
DMCHAMP_WEBHOOK_SECRET=

# SLACK
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
SLACK_CHANNEL=#dashboard-updates

# AI
ANTHROPIC_API_KEY=sk-ant-

# APP
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ENVEOF
echo ".env.local created"
```

---

## STEP 3 — WIRE SUPABASE CLIENT

Create or update `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!url || !anon) {
  console.warn('⚠️  Supabase env vars missing — check .env.local')
}

// Browser client (respects RLS, safe to use in components)
export const supabase = createClient(url, anon)

// Server-only admin client (bypasses RLS — only in API routes / Edge Functions)
export const supabaseAdmin = () =>
  createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
  })
```

---

## STEP 4 — WIRE THE LIVE DATA HOOKS

### 4A. Articles / SEO Content Hook

Create `src/hooks/useArticles.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useArticles() {
  const [published, setPublished] = useState(0)
  const [pending,   setPending]   = useState(0)
  const [trend,     setTrend]     = useState<{day:string,created:number,published:number}[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const [pub, pend, trendData] = await Promise.all([
        supabase.from('articles').select('id', { count: 'exact', head: true })
          .eq('status', 'published'),
        supabase.from('articles').select('id', { count: 'exact', head: true })
          .eq('status', 'pending_review'),
        supabase.from('articles').select('created_at, status')
          .gte('created_at', new Date(Date.now() - 14*24*60*60*1000).toISOString())
          .order('created_at', { ascending: true }),
      ])

      setPublished(pub.count ?? 0)
      setPending(pend.count ?? 0)

      // Group by day
      if (trendData.data) {
        const byDay: Record<string, {created:number,published:number}> = {}
        trendData.data.forEach(a => {
          const day = a.created_at.slice(0, 10)
          if (!byDay[day]) byDay[day] = { created: 0, published: 0 }
          byDay[day].created++
          if (a.status === 'published') byDay[day].published++
        })
        setTrend(
          Object.entries(byDay).map(([day, v]) => ({
            day: day.slice(5).replace('-', '/'),
            ...v
          }))
        )
      }
      setLoading(false)
    }
    load()

    // Real-time subscription
    const sub = supabase.channel('articles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, load)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  return { published, pending, trend, loading }
}
```

### 4B. Conversation / Bot Hook

Create `src/hooks/useConversations.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type ConvOutcome = {
  uitkomst: string
  count: number
  avg_bot: number
  avg_sentiment: number
}

export function useConversations() {
  const [total,    setTotal]    = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [outcomes, setOutcomes] = useState<ConvOutcome[]>([])
  const [trend,    setTrend]    = useState<{day:string,score:number}[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('conversation_analyses')
        .select('uitkomst, bot_score, sentiment_score, analyse_datum')
        .order('analyse_datum', { ascending: false })

      if (!data) return
      setTotal(data.length)

      const withScore = data.filter(d => d.bot_score)
      setAvgScore(
        withScore.length
          ? parseFloat((withScore.reduce((s,d)=>s+d.bot_score,0)/withScore.length).toFixed(1))
          : 0
      )

      // Group outcomes
      const oc: Record<string,{count:number,bot:number[],sent:number[]}> = {}
      data.forEach(d => {
        const k = d.uitkomst || 'unknown'
        if (!oc[k]) oc[k] = { count:0, bot:[], sent:[] }
        oc[k].count++
        if (d.bot_score)       oc[k].bot.push(d.bot_score)
        if (d.sentiment_score) oc[k].sent.push(d.sentiment_score)
      })
      setOutcomes(
        Object.entries(oc).map(([uitkomst, v]) => ({
          uitkomst,
          count: v.count,
          avg_bot: v.bot.length ? parseFloat((v.bot.reduce((a,b)=>a+b,0)/v.bot.length).toFixed(1)) : 0,
          avg_sentiment: v.sent.length ? parseFloat((v.sent.reduce((a,b)=>a+b,0)/v.sent.length).toFixed(1)) : 0,
        })).sort((a,b)=>b.count-a.count)
      )
      setLoading(false)
    }
    load()
  }, [])

  return { total, avgScore, outcomes, trend, loading }
}
```

### 4C. Agent Activity Hook

Create `src/hooks/useAgents.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type AgentStat = {
  name: string
  runs: number
  errors: number
  last_run: string
}

export function useAgents() {
  const [agents,  setAgents]  = useState<AgentStat[]>([])
  const [total,   setTotal]   = useState(0)
  const [errors,  setErrors]  = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('agent_logs')
        .select('agent_name, log_level, created_at')
        .order('created_at', { ascending: false })
        .limit(500)

      if (!data) return

      const byAgent: Record<string,AgentStat> = {}
      data.forEach(log => {
        const n = log.agent_name
        if (!byAgent[n]) byAgent[n] = { name:n, runs:0, errors:0, last_run:log.created_at }
        byAgent[n].runs++
        if (log.log_level === 'error') byAgent[n].errors++
      })

      const list = Object.values(byAgent).sort((a,b)=>b.runs-a.runs)
      setAgents(list)
      setTotal(Object.keys(byAgent).length)
      setErrors(list.reduce((s,a)=>s+a.errors,0))
      setLoading(false)
    }
    load()

    // Poll every 60s
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  return { agents, total, errors, loading }
}
```

### 4D. GHL Pipeline Hook

Create `src/hooks/useGhl.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useGhl() {
  const [leads,   setLeads]   = useState<any[]>([])
  const [stages,  setStages]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const triggerSync = async () => {
    await supabase.functions.invoke('ghl-sync')
    load()
  }

  async function load() {
    const [leadsRes, stagesRes] = await Promise.all([
      supabase.from('ghl_leads').select('*').eq('status', 'open').order('ghl_created_at', { ascending: false }),
      supabase.from('ghl_pipeline_stages').select('*').order('volgorde'),
    ])
    if (leadsRes.data)  setLeads(leadsRes.data)
    if (stagesRes.data) setStages(stagesRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { leads, stages, loading, triggerSync }
}
```

### 4E. Meta Ads Hook

Create `src/hooks/useMetaAds.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCplStatus } from '@/lib/utils'

export function useMetaAds() {
  const [ads,        setAds]        = useState<any[]>([])
  const [totalSpend, setTotalSpend] = useState(0)
  const [avgCpl,     setAvgCpl]     = useState(0)
  const [alertCount, setAlertCount] = useState(0)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('ads')
        .select('*')
        .eq('country_code', 'NL')
        .order('spend', { ascending: false })

      if (!data) return
      setAds(data)

      const withSpend = data.filter(a => a.spend)
      setTotalSpend(withSpend.reduce((s,a)=>s+(a.spend||0),0))

      const withCpl = data.filter(a => a.cpl && a.spend > 50)
      setAvgCpl(withCpl.length ? withCpl.reduce((s,a)=>s+a.cpl,0)/withCpl.length : 0)

      setAlertCount(data.filter(a => getCplStatus(a.cpl, a.spend) === 'slecht').length)
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 10 * 60_000)
    return () => clearInterval(interval)
  }, [])

  return { ads, totalSpend, avgCpl, alertCount, loading }
}
```

---

## STEP 5 — WIRE HOOKS INTO DASHBOARD PAGE

Update `src/app/page.tsx` to use live data:

```typescript
'use client'
import { useArticles }      from '@/hooks/useArticles'
import { useConversations } from '@/hooks/useConversations'
import { useAgents }        from '@/hooks/useAgents'
import { useMetaAds }       from '@/hooks/useMetaAds'
import { useGhl }           from '@/hooks/useGhl'
import { KpiCard }          from '@/components/ui/KpiCard'
import { Topbar }           from '@/components/layout/Topbar'

export default function Dashboard() {
  const articles = useArticles()
  const convs    = useConversations()
  const agents   = useAgents()
  const ads      = useMetaAds()
  const ghl      = useGhl()

  return (
    <>
      <Topbar title="Command Center" subtitle="Ad → Lead → Appointment → Deal" />
      <div className="content">
        <div className="kpi-strip">
          <KpiCard
            label="Published Articles"
            value={articles.published}
            delta="↑ Live from Supabase"
            deltaDir="up"
            loading={articles.loading}
            hot={articles.published >= 250}
          />
          <KpiCard
            label="Bot Conversations"
            value={convs.total}
            delta={`${convs.outcomes.find(o=>o.uitkomst==='gewonnen')?.count||0} won`}
            deltaDir="up"
            loading={convs.loading}
          />
          <KpiCard
            label="Avg Bot Score"
            value={`${convs.avgScore}/10`}
            delta={convs.avgScore >= 7 ? '↑ Good' : '⚠ Needs work'}
            deltaDir={convs.avgScore >= 7 ? 'up' : 'neu'}
            loading={convs.loading}
          />
          <KpiCard
            label="Active Agents"
            value={agents.total}
            delta={agents.errors > 0 ? `⚠ ${agents.errors} errors` : '↑ 0 errors'}
            deltaDir={agents.errors > 0 ? 'down' : 'up'}
            loading={agents.loading}
          />
          <KpiCard
            label="Open Leads"
            value={ghl.leads.length}
            delta="GHL pipeline"
            deltaDir="neu"
            loading={ghl.loading}
            hot={ghl.leads.length >= 20}
          />
        </div>
        {/* Add chart components here using hooks data */}
      </div>
    </>
  )
}
```

---

## STEP 6 — API ROUTE FOR GHL SYNC

Create `src/app/api/ghl-sync/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'
const GHL_KEY     = process.env.GHL_API_KEY!
const LOCATION_ID = process.env.GHL_LOCATION_ID!

const headers = {
  'Authorization': `Bearer ${GHL_KEY}`,
  'Version': GHL_VERSION,
  'Content-Type': 'application/json',
}

export async function POST() {
  try {
    const db = supabaseAdmin()

    // 1. Find the Sales pipeline
    const pipelinesRes = await fetch(
      `${GHL_BASE}/opportunities/pipelines?locationId=${LOCATION_ID}`,
      { headers }
    )
    const pipelines = await pipelinesRes.json()
    const pipelineName = process.env.GHL_PIPELINE_NAME || 'Sales'
    const pipeline = pipelines.pipelines?.find((p: any) =>
      p.name.toLowerCase() === pipelineName.toLowerCase()
    )
    if (!pipeline) throw new Error(`Pipeline "${pipelineName}" not found`)

    // 2. Upsert stages
    if (pipeline.stages) {
      await db.from('ghl_pipeline_stages').upsert(
        pipeline.stages.map((s: any, i: number) => ({
          stage_id:   s.id,
          stage_naam: s.name,
          volgorde:   i,
          synced_at:  new Date().toISOString(),
        })),
        { onConflict: 'stage_id' }
      )
    }

    // 3. Fetch leads (paginate)
    let page = 1, all: any[] = []
    while (true) {
      const res = await fetch(
        `${GHL_BASE}/opportunities/search?location_id=${LOCATION_ID}&pipeline_id=${pipeline.id}&limit=100&page=${page}`,
        { headers }
      )
      const data = await res.json()
      if (!data.opportunities?.length) break
      all = [...all, ...data.opportunities]
      if (all.length >= data.total) break
      page++
    }

    // 4. Upsert leads
    if (all.length) {
      await db.from('ghl_leads').upsert(
        all.map((o: any) => ({
          contact_id:          o.contact?.id || o.id,
          opportunity_id:      o.id,
          pipeline_stage_naam: o.pipelineStage?.name,
          contact_naam:        o.contact?.name,
          phone_number:        o.contact?.phone,
          email:               o.contact?.email,
          opportunity_value:   o.monetaryValue || 0,
          status:              o.status === 'won' ? 'gewonnen' : o.status === 'lost' ? 'verloren' : 'open',
          source:              o.source,
          ghl_created_at:      o.createdAt,
          synced_at:           new Date().toISOString(),
        })),
        { onConflict: 'contact_id' }
      )
    }

    return NextResponse.json({ success: true, synced: all.length })
  } catch (error: any) {
    console.error('GHL sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

## STEP 7 — VALIDATION CHECKLIST

After completing each step, run:

```bash
# Check no TypeScript errors
npx tsc --noEmit

# Start dev server and check for runtime errors
npm run dev

# Verify Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
sb.from('agent_logs').select('id', { count: 'exact', head: true }).then(r => console.log('✓ Supabase connected, agent_logs:', r.count, 'rows'))
"

# Verify GHL key works
curl -s -H "Authorization: Bearer $GHL_API_KEY" -H "Version: 2021-07-28" \
  "https://services.leadconnectorhq.com/locations/$GHL_LOCATION_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✓ GHL connected:', d.get('name','?'))"
```

---

## STEP 8 — COMMON FIXES

**"Cannot read properties of undefined (reading 'from')"**
→ Supabase URL or key is wrong or missing in `.env.local`

**"JWT expired" or 403 from Supabase**
→ Regenerate the anon key in Supabase → Settings → API

**GHL returns 401**
→ Token expired or wrong Location ID — regenerate in GHL → Settings → API Keys

**Meta API returns "Invalid OAuth token"**
→ Token expired — regenerate via System User in Meta Business Manager

**Charts not updating after data loads**
→ Charts need `key={dataVersion}` prop or explicit `destroy() + rebuild()` on data change

**Dark mode: colors look wrong after theme switch**
→ Charts must be destroyed and rebuilt on theme change — use `useEffect` watching `theme`

---

## LIVE EDIT COMMANDS (run directly in Claude Code)

```bash
# Edit a specific component
cat src/components/ui/KpiCard.tsx        # read first
# then edit with Edit tool

# Add a new widget to dashboard
# 1. Create component in src/components/dashboard/
# 2. Import and add to src/app/page.tsx
# 3. Add hook in src/hooks/ if new data needed

# Rebuild after changes
npm run build 2>&1 | tail -20

# Push to GitHub (auto-deploys to Digital Ocean)
git add -A && git commit -m "fix: [description]" && git push origin main

# Check deployment logs on Digital Ocean
# → App → Activity → latest deploy → View Logs
```
