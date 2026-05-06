---
name: doc-write
description: Schrijf README, architectuur-doc, API-doc, ADR (architecture decision record), of onboarding-gids. Stack-aware, doelgroep-aware (intern team, contractor, open-source). Werkt voor PT, HMB, funnel-app, Voltafy CAD repos. Gebruik wanneer Juan vraagt "schrijf docs voor X", bij open-sourcing, of bij contractor-handoff.
trigger: /doc-write
---

# /doc-write

Documentatie schrijven die mensen daadwerkelijk lezen — vermijd doc-bloat, maximaal nut per sectie.

## Usage
```
/doc-write <type> <onderwerp>
/doc-write <type> --audience <internal|contractor|open-source>
/doc-write <type> --depth <minimal|standard|comprehensive>
```

`<type>`:
- `readme` — repo-niveau README.md
- `architecture` — system-overview, components, data-flow
- `api` — API reference (endpoints, auth, errors)
- `adr` — architecture decision record (1 keuze, 1 doc)
- `onboarding` — voor nieuwe team-leden
- `contributing` — open-source contribution guide
- `changelog` — semantic-version changelog

## README template (repo-niveau)

```markdown
# <Repo naam>

<1-zin beschrijving — wat doet 'ie>

## Quick start

```bash
npm install
cp .env.example .env.local      # vul in: SUPABASE_*, OTP_*, MESSAGEBIRD_*
npm run dev                       # → http://localhost:3030
```

## What's inside

- **Stack:** Next.js 14, Tailwind, shadcn/ui, Supabase, Zod
- **Deploys to:** Vercel (`offerte-check.helpmijbesparen.nl`) of DO VPS
- **Status:** Productie

## Folder structure

```
app/
├── _components/     # cross-page UI (TrustBadge, Header)
├── _lib/            # business logic (otp, schema, messagebird)
├── api/             # Next.js API routes
└── offerte-check/   # main funnel pages

