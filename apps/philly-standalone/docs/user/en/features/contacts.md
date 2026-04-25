---
slug: features/contacts
lang: en
title: Contacts
summary: The contacts page — grid, search, filter pills, AI auto-enrichment, the detail page with tabs for activity / notes / projects / deals.
tags: [features, contacts, crm-core]
related: [onboarding/first-contact, features/ai-attributes, features/deals, concepts/gdpr]
updated: 2026-04-25
---

# Contacts

The `/contacts` page is the primary directory for everyone your
organisation deals with. The data model is the same across
industries; only the type-pill labels change (donor vs buyer vs
guest, etc. — see [pick-industry](onboarding/pick-industry)).

## The page layout

- **KPI strip** at the top — total contacts, plus 3 industry-
  specific counts (e.g. partners / donors / stakeholders for
  philanthropy).
- **Toolbar** with free-text search + type-filter pills. Search
  matches across name, email, and company. Filter selections
  reflect into the URL so you can share a filtered view.
- **Grid of contact cards** — 3 per row on desktop, 1 on mobile.
  Each card shows avatar (initials), name, company, email, phone,
  and project count.

The grid renders synchronously in real-estate / hospitality
modes (demo data); in philanthropy mode it fetches live data
and shows a "Loading contacts…" banner above the grid while
the API is in flight.

## Creating a contact

Click **+ New contact** in the topbar (admins + managers only).
Fill in: name (required), email, phone, type, company, notes.

On submit:

1. The contact is saved + appears in the grid.
2. **AI auto-enrichment** kicks off in the background (if
   `ANTHROPIC_API_KEY` is set) — Claude infers industry, ICP fit
   score (0–100), and a one-line summary from the name + company
   + email domain. The card shows a small spinner until the
   call returns; status flips from `pending` to `complete`.
3. **Realtime broadcast** — every other open dashboard tab in
   your org refreshes the contact list.
4. **Audit log entry** — `entity: contact, action: create`.

## Bulk import

`/contacts` also has a CSV upload (admins + managers only).
Required columns match the create form. Each imported row runs
through the same auto-enrichment, throttled to ~10/sec to stay
under the AI rate limit.

Validation: blank emails are accepted (default `""`); blank
names reject the row; duplicate emails are rejected (the
contacts table treats email as a soft-unique within an org).

## The contact detail page

Click any card → `/contacts/[id]`. Layout:

- **Header card** — avatar, name, company, type badge, edit/save/cancel
  buttons, type-color background.
- **Tabs** — Overview | Activity | Emails | Notes | Projects | Deals
- **Overview tab** — basic fields (email, phone, company, notes)
  + AI-attribute display (industry, ICP score, summary).
- **Activity tab** — every interaction logged against this contact:
  notes added, deals linked, emails sent, calls made.
- **Emails tab** — Gmail-synced messages where this contact's
  email is the from-address or to-address.
- **Notes tab** — operator-authored timestamped notes; quick-add
  form at the top.
- **Projects tab** — projects this contact is associated with.
- **Deals tab** — deals where this contact is the linked counterparty.

## Inline editing

In the header, click **Edit** to switch to inline-edit mode.
Fields become editable; the Save button shows a spinner during
the PATCH and is disabled to prevent double-submits. Cancel
reverts.

Edit-mode is admin + manager only; viewers see the data but no
edit affordance.

## Search semantics

The free-text search in the toolbar:

- Matches contains-style (case-insensitive) across name, email,
  and company
- Debounced (250ms) so every keystroke doesn't hit the API
- URL-state — `?q=jane&type=donor` reflects the current filters

Combined filters work additively: type-pill `donor` + search
`acme` returns donors at companies matching "acme".

## Privacy & retention

Contact data is PII (see [concepts/gdpr](concepts/gdpr)):

- Scoped to your organisation; other orgs can never see it.
- Retention default: 3 years from last meaningful update —
  configurable per row's auto-purge in `lib/gdpr/pii-registry.ts`.
- Subject to admin-led data-subject erasure if the contact asks.
  The `/gdpr` admin page processes the request — finds every row
  referencing the email across Contact, Reservation, Volunteer,
  CallLog, SmsMessage, etc., hard-deletes them, and writes a
  proof-of-erasure log entry.

## Where to go next

- **[Add your first contact](onboarding/first-contact)** — the
  walk-through.
- **[AI contact attributes](features/ai-attributes)** — the
  auto-enrichment that runs after create.
- **[Deals](features/deals)** — link contacts to opportunities
  in motion.
- **[GDPR admin](features/gdpr)** — process data-subject
  requests for contacts.
