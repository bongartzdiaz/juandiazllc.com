# Operator env-vars walkthrough — DEUS launch

**Goal:** every production environment variable set, every third-party
account connected, in roughly two hours of focused work. Written so you
can do it from the top in one sitting with the password manager open
in the next tab.

**Deliverable at the end:** a complete `.env.production` file plus all
the same vars in Vercel's env panel for the live deploy.

Tick each box as you go. Items marked **(blocking)** prevent the
service from working at all until set; items marked **(graceful)**
just turn off a feature with a clear "not configured" message.

---

## 0 · Before you start

- [ ] Open a password manager (1Password, Bitwarden, whatever).
      Create a new vault item per third-party account so the secrets
      are searchable later.
- [ ] Open the Vercel project (production environment) in another tab.
- [ ] Confirm `NEXT_PUBLIC_APP_URL` is the URL the live customer will
      use — almost certainly `https://app.lucenai.eu` for the new
      Hetzner deploy, or `https://app.lucen.ai` if you keep the old
      domain. Pick one and stick with it; OAuth callbacks must match.

The whole walkthrough below assumes the canonical app URL is
`https://app.lucenai.eu`. Find-and-replace if it differs.

---

## 1 · Stripe (blocking — billing)

Time: 20 minutes.

- [ ] Sign in to <https://dashboard.stripe.com>.
- [ ] Toggle **Live mode** (top-right) once you're sure the test-mode
      smoke run from `MANUAL_TASKS.md` worked. For first-day launch,
      Test mode is fine if the customer agrees — switch to Live before
      the second customer.
- [ ] **Products → New product**. Create two:
  - **DEUS Starter** — recurring, EUR, €49 per unit per month, billing
    period 1 month. Note the price ID (`price_…`).
  - **DEUS Professional** — recurring, EUR, €79 per unit per month.
    Note the price ID.
- [ ] **Customer Portal → Settings**. Enable:
  - Subscription cancellation
  - Subscription update (allow plan switching + quantity)
  - Invoice history
  - Payment method
- [ ] **Developers → API keys → Standard keys**. Reveal and copy the
      live secret key (`sk_live_…`).
- [ ] **Developers → Webhooks → Add endpoint**:
  - URL: `https://app.lucenai.eu/philly/api/billing/webhook`
  - Subscribe to: `customer.subscription.created`,
    `customer.subscription.updated`, `customer.subscription.deleted`,
    `invoice.payment_failed`, `invoice.paid`
  - Copy the signing secret (`whsec_…`).

**Set in Vercel + `.env.production`:**

```
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_STARTER=price_…
STRIPE_PRICE_PROFESSIONAL=price_…
```

---

## 2 · Google Calendar OAuth (blocking — Google calendar)

Time: 15 minutes.

- [ ] <https://console.cloud.google.com> → create a new project named
      "DEUS production" (or reuse if one exists).
- [ ] **APIs & Services → Library** → enable **Google Calendar API**.
- [ ] **OAuth consent screen** → External (or Internal if Workspace).
      Fill the required fields:
  - App name: `DEUS by LucenAI`
  - User support email: `support@lucen.ai`
  - Developer contact: same
  - Scopes: add `openid email profile
    https://www.googleapis.com/auth/calendar.readonly`
  - Authorised domains: `lucenai.eu` (and `lucen.ai` if you keep it)
  - Test users: add yourself + Hash + the first customer's email
    until the app is verified.
- [ ] **Credentials → Create credentials → OAuth client ID** → Web
      application. Authorised redirect URI:
  `https://app.lucenai.eu/philly/api/calendar/oauth/callback`
- [ ] Copy the client ID and client secret.

**Set in Vercel + `.env.production`:**

```
GOOGLE_OAUTH_CLIENT_ID=…apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=…
```

---

## 3 · Microsoft Outlook OAuth (blocking — Microsoft calendar)