supabase/
└── migrations/      # DB schema in volgorde
```

## Core flows

1. **Lead-form submit** — `/offerte-check` → `OfferteCheckForm` → `/api/otp/send` → SMS → `/api/otp/verify` → `/api/offerte-check/submit` → Supabase + GHL
2. **Re-permission** — eenmalige email per lead; landing op `/?ref=repermission`

## Key conventions

- Schema in `_lib/schemas/<naam>.ts` — gedeeld client+server
- `"use client"` alleen waar interaction nodig
- Geen secrets in `NEXT_PUBLIC_*`
- Cookies: httpOnly + secure + sameSite=lax

## Deploy

Push naar `main` → Vercel auto-deploy. Voor VPS: zie `deploy/INSTALL-ON-SERVER.md`.

## Troubleshooting

| Symptoom | Probeer |
|---|---|
| `consent_required` 400 op /api/otp/send | Checkbox niet aangevinkt; check `bel_optin` in form |
| `messagebird_provider_error` | Check `MESSAGEBIRD_API_KEY` + sender-ID `HMB` registered |
| Build faalt op `jose` | `npm install jose@^5.9.6` |

## Reference
- Wet 1 juli 2026: [Rijksoverheid](https://...)
- DB-schema: zie `supabase/migrations/*.sql`
- Vault: [[10-Projecten/HMB/project_otp_telemarketing_2026_05_04]]
```

## Architecture doc template

```markdown
# Architecture: <System>

## Purpose
<1-2 zinnen — wat dit systeem oplost>

## Context-diagram

```
[ User ] → [ Next.js Funnel ] → [ Supabase ] → [ GHL ]
                ↓
         [ MessageBird (SMS) ]
```

## Components

### Funnel (Next.js)
- **Verantwoordelijkheid:** UI + form-flow + OTP-verificatie
- **Tech:** Next.js 14 App Router, Tailwind, RHF
- **Deploys op:** Vercel
- **Eigen state:** session-cookie voor A/B test-toewijzing

### Database (Supabase)
- **Verantwoordelijkheid:** persistent storage, auth, OTP-challenges, RLS
- **Tech:** Postgres 15 + RLS + pg_cron
- **Sleutel-tabellen:** `hmb_leads`, `otp_challenges`, `consent_audit`

### SMS-provider (MessageBird)
- **Verantwoordelijkheid:** OTP-delivery
- **Tech:** REST API
- **Backup:** WhatsApp via WABA (toekomst)

## Data-flow: lead-form submission

1. Browser → POST `/api/otp/send` → Supabase INSERT `otp_challenges` + MessageBird send-SMS
2. Browser ← 200 `{challenge_id, expires_at}`
3. User fills code → POST `/api/otp/verify`
4. Server: bcrypt-compare, mark `verified_at`, sign JWT
5. Browser submit form met JWT → `/api/offerte-check/submit`
6. Server validates JWT, calls Supabase edge fn `submit-offerte-check`
7. Edge fn: INSERT `hmb_leads` + push GHL + trigger DM Champ

## Failure modes

| Failure | Effect | Recovery |
|---|---|---|
| MessageBird down | OTP-send returns 502 | User toont "probeer over een paar minuten" |
| Supabase down | Form submit faalt | Vercel queues request? — TODO: build retry |
| GHL API timeout | Lead opgeslagen maar niet in CRM | edge fn schrijft `internal_note: 'ghl_sync_failed'` voor handmatig opvolgen |

## Trade-offs (waarom deze keuzes)

- **MessageBird vs Twilio:** MB heeft EU-data-center, NL alfanumerieke sender — Twilio iets duurder
- **Postgres-queue vs Bull/Redis:** geen Redis in stack, Postgres is makkelijker te beheren
- **JWT verify-token vs DB-row:** stateless = makkelijker te schalen, replay-protection via `used_at` kolom
```

## ADR template (Architecture Decision Record)

```markdown
# ADR-007: Use MessageBird for OTP-SMS instead of Twilio

**Date:** 2026-05-04  
**Status:** Accepted  
**Decider:** Juan

## Context

Per 1 juli 2026 vervalt soft opt-in voor telemarketing in NL. Elk gebeld nummer moet aantoonbare expliciete opt-in hebben. SMS-OTP is gouden standaard voor consent-bewijs.

We need a SMS-provider voor de OTP-flow op HMB Offerte-Check funnel.

## Decision

Use MessageBird as primary SMS-provider.

## Consequences

### Positive
- EU data-center (Amsterdam) — geen DPF/SCC-overhead
- NL alfanumerieke sender `HMB` zonder pre-approval
- €0.06/SMS — goedkoper dan Twilio (€0.08)
- Existing relatie via DM Champ (warm-aansluiten later)

### Negative
- Vendor lock-in op MessageBird-API (klein — fetch-wrapper isoleert)
- Geen built-in fraud-detection (Twilio Verify heeft dit)

## Alternatives considered

- **Twilio Verify** — meer features (fraud-block, attempts), duurder, US-default
- **WhatsApp Business OTP (Meta WABA)** — perfect voor doelgroep maar WABA-nummer pending (Meta-weigering 22 apr)
- **Custom SMS via Twilio** — geen reden om Verify te skippen

## Decision will be revisited if

- Conversion-loss bij OTP-stap >15%
- MessageBird-incident-rate >1%/maand
- WABA-nummer beschikbaar → switch naar WhatsApp-OTP als primary
```

## API doc template

```markdown
# POST /api/otp/send

Stuur OTP-code per SMS naar telefoonnummer.

## Auth
None (public endpoint, server-side validates origin).

## Headers
| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Origin` | yes (productie) | `https://offerte-check.helpmijbesparen.nl` |

## Request body
```ts
{
  phone: string;                    // "06...", "+31...", spaces OK
  consent_text_version: string;     // bv "hmb-otp-v1-2026-05-04"
  consent_accepted: true;           // server enforces; false → 400
  source: "hmb" | "eoc" | "eod";
  source_url: string;               // current page URL
}
```

## Responses

### 200 OK
```ts
{
  challenge_id: string;     // UUID
  expires_at: string;       // ISO 8601
  masked_phone: string;     // "+31 6 ** ** ** 78"
  provider: "messagebird" | "mock";
}
```

### 400 Bad Request
- `consent_required` — checkbox niet aangevinkt
- `consent_version_invalid` — version niet in registry
- `phone_format` — geen geldig E.164 NL mobiel

### 429 Too Many Requests
- `rate_limit_phone_minute` — max 1/min per nummer (`retry_after` in body)
- `rate_limit_phone_day` — max 5/24u per nummer
- `rate_limit_ip_day` — max 50/24u per IP

### 502 Bad Gateway
- `sms_provider` — MessageBird returned error

## Example
```bash
curl -X POST https://offerte-check.helpmijbesparen.nl/api/otp/send \
  -H "Content-Type: application/json" \
  -H "Origin: https://offerte-check.helpmijbesparen.nl" \
  -d '{"phone":"0612345678","consent_text_version":"hmb-otp-v1-2026-05-04","consent_accepted":true,"source":"hmb","source_url":"https://..."}'
```
```

## Hard rules

- **Audience-eerst** — schrijf voor wie 't leest, niet voor jezelf
- **Code-blocks runable** — copy-paste werkt
- **Last-verified-datum** — toon wanneer info nog geldig is
- **Geen prose-paragrafen** — bullets, tables, code
- **Update bij elke breaking change** — niet "later"

## Combineer met
- `/git-pr` — PR-description hergebruiken in changelog
- `/handoff` — onboarding-doc als basis voor handoff
- `/api-route` — output bevat al API-doc-stub
- `/runbook` — operationele kant van docs
