---
slug: features/dialer
lang: en
title: Dialer
summary: Call list management — load a list of contacts to dial, click-to-call, log outcome + notes per call.
tags: [features, dialer, calls, real-estate, philanthropy]
related: [features/contacts, features/sms, features/automations]
updated: 2026-04-25
---

# Dialer

`/dialer` is the calling workflow. Built for outbound sales /
fundraising sessions where someone burns through a list of
contacts in one sitting. Each call logs outcome + notes; the
contact's history accumulates across sessions.

## How it works

1. Build a **dialer list** — the set of contacts to call
   (filter from `/contacts` and "Send to dialer", or build
   manually).
2. Open `/dialer`. The first contact is queued; their info
   shows in a focus card.
3. **Click-to-call** — uses your default tel: handler (your
   phone, a softphone, or Twilio Voice if configured).
4. After the call, log:
   - **Outcome**: `connected` / `no_answer` / `busy` /
     `voicemail` / `wrong_number`
   - **Disposition**: `follow_up` / `qualified` / `not_interested` /
     `callback` / `appointment_set`
   - **Notes** — free-text
   - **Callback at** — optional, schedules a return call
5. Click **Next** to advance to the next contact.

Each call writes a `CallLog` row + an audit entry, plus an
Activity on the contact.

## Twilio Voice integration

If `/integrations` has Twilio Voice connected:

- Click-to-call dials through Twilio with caller ID = your
  configured Twilio number
- Call duration auto-fills from Twilio's call status callback
- Recording (if enabled on the Twilio side) attaches to the
  CallLog

Without Twilio Voice, click-to-call falls back to `tel:` — the
duration is whatever the user types in.

## Lists & dispositions

Lists persist; a closed dialer session can be resumed. The
"qualified" / "follow_up" / "appointment_set" dispositions
trigger automations downstream (e.g. "qualified → set deal
status to 'open' + create a follow-up task").

## Privacy

Phone numbers + call notes are PII. Retention: 2 years from
the call. Subject to admin-led data-subject erasure.

## Permissions

- Use: admin + manager
- Configure lists: admin + manager
- Lead routing rules (auto-dispatch new leads to a dialer
  list): admin only — see [/lead-routing](features/lead-routing)

## Where to go next

- **[Contacts](features/contacts)** — source pool for dialer
  lists
- **[Automations](features/automations)** — fire actions on
  call dispositions
