---
slug: features/ai-attributes
lang: en
title: AI contact attributes
summary: Auto-enrichment that runs after every contact create — Claude infers industry, ICP-fit score, and one-line summary in the background.
tags: [features, ai, contacts, enrichment, claude]
related: [features/contacts, features/ai-command-bar]
updated: 2026-04-25
---

# AI contact attributes

When you create a contact, the CRM kicks off a background AI
call (Claude via the Anthropic API) that infers structured
attributes from name + company + email. The contact card shows
a small spinner until it returns; status flips
`pending → complete`.

This is **not** the in-app help chat (`/assistant`) and **not**
the command bar (`⌘K`). It's a one-shot enrichment that runs
without user interaction.

## What gets inferred

- **Industry** — best-guess from company name + email domain
  (e.g. "marko@acme.com" + "Acme Corp" → likely industrial /
  manufacturing)
- **ICP fit score** — 0–100 estimate of how well this contact
  matches your typical customer profile. Calibrated against
  your existing high-converting contacts as the training set.
- **Summary** — one-sentence description ("Director of
  procurement at a mid-sized manufacturer in Cyprus")

## Where they show

`/contacts/[id]` → Overview tab → "AI attributes" panel.

The card grid on `/contacts` shows the score + a small AI
sparkle icon next to industry-tagged contacts.

## Status lifecycle

- `pending` — call kicked off; spinner showing
- `complete` — call returned; attributes filled
- `failed` — call errored; admin can retry from the contact
  detail page

The call uses Vercel `after()` so the create response returns
instantly; the LLM round-trip happens after the HTTP response
ships. Realtime broadcast updates the card when the attributes
land.

## Bulk import

CSV import runs the same enrichment on every row, throttled to
the AI rate limit (~10/sec). For a 1,000-row import: total
enrichment time ~2 minutes after the import itself completes.

## Manually re-running

Contact detail → AI attributes panel → **Re-run**. Useful when
the company changed or you noticed bad inference. Each re-run
is rate-limited and audit-logged.

## Disabling

Per-org: settings → AI features toggle. With AI disabled, new
contacts skip the enrichment call (status stays `disabled`).

Per-deployment: leave `ANTHROPIC_API_KEY` unset. The
enrichment endpoint short-circuits and the UI hides the panel.

## Cost

Claude Haiku, ~$0.0005 per contact. A 1,000-contact import =
$0.50.

## Privacy

The enrichment call sends name + company + email to Anthropic.
That's a third-country transfer covered by Standard
Contractual Clauses (SCCs); review your privacy notice. To
avoid the transfer, disable the feature.

## Permissions

- View attributes: any user
- Trigger / re-run: admin + manager
- Disable per-org: admin

## Where to go next

- **[Contacts](features/contacts)** — the parent feature
- **[AI command bar](features/ai-command-bar)** — interactive
  AI tools (different scope)
- **[GDPR](features/gdpr)** — third-country transfers