Time: 20 minutes.

- [ ] <https://entra.microsoft.com> → Identity → Applications →
      App registrations → New registration.
  - Name: `DEUS by LucenAI`
  - Supported account types: "Accounts in any organizational
    directory and personal Microsoft accounts"
  - Redirect URI: Web →
    `https://app.lucenai.eu/philly/api/calendar/oauth/callback`
- [ ] **API permissions → Add a permission → Microsoft Graph →
      Delegated permissions** → add: `User.Read`, `Calendars.Read`,
      `offline_access`, `openid`, `profile`, `email`.
      Click **Grant admin consent**.
- [ ] **Certificates & secrets → New client secret** (24 months).
      Copy the *value* (not the ID) immediately — it's only shown once.
- [ ] Note the **Application (client) ID** and **Directory (tenant) ID**
      from the Overview page.

**Set in Vercel + `.env.production`:**

```
MS_OAUTH_CLIENT_ID=…
MS_OAUTH_CLIENT_SECRET=…
MS_OAUTH_TENANT=common
```

(`MS_OAUTH_TENANT=common` is the right default for "any account
type"; only override if the customer requires single-tenant.)

---

## 4 · Resend (blocking — invite emails, Stripe receipts)

Time: 15 minutes (most of it waiting for DNS to propagate).

- [ ] <https://resend.com> → API Keys → Create API Key with **Full
      access**. Copy `re_…`.
- [ ] **Domains → Add domain** → `lucenai.eu` (or whatever your
      sending domain is). Resend gives you four DNS records to add —
      one MX, one TXT (SPF), two CNAME (DKIM).
- [ ] Add those records at your DNS registrar. Wait until the Resend
      dashboard shows all four green (usually 5-30 minutes).
- [ ] Send a test email from the Resend dashboard to your own inbox.
      Confirm it lands in inbox, not spam.

**Set in Vercel + `.env.production`:**

```
RESEND_API_KEY=re_…
INVITE_FROM_EMAIL=noreply@lucenai.eu
```

---

## 5 · Backblaze B2 (blocking — daily backups)

Time: 10 minutes.

- [ ] <https://www.backblaze.com> → sign in → **B2 Cloud Storage →
      Buckets → Create a Bucket**:
  - Name: `deus-backups-eu`
  - Region: `eu-central-003` (Amsterdam)
  - Files in bucket: Private
  - Default encryption: SSE-B2 (AES-256)
- [ ] **Lifecycle Settings** → keep prior versions for 30 days, then
      hide and delete after 60. Minimal retention without losing
      older recovery points.
- [ ] **App Keys → Add a New Application Key**:
  - Name: `deus-backup-cron`
  - Allow access to: `deus-backups-eu` only
  - Capabilities: `listFiles`, `readFiles`, `writeFiles`,
    `deleteFiles` (don't grant `listAllBucketNames`)
  - Note the **Application Key ID** and **Application Key**.

**Set on the Hetzner box** (in `/home/deus/.deus-backup-env`,
mode `0600`):

```
B2_KEY_ID=…
B2_APPLICATION_KEY=…
B2_BUCKET=deus-backups-eu
```

(These don't go in Vercel — only the Hetzner box runs backups.)

---

## 6 · Sentry (graceful — observability)

Time: 5 minutes.

- [ ] <https://sentry.io> → New Project → Next.js → name it `deus`.
- [ ] Copy the DSN.

**Set in Vercel + `.env.production`:**

```
SENTRY_DSN=https://…@…ingest.sentry.io/…
```

If you skip this, the app runs fine — observability just stays at the
journalctl + UptimeRobot level.

---

## 7 · Cron secret + app URL (blocking — calendar renewal cron)

Time: 2 minutes.

- [ ] Generate a 32-byte random secret. On any terminal:

      ```
      node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
      ```

- [ ] **Set in Vercel + `.env.production`:**

      ```
      CRON_SECRET=<the 43-char string from above>
      NEXT_PUBLIC_APP_URL=https://app.lucenai.eu
      ```

- [ ] Schedule the renewal cron. Two options:
  - **Vercel Cron** (if hosting on Vercel): add to `vercel.json`:

        ```json
        { "crons": [{
            "path": "/philly/api/calendar/cron/renew-channels",
            "schedule": "0 * * * *"
          }]
        }
        ```

  - **External scheduler** (Hetzner cron, GitHub Actions): hit
    `POST /philly/api/calendar/cron/renew-channels` hourly with header
    `X-Cron-Secret: <CRON_SECRET>`.

---

## 8 · Production database (blocking — schema)

Time: 5 minutes.

- [ ] Set the database URL in Vercel (or `.env.production`):

      ```
      DATABASE_URL=mysql://…
      ```

      (or `postgresql://…` if you've already cut over to Postgres-only
      per the Hetzner runbook)

- [ ] From your local machine with the production `DATABASE_URL`
      exported, run:

      ```
      npx prisma migrate deploy
      ```

      This applies every migration in `prisma/migrations/` against the
      production schema. Idempotent — safe if some have already run.

- [ ] Confirm the new tables exist:
  - `CalendarConnection`
  - `CalendarChannel`
  - `Subscription`
  - `Invite`
  - `User.deletedAt` column

---

## 9 · DNS (blocking — TLS certificates and OAuth callbacks)

Time: 5 minutes (plus 24h propagation buffer).

- [ ] At the DNS registrar for `lucenai.eu`:
  - `app.lucenai.eu` → A record pointing to the Hetzner box IP
  - `*.deus.lucenai.eu` → A record (same IP) — for the future
    multi-tenant subdomain pattern; harmless to set now.
  - TTL: 60 seconds for the next 48 hours, then bump back to 3600.
    Low TTL during cutover gives a tight rollback window.
- [ ] Add the Resend DNS records from §4 if you haven't already.

---

## 10 · Final verification (5 minutes)

- [ ] Visit `https://app.lucenai.eu/philly/api/health`. Should return
      JSON with `status: "ok"` and four green dependency checks
      (database, supabase_auth or lucia_db, stripe, email_provider).
- [ ] Visit `https://app.lucenai.eu/philly/onboarding/calendar` while
      signed in as yourself. Click "Connect Google Calendar". Complete
      the consent flow. You should land back with a green "Connected
      as you@…" badge.
- [ ] Repeat for Microsoft.
- [ ] Visit `https://app.lucenai.eu/philly/settings/billing`. Click
      "Start free trial" on Professional. Land on Stripe Checkout. Use
      card `4242 4242 4242 4242` (test mode) or a real card (live mode
      — refund yourself after).
- [ ] Disconnect both calendars. Confirm Stripe shows the subscription
      created.

If all four work, every blocking gate is closed.

---

## Summary — exhaustive list of env vars

```
# Auth & app URL
NEXT_PUBLIC_APP_URL=https://app.lucenai.eu
CRON_SECRET=<43-char base64url>

# Database
DATABASE_URL=mysql://...                  # or postgresql://...

# Stripe (billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...

# Google Calendar OAuth
GOOGLE_OAUTH_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=...

# Microsoft Outlook OAuth
MS_OAUTH_CLIENT_ID=...
MS_OAUTH_CLIENT_SECRET=...
MS_OAUTH_TENANT=common

# Email (Resend)
RESEND_API_KEY=re_...
INVITE_FROM_EMAIL=noreply@lucenai.eu

# Observability (optional)
SENTRY_DSN=https://...

# Backups — on the Hetzner box only, not in Vercel
B2_KEY_ID=...
B2_APPLICATION_KEY=...
B2_BUCKET=deus-backups-eu
```

Twelve env vars in Vercel, three more on the Hetzner box. That's
the entire blocking surface.
