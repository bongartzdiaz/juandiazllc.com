# Dashboard — Live Connection Setup Guide
> Everything needed to wire the dashboard to real data for a new client.
> Works with any Next.js / HTML dashboard using the HMB design system.

---

## PART 1 — ALL KEYS YOU NEED

### 1A. Supabase (Database)

**Where to get them:**
→ https://supabase.com → New Project → Settings → API

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECTID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...   ← "anon public" key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...       ← "service_role" key (server only, never expose to browser)
```

**What each does:**
- `SUPABASE_URL` — the address of the database
- `ANON_KEY` — safe to use in the browser, respects Row Level Security (RLS)
- `SERVICE_ROLE_KEY` — bypasses RLS, only for server-side / Edge Functions

**DB settings to configure in Supabase:**
1. Authentication → Email: disable (dashboard doesn't need user auth)
2. Authentication → JWT expiry: set to 604800 (7 days) for longer sessions
3. API → Expose schemas: make sure `public` is listed
4. Database → Extensions: enable `pg_stat_statements` (performance monitoring)

---

### 1B. GoHighLevel — CRM & Pipeline

**Where to get them:**
→ GHL Account → Settings → Integrations → API Keys → Create API Key

```env
GHL_API_KEY=pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GHL_LOCATION_ID=xxxxxxxxxxxxxxxxxxxxxx       ← Sub-account ID
GHL_PIPELINE_NAME=Sales                      ← Exact pipeline name
GHL_CUSTOM_FIELD_FILTER=juan                 ← Custom field to filter leads by
```

**Where to find Location ID:**
→ GHL → Settings → Business Info → scroll to "Location ID"

**Pipeline name:**
→ GHL → CRM → Pipelines → copy the exact name (case-sensitive)

**API Version header** (add to every request):
```
Version: 2021-07-28
Base URL: https://services.leadconnectorhq.com
```

---

### 1C. Meta Ads (Facebook / Instagram)

**Where to get them:**
→ business.facebook.com → Business Settings → System Users → Generate Token

```env
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx        ← System User token
META_AD_ACCOUNT_ID=act_xxxxxxxxxx           ← Ad Account ID (starts with act_)
META_APP_ID=xxxxxxxxxx                       ← App ID (only needed for webhooks)
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx     ← App Secret
```

**Where to find Ad Account ID:**
→ Meta Ads Manager → top-left dropdown → your account → the number = your ID, prefix with `act_`

**Token permissions needed:**
- `ads_read` — read campaign data
- `ads_management` — pause/update campaigns (optional)
- `pages_read_engagement` — if reading page insights

**Token type:** Use a **System User** token (never expires) not a personal token.

---

### 1D. DM Champ — WhatsApp Bot

```env
DMCHAMP_WEBHOOK_SECRET=your_webhook_secret   ← Set this yourself, used to verify incoming webhooks
DMCHAMP_API_KEY=xxxxxxxx                     ← From DM Champ dashboard → API settings
DMCHAMP_CAMPAIGN_ID=xxxxxxxx                 ← Your active campaign ID
```

**Webhook URL to set in DM Champ:**
```
https://YOURPROJECTID.supabase.co/functions/v1/dmchamp-webhook
```

**Events to enable in DM Champ:**
- Contact Created
- Contact Tagged
- Conversation Started
- Message Received
- Appointment Booked

---

### 1E. Slack (Daily Updates)

**Where to get:**
→ api.slack.com → Create App → Incoming Webhooks → Activate → Add to Workspace

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXXXXX/XXXXXXX/XXXXXXXXXXXXXXXX
SLACK_CHANNEL=#dashboard-updates            ← Channel name to post in
```

---

### 1F. Anthropic (AI Agents)

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

→ console.anthropic.com → API Keys → Create Key

**Model to use:** `claude-sonnet-4-6` for complex agents, `claude-haiku-4-5-20251001` for fast/cheap tasks.

---

### 1G. Optional — Google Ads

```env
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxxxxxxxxxxxxx
GOOGLE_ADS_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-xxxxxxxx
GOOGLE_ADS_REFRESH_TOKEN=1//xxxxxxxxxxxxxxx
GOOGLE_ADS_CUSTOMER_ID=xxx-xxx-xxxx          ← Your account ID without dashes
```

