---
slug: onboarding/your-first-week
lang: en
title: Your first week
summary: A day-by-day checklist that takes a brand-new admin from zero to a fully wired-up CRM in five working days.
tags: [onboarding, getting-started, admin, checklist]
related: [onboarding/welcome, onboarding/create-organization, onboarding/invite-team, onboarding/first-contact]
updated: 2026-04-25
---

# Your first week

This is a five-day checklist. It assumes you're the first admin
in a brand-new organisation. None of this is mandatory — but
following it lands you in a position where the CRM is doing real
work for you instead of sitting empty.

## Day 1 — bootstrap the tenant

- [ ] Sign in at the brand site with your admin email.
- [ ] Complete `/onboarding` — name your organisation, pick a
      display name. You become its admin.
- [ ] Visit `/settings` → set your industry
      ([philanthropy / real-estate / hospitality](onboarding/pick-industry)).
- [ ] Open `/api/health` in the browser. Expect 200 + a sub-100ms
      database check. If you get 503, the DB env vars aren't
      set — fix before going further.

**End of day 1**: tenant exists, you're admin, env is healthy.

## Day 2 — invite your team

- [ ] `/settings/users` → invite each teammate by email.
      Pick the right role:
      - Admin for anyone who needs to invite/edit users
      - Manager for the operational team (sales, ops, comms)
      - Viewer for board members, auditors, read-only execs
- [ ] Decide on per-section restrictions where useful — e.g.
      board members typically only need `dashboard`, `reports`,
      `impact`. Set their `dashboardSections` accordingly.
- [ ] Have at least one teammate log in successfully so you've
      proven the invite flow end-to-end.

**End of day 2**: team can sign in. Each person sees the right
sidebar.

## Day 3 — set up your data shape

- [ ] `/settings/pipelines` → review the default pipeline for
      your industry. Edit stage names to match your actual
      sales/donor/booking process. Add a second pipeline if you
      have distinct flows (e.g. "Major gifts" vs "Recurring
      donors").
- [ ] If you're real-estate or hospitality:
      - `/settings/property-taxonomy` → customise districts,
        property types, flags for your market.
- [ ] Pick how you'll track tasks. Most teams use:
      - `/calendar` for scheduled events + meetings
      - Activity entries on contacts for ad-hoc follow-ups
      - `/automations` for recurring "if X then create task" rules

**End of day 3**: pipelines + taxonomy match how your team
actually works.

## Day 4 — connect external tools

- [ ] `/integrations` → connect at least one of:
      - Google (Gmail + Calendar) — drives the `/email` and
        `/calendar` pages
      - Twilio (SMS + WhatsApp) — drives `/sms`
      - DocuSign / HelloSign — drives `/e-signatures` and
        `/transactions`
- [ ] Generate an API key at `/settings/api-keys` if you have
      external tools that need to read/write CRM data
      programmatically (Zapier, n8n, custom scripts).
- [ ] Set up a webhook at `/settings/webhooks` if you want to
      push CRM events to Slack, Discord, or your own endpoint.

**End of day 4**: external tools are wired up. Inbound email and
calendar events flow into the CRM automatically.

## Day 5 — load real data + first automation

- [ ] Bulk-import your contacts via `/contacts` → CSV upload.
      Match the columns to the form fields; AI auto-enrichment
      fills industry / ICP fit / summary in the background.
- [ ] Create a few real deals in `/deals` so you can see them
      flow on the [kanban board](features/kanban).
- [ ] Build your first automation in `/automations`. Common
      starter rules:
      - "Stage = stale (no update in 14 days) → email the deal owner"
      - "New contact tagged 'donor' → add to mailing list"
      - "Deal value > €10,000 → notify Slack"

**End of day 5**: real data is in. The CRM is doing automated
work for you.

## Beyond week 1

Once you're past the basics:

- **Set up the AI assistant** if you haven't already — the
  in-app chat at `/assistant` knows how every feature works
  and answers questions in plain language. Operator setup is in
  `docker/ollama/README.md`.
- **Review your audit log weekly** — `/audit` shows every
  mutation in your tenant. Verify the
  [hash chain](features/audit) is intact at `/api/admin/audit/verify`
  monthly.
- **Run a GDPR drill** — pick a real contact's email, run
  through the `/gdpr` admin export + erasure flows on a test
  copy. You want to be confident in the procedure before a
  real DSAR lands.

## Where to go next

- **[Roles & permissions](concepts/roles)** — deep dive on
  what each role can do.
- **[Tenancy & data isolation](concepts/tenancy)** — how
  Philly keeps your data separate from other organisations.
- **[GDPR self-service](concepts/gdpr)** — operator and
  admin-led data-rights flows.
