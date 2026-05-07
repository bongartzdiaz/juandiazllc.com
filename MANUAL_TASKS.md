# Manual tasks — things Claude can't do from the repo

Every item here is a one-time human action that unblocks code that's
already shipped. Strike through (`~~...~~`) when done.

## Calendar push-sync (Bundle D, 2026-05-07)

Adds `CalendarChannel` table + provider webhooks for real-time event
notifications. Builds on Bundle A's OAuth integration.

- [ ] Run `npx prisma migrate dev --name calendar_push_sync` (creates
      the `CalendarChannel` table). Idempotent — safe to re-run.
- [ ] Add a renewal cron job hitting an internal renewal route — cadence
      ~every hour. The library function is `listDueForRenewal()` →
      `renew(channelId, webhookBaseUrl)`. The cron route + auth wrapper
      is the next bundle (deferred so Bundle D ships smaller).
- [ ] Verify `NEXT_PUBLIC_APP_URL` is set in Vercel — this is the base
      URL we hand to providers as the webhook target. Without it,
      push-sync subscribe is a no-op (the OAuth callback logs a warning
      but doesn't fail).
- [ ] Microsoft only: register `notificationUrl` and (optionally)
      `lifecycleNotificationUrl` in your Entra app's Authentication
      panel if your tenant policy requires explicit URL allowlisting.
      Most tenants don't.
- [ ] Smoke test: connect a calendar via the wizard, verify a
      `CalendarChannel` row appears with `status='active'`. Add an event
      in your provider's UI and watch logs for
      `[calendar webhook google] notification accepted` or
      `[calendar webhook ms] batch processed`.



## Stripe billing — Checkout + Customer Portal + webhooks (Bundle B, 2026-05-06)

The billing routes + settings UI are wired but no charge can be
created until Stripe products + webhook are configured. The checkout
route returns 503 with a clear message until env vars land.

### Stripe dashboard setup

- [ ] Create / open a Stripe account (use Test mode while staging).
- [ ] Products → New product. Recommended catalogue:
  - **Starter** — €49/seat/month recurring (EUR). Note the Price ID
    (`price_…`).
  - **Professional** — €79/seat/month recurring (EUR). Note the Price ID.
  - Quantity-based — leave price as "per unit" and let Checkout
    multiply by `quantity` from the API call.
- [ ] Customer Portal → enable: Subscriptions cancellation, Subscription
      update (allow plan switching + quantity), Invoice history,
      Payment method.

### Webhook setup

- [ ] Webhooks → Add endpoint:
      `https://app.lucen.ai/philly/api/billing/webhook` (replace with
      production domain).
- [ ] Subscribe to events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.paid`
- [ ] Copy the signing secret (`whsec_…`).

### Vercel env vars

- [ ] `STRIPE_SECRET_KEY` — Live or Test secret key (sk_live_… / sk_test_…)
- [ ] `STRIPE_WEBHOOK_SECRET` — `whsec_…` from the endpoint above
- [ ] `STRIPE_PRICE_STARTER` — Price ID for Starter
- [ ] `STRIPE_PRICE_PROFESSIONAL` — Price ID for Professional
- [ ] `NEXT_PUBLIC_APP_URL` — needed for Stripe success/cancel URLs

### Local dev

- [ ] Install Stripe CLI: <https://docs.stripe.com/stripe-cli>
- [ ] `stripe login` (one-time)
- [ ] `stripe listen --forward-to http://localhost:3000/philly/api/billing/webhook`
      — outputs a temporary webhook secret. Use it in `.env.local` as
      `STRIPE_WEBHOOK_SECRET` while developing.

### Smoke test

1. Visit `/philly/settings/billing` while signed in as admin.
2. Click "Start free trial" on Professional → land on Stripe Checkout.
3. Use card `4242 4242 4242 4242` (test mode) → submit.
4. Land back on `/settings/billing?session_id=…` with success banner.
5. Verify webhook fired by checking the `Subscription` row appeared in
   the DB with `status='trialing'`.
6. Click "Manage subscription" → land on Stripe Customer Portal.

## Calendar OAuth — Google + Microsoft (Bundle A, 2026-05-06)

The wizard Step 5 + connection routes are wired but no provider can
actually authorise until you register the OAuth app and set credentials.
The start route returns 503 with a clear message until the env vars
land.

### Google Calendar

- [ ] Create / open a project at <https://console.cloud.google.com>.
- [ ] APIs & Services → Library → enable **Google Calendar API**.
- [ ] Credentials → Create credentials → **OAuth client ID** → Web
      application. Add authorised redirect URI:
      `https://app.lucen.ai/philly/api/calendar/oauth/callback`
      (replace with your production domain; add `http://localhost:3000/...`
      for local dev).
- [ ] OAuth consent screen → set User Type to External (or Internal
      if Workspace). Scopes:
      `openid email profile https://www.googleapis.com/auth/calendar.readonly`.
      Add test users until verification is complete.
- [ ] Set Vercel env vars:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`

### Microsoft / Outlook

- [ ] Register an app at <https://entra.microsoft.com> → Identity →
      Applications → App registrations → New registration.
- [ ] Supported account types: choose "Accounts in any organizational
      directory and personal Microsoft accounts" for the broadest
      audience (matches `MS_OAUTH_TENANT=common` default), or pin to
      a single tenant for SSO-only flows.
- [ ] Redirect URI: Web →
      `https://app.lucen.ai/philly/api/calendar/oauth/callback`
- [ ] API permissions → Microsoft Graph → Delegated:
      `User.Read`, `Calendars.Read`, `offline_access`, `openid`,
      `profile`, `email`. Grant admin consent.
- [ ] Certificates & secrets → New client secret. Copy the value
      (only shown once).
- [ ] Set Vercel env vars:
  - `MS_OAUTH_CLIENT_ID`
  - `MS_OAUTH_CLIENT_SECRET`
  - `MS_OAUTH_TENANT` (optional — defaults to `common`)

### Database

- [ ] Run `npx prisma migrate deploy` after pulling — adds the
      `CalendarConnection` table. Or for first-time on a live DB:
      `npx prisma migrate dev --name calendar_connections` to create
      the migration folder, then commit it.

### Smoke test

1. Visit `/philly/onboarding/calendar` while signed in.
2. Click "Connect Google Calendar" → consent at Google → land back on
   the wizard with a green "Google Calendar connected." badge.
3. Click "Disconnect" → confirm → row flips to status='revoked'.
4. Reconnect — should re-bind cleanly (upsert by `(userId, provider)`).

## Newsletter double opt-in (PR 715d102)

- [ ] Run the updated migration in Supabase SQL editor (brand project):
      `supabase/brand/newsletter_subs.sql`. Safe to re-run —
      alter-if-not-exists handles the existing table.
- [ ] Add Vercel env vars (production + preview):
  - `RESEND_API_KEY` — from resend.com dashboard
  - `NEWSLETTER_FROM` — e.g. `noreply@juandiazllc.com`
  - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings
    (the service role, NOT the anon key — keep it out of the browser)
- [ ] Verify the `noreply@juandiazllc.com` sender domain in Resend
      (SPF + DKIM records on the DNS zone).
- [ ] Smoke test: subscribe with a real address, click the link,
      verify `confirmed_at` is stamped and `confirm_token` is null in
      the `newsletter_subs` row.

## Cookie consent + analytics (PR f1b4a4a / earlier)

- [ ] Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to `juandiazllc.com` in Vercel.
      Optional: `NEXT_PUBLIC_PLAUSIBLE_HOST` if self-hosting.
- [ ] Create the Plausible site (plausible.io or self-host) so the
      domain matches the env var.

## Impressum content (PR f1b4a4a)

- [ ] Confirm the Impressum copy is legally sufficient for your DE
      audience. Current content uses "address on written request" —
      some lawyers prefer a concrete registered agent street address.
      If needed, add to `lib/i18n/dict.ts` under `impressum.p.company`
      in all 4 locales.

## Brand assets (from earlier sessions)

- [ ] Drop real portrait at `/public/me/portrait.jpg`. Used in `Person`
      and `Organization` JSON-LD on every page, plus the OG card on
      `/about`. The path is centralised in `lib/seo/branding.ts`
      (`AUTHOR_IMAGE_URL` / `AUTHOR_IMAGE_PATH`). Until the file lands,
      the URL 404s — Google Search will skip the image but won't error;
      OG cards on socials will render without a preview image. To
      activate the SVG fallback (`/icon-512.svg`) in the meantime, swap
      `AUTHOR_IMAGE_URL` to `AUTHOR_IMAGE_FALLBACK_URL` in
      `lib/seo/branding.ts`.
- [ ] Drop real hero image at `/public/hero.jpg` (used on home hero
      fallback layer).

## Translation retry (rate-limited)

- [ ] After 10pm UTC reset, re-run the chrome-translation agent for
      `/login`, `/work` (index + slug), `/insights` (index + slug +
      tag), `/sectors` (index + slug), `/signals` (index + slug).

## Lighthouse CI

- [ ] Confirm `.github/workflows/lighthouse.yml` runs on production
      pushes to main (Vercel Preview Protection auth-walls previews,
      so PR runs were moved to main-only).

## DEUS / LucenAI — multi-tenant readiness (May 2026 sprint)

Pre-deploy actions for the seats / invites / GDPR / CSV-import bundles.

- [ ] Run Prisma migrations against the production DB:
  ```
  npx prisma migrate dev --name seats_and_invites
  npx prisma migrate dev --name user_soft_delete
  ```
  Or in production, `npx prisma migrate deploy` after the schema is on the production branch.
- [ ] Add Vercel env vars (production + preview) for the philly project:
  - `RESEND_API_KEY` — invite emails. Without this, invites are created
    but no email is sent (UI flash banner explains the fallback).
  - `INVITE_FROM_EMAIL` — defaults to `noreply@lucen.ai`. Verify the
    sender domain in Resend (SPF + DKIM on the lucen.ai DNS zone).
  - `NEXT_PUBLIC_APP_URL` — defaults to `https://app.lucen.ai`.
    Set to whatever the live customer URL is so accept-invite links
    resolve correctly.
  - `STRIPE_SECRET_KEY` — health-endpoint check + future billing webhook.
    Optional; absence is reported as "not configured", not "down".
- [ ] Confirm legal entity for the DPA / ToS / Privacy Policy. Drafts
      live in `_drafts/legal/*.md` with `[KvK TBD]` and `[address TBD]`
      placeholders. "Juan Diaz LLC" reads as US-style; if it's actually
      an NL BV / eenmanszaak, fill in the correct entity + KvK number.
- [ ] Smoke test on staging: invite teammate → accept → seat counter
      ticks → DSAR export downloads → soft-delete → 410 on next login.

## DEUS-SHARED mirror setup

`bongartzdiaz/DEUS-SHARED` is the mirror target for downstream
distribution. Source of truth stays in `bongartzdiaz/juandiazllc.com`.
Sync workflow lives at `.github/workflows/sync-deus-shared.yml`.

- [ ] Create the target repo `bongartzdiaz/DEUS-SHARED` (private,
      empty — no README/license/.gitignore so the first push isn't
      a non-fast-forward conflict).
- [ ] Generate a fine-grained PAT at
      [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):
  - Resource owner: `bongartzdiaz`
  - Repository access: only select `bongartzdiaz/DEUS-SHARED`
  - Permissions → Repository: `Contents: Read and write`
  - Expiration: 90 days (set a calendar reminder to rotate)
- [ ] Add the PAT as a repo secret named `DEUS_SHARED_PAT` at
      `Settings → Secrets and variables → Actions → New repository secret`
      in `bongartzdiaz/juandiazllc.com`.
- [ ] Trigger the workflow manually the first time:
      `Actions → Sync to DEUS-SHARED → Run workflow → main`.
      Confirm `bongartzdiaz/DEUS-SHARED` now mirrors this repo.
- [ ] Future syncs run automatically on every push to `main`.

**Rotation note:** when the PAT expires, the workflow fails with
"DEUS_SHARED_PAT secret is not set" (or a 401 from GitHub). Generate
a new fine-grained PAT and update the secret — same scope as above.

## Testing gaps (CLAUDE.md priority)

- [ ] Zod validation schemas under `lib/philly/validation/` —
      highest ROI, no mocks needed.
- [ ] Dict key parity test — catches locales that silently fall
      back to English.
- [ ] `proxy.ts` CSRF tests — security-critical, untested.
- [ ] `lib/i18n/metadata.ts` tests — `buildAlternates`, `ogLocale`,
      `alternateOgLocales`.