---

## PART 2 — COMPLETE .env.local FILE

Copy this, fill in all values, save as `.env.local` in the project root.

```env
# ── SUPABASE ──────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECTID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ── GOhighlevel ────────────────────────────────
GHL_API_KEY=pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GHL_LOCATION_ID=xxxxxxxxxxxxxxxxxxxxxx
GHL_PIPELINE_NAME=Sales
GHL_CUSTOM_FIELD_FILTER=

# ── META ADS ───────────────────────────────────
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
META_AD_ACCOUNT_ID=act_xxxxxxxxxx
META_APP_ID=
META_APP_SECRET=

# ── DM CHAMP ───────────────────────────────────
DMCHAMP_API_KEY=
DMCHAMP_WEBHOOK_SECRET=
DMCHAMP_CAMPAIGN_ID=

# ── SLACK ──────────────────────────────────────
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx
SLACK_CHANNEL=#dashboard-updates

# ── AI ─────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-

# ── GOOGLE ADS (optional) ──────────────────────
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=

# ── APP ────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

---

## PART 3 — SUPABASE DATABASE SETUP

Run these SQL migrations in Supabase → SQL Editor to create the required tables.

### Step 1 — Core tables
```sql
-- Leads from GHL
CREATE TABLE IF NOT EXISTS ghl_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id text UNIQUE NOT NULL,
  opportunity_id text,
  pipeline_stage_naam text,
  stage_volgorde int DEFAULT 0,
  contact_naam text,
  phone_number text,
  email text,
  opportunity_value numeric DEFAULT 0,
  status text DEFAULT 'open' CHECK (status IN ('open','gewonnen','verloren','vervallen')),
  source text,
  tags jsonb DEFAULT '[]',
  ghl_created_at timestamptz,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Pipeline stages
CREATE TABLE IF NOT EXISTS ghl_pipeline_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id text UNIQUE NOT NULL,
  stage_naam text,
  volgorde int DEFAULT 0,
  leads_count int DEFAULT 0,
  total_value numeric DEFAULT 0,
  synced_at timestamptz DEFAULT now()
);

-- Agenda / appointments
CREATE TABLE IF NOT EXISTS agenda_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ghl_event_id text UNIQUE,
  contact_id text,
  medewerker_naam text,
  start_tijd timestamptz NOT NULL,
  eind_tijd timestamptz,
  status text DEFAULT 'gepland' CHECK (status IN ('gepland','afgerond','no_show','deal','geannuleerd')),
  deal_waarde numeric,
  notes text,
  synced_at timestamptz DEFAULT now()
);

-- Meta/Google ads
CREATE TABLE IF NOT EXISTS ads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name text,
  country_code text DEFAULT 'NL',
  funnel_id int,
  status_label text DEFAULT 'testfase' CHECK (status_label IN ('goed','testfase','slecht','gepauzeerd')),
  ctr numeric, cpl numeric, spend numeric,
  leads_count int DEFAULT 0,
  last_synced_at timestamptz DEFAULT now()
);

-- Articles / SEO content
CREATE TABLE IF NOT EXISTS articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title_tag text,
  h1 text,
  content text,
  status text DEFAULT 'pending_review',
  site_id uuid,
  created_at timestamptz DEFAULT now(),
  published_at timestamptz
);

-- Agent activity logs
CREATE TABLE IF NOT EXISTS agent_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name text NOT NULL,
  action text,
  log_level text DEFAULT 'info',
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- WhatsApp bot conversations
CREATE TABLE IF NOT EXISTS conversation_analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text,
  contact_name text,
  uitkomst text CHECK (uitkomst IN ('gewonnen','verloren','no_response','appointment_booked','nurture')),
  bot_score numeric,
  sentiment_score numeric,
  analyse_datum date DEFAULT CURRENT_DATE
);

-- DM Champ raw events
CREATE TABLE IF NOT EXISTS dmchamp_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text,
  contact_id text,
  phone_number text,
  contact_name text,
  summary text,
  raw_payload jsonb,
  ontvangen_op timestamptz DEFAULT now()
);

