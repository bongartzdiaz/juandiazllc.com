---
slug: features/sms
lang: en
title: SMS & WhatsApp
summary: Send SMS or WhatsApp via Twilio, conversation history per contact, automation send_sms action, inbound webhook handling.
tags: [features, sms, whatsapp, twilio]
related: [features/integrations, features/inbox, features/automations]
updated: 2026-04-25
---

# SMS & WhatsApp

`/sms` is the SMS + WhatsApp interface. Outbound goes through
Twilio (or compatible provider); inbound posts to the CRM via
a webhook so messages auto-attach to contacts.

## Setup

1. Connect Twilio in [`/integrations`](features/integrations) —
   API key + sender number.
2. Configure your Twilio number's Messaging webhook to
   `https://your-deployment/api/sms/webhook` (provided in the
   integration setup screen — copy the URL).
3. The webhook URL is HMAC-validated against `TWILIO_AUTH_TOKEN`;
   forged inbound messages are rejected.

## Sending an SMS

`/sms` → **Compose** → pick a contact (or paste a number),
type a message, send. Twilio bills your account. Status
flips: `queued` → `sent` → `delivered` (or `failed`).

For WhatsApp: same UI, the channel field is `whatsapp` and the
provider sends via Twilio's WhatsApp business API (requires the
number to be on a WhatsApp-enabled Twilio account).

## Conversations

Each thread is a `Conversation` keyed by (contact, channel).
The thread shows time-ordered turns from both sides; auto-
attaches inbound messages by phone number match.

## Automations

The `send_sms` action in `/automations` accepts:

- **to** — phone number or contact reference
- **body** — handlebars template
- **channel** — `sms` or `whatsapp`

Common rule: contact tagged `vip` → automation sends a
WhatsApp welcome with their account manager's calendly link.

## Rate limits

- Per-org: 100 messages/hour by default
- Per-contact: 5 messages/hour (prevents accidental spam loops)
- Twilio's own per-second cap applies in addition

## Privacy

SMS and WhatsApp bodies are PII. Retention: 2 years from
send/receive. Subject to data-subject erasure.

## Where to go next

- **[Integrations](features/integrations)** — connect Twilio
- **[Inbox](features/inbox)** — unified email + SMS + WhatsApp
  view
- **[Automations](features/automations)** — `send_sms` action
