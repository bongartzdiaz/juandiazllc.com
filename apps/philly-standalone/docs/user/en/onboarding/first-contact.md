---
slug: onboarding/first-contact
lang: en
title: Add your first contact
summary: How to create a contact, what gets auto-enriched in the background, and how the per-industry types differ.
tags: [onboarding, contacts, getting-started]
related: [features/contacts, onboarding/welcome, features/ai-attributes]
updated: 2026-04-25
---

# Add your first contact

A "contact" in Philly is any person or organization you do
business with. The form is the same across industries; the
**type** picker changes based on which industry your org runs.

## Where to do it

`/contacts` → click **+ New contact** in the topbar.

## Fields

The form asks for:

- **Name** (required)
- **Email** (optional but recommended — most automations key on it)
- **Phone** (optional)
- **Company** (optional)
- **Type** — depends on your industry:
  - Philanthropy: `partner` / `donor` / `stakeholder` / `beneficiary`
  - Real estate: `buyer` / `seller` / `tenant` / `landlord` / `investor`
  - Hospitality: `guest` / `vendor` / `partner` / `staff`
- **Notes** — free-text. Anything you want to remember about them.

Submit and the contact appears in the grid.

## What happens in the background

When you create a contact, a few things kick off automatically:

1. **AI auto-enrichment** — if `ANTHROPIC_API_KEY` is set, the
   server calls Claude in the background (via Vercel `after()`)
   to fill in:
   - **Industry** — best-guess based on company name + email domain
   - **ICP fit score** — 0–100 estimate of how well they match
     your typical customer
   - **Summary** — one-line description
   The contact's `aiAttributesStatus` flips from `pending` to
   `complete` when the LLM call returns. The UI shows a small
   spinner on the contact card while it's working.
2. **Real-time broadcast** — every other open dashboard tab in
   your org gets a `contact:created` event and refreshes the
   contact list.
3. **Audit log entry** — `entity: contact, action: create` with
   you as the actor.

## Importing many contacts at once

Use the **bulk import** form in the contacts page (CSV upload).
The CSV must have columns matching the form fields. Bulk import
runs the same auto-enrichment on every row, throttled by the
AI rate limit (~10 per second).

## Editing a contact

Click any contact in the grid to open the detail page. Click
**Edit** in the topbar to switch to inline-edit mode. The page
fetches activity, notes, projects, and deals related to this
contact.

The save button shows a spinner during the PATCH and is disabled
to prevent double-submits.

## What can be searched and filtered

The toolbar above the grid has:

- **Free-text search** across name, email, and company
- **Type filter** — pills at the top right of the toolbar
- URL state — filter selections are reflected in the URL so you
  can share a filtered view

## Privacy posture

Contact data is PII. It's:

- Scoped to your organization (other orgs can never see it)
- Auto-purged 3 years after creation if the row hasn't been
  touched since (configurable in `lib/gdpr/pii-registry.ts`)
- Subject to admin-led data-subject erasure if the contact
  asks — see [GDPR self-service](concepts/gdpr).

## Where to go next

- **[Contacts page reference](features/contacts)** — the full
  feature breakdown.
- **[AI contact attributes](features/ai-attributes)** — what
  the auto-enrichment does and how to disable it per-org.
- **[Add your first deal](onboarding/first-deal)** — the next
  thing most new orgs do.