-- App settings (key/value store)
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);
```

### Step 2 — Enable Row Level Security
```sql
ALTER TABLE ghl_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon read (dashboard reads without auth)
CREATE POLICY "allow_read" ON ghl_leads FOR SELECT USING (true);
CREATE POLICY "allow_read" ON ads FOR SELECT USING (true);
CREATE POLICY "allow_read" ON conversation_analyses FOR SELECT USING (true);
CREATE POLICY "allow_read" ON agent_logs FOR SELECT USING (true);
```

---

## PART 4 — SUPABASE EDGE FUNCTIONS NEEDED

Deploy these 5 functions to make the dashboard fully live:

| Function | Trigger | What it does |
|---|---|---|
| `ghl-sync` | Every 30min (cron) | Pulls GHL leads + pipeline stages |
| `ghl-agenda-sync` | Every 30min (cron) | Pulls GHL appointments |
| `meta-ads-sync` | Every 10min (cron) | Pulls Meta Ads CPL / CTR / spend |
| `dmchamp-webhook` | On every WhatsApp event | Receives and stores bot conversations |
| `daily-slack-update` | Every day 8am (cron) | Sends daily Slack report |

**Deploy via Supabase CLI:**
```bash
supabase functions deploy ghl-sync
supabase functions deploy ghl-agenda-sync
supabase functions deploy meta-ads-sync
supabase functions deploy dmchamp-webhook --no-verify-jwt
supabase functions deploy daily-slack-update
```

**Set secrets (do this ONCE):**
```bash
supabase secrets set GHL_API_KEY=pit-xxx
supabase secrets set GHL_LOCATION_ID=xxx
supabase secrets set META_ACCESS_TOKEN=EAAx
supabase secrets set META_AD_ACCOUNT_ID=act_xxx
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/xxx
```

**Set up cron jobs in Supabase → Database → Extensions → pg_cron:**
```sql
SELECT cron.schedule('ghl-sync',        '*/30 * * * *', 'SELECT net.http_post(...)');
SELECT cron.schedule('meta-ads-sync',   '*/10 * * * *', 'SELECT net.http_post(...)');
SELECT cron.schedule('daily-slack',     '0 7 * * *',    'SELECT net.http_post(...)');
```

---

## PART 5 — DIGITAL OCEAN DEPLOYMENT

**Environment variables to set in Digital Ocean App Platform:**

Go to: App → Settings → App-Level Environment Variables → Edit

Add all variables from the `.env.local` file above. Mark `SERVICE_ROLE_KEY`, `GHL_API_KEY`, `META_ACCESS_TOKEN`, `ANTHROPIC_API_KEY` as **Encrypted**.

**Build settings:**
```
Build Command:  npm run build
Run Command:    npm start
HTTP Port:      3000
```

**Auto-deploy:** Link the GitHub repo → every push to `main` auto-deploys.

---

## PART 6 — CHECKLIST: IS EVERYTHING CONNECTED?

Run through this after setup:

- [ ] `.env.local` file exists with all keys filled in
- [ ] `npm run dev` starts without errors
- [ ] Supabase tables created (check Dashboard → Table Editor)
- [ ] GHL sync works: run `supabase functions invoke ghl-sync` → leads appear in table
- [ ] Meta sync works: run `supabase functions invoke meta-ads-sync` → ads appear
- [ ] DM Champ webhook URL set in DM Champ settings
- [ ] Slack test message received
- [ ] Dashboard shows live data (not demo data)
- [ ] Digital Ocean deployed and accessible on domain
- [ ] GitHub auto-deploy tested (push a change → it deploys)

---

## PART 7 — DNS SETTINGS (Domain)

In your domain registrar (Cloudflare / GoDaddy / TransIP):

```
Type    Name      Value                           TTL
A       @         Your-Digital-Ocean-IP           Auto
CNAME   www       your-app.ondigitalocean.app.    Auto
```

In Digital Ocean: App Settings → Domains → Add Domain → enter your domain.

SSL: Digital Ocean handles this automatically via Let's Encrypt.

---

*Save this file in the project root as `SETUP.md` for future reference.*
