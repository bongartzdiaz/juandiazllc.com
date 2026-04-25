---
slug: features/integrations
lang: en
title: Integrations
summary: Connect external tools — Google (Gmail/Calendar), Microsoft 365, Twilio (SMS/WhatsApp), DocuSign, HelloSign — via OAuth or API key.
tags: [features, integrations, oauth, gmail, twilio]
related: [features/email, features/sms, features/calendar, features/e-signatures]
updated: 2026-04-25
---

# Integrations

`/integrations` lists every external service the CRM can talk
to. Admin-only. Each integration is one of two shapes:

- **OAuth** — Google, Microsoft. Click connect → authorise on
  the provider site → redirected back. Tokens stored
  encrypted at rest.
- **API key** — Twilio, DocuSign, HelloSign, etc. Paste the key;
  it's encrypted with `INTEGRATION_SECRET` at write time.

## Currently supported

| Provider     | Auth          | Drives                                  |
| ------------ | ------------- | --------------------------------------- |
| Google       | OAuth         | `/email` (Gmail), `/calendar`           |
| Microsoft    | OAuth         | `/email` (Outlook), `/calendar`         |
| Twilio       | API key       | `/sms`, automation `send_sms` action    |
| DocuSign     | API key       | `/e-signatures`                         |
| HelloSign    | API key       | `/e-signatures`                         |
| PandaDoc     | API key       | `/e-signatures`                         |
| Slack        | Webhook URL   | automation `post_webhook` action        |
| Mailchimp    | API key       | (audience sync — beta)                  |

## Connecting via OAuth (Google example)

1. `/integrations` → click **Connect** next to Google.
2. Browser redirects to Google's consent page.
3. Approve scopes (Gmail readonly + send, Calendar readwrite).
4. Browser returns to `/settings?tab=integrations&oauth_success=google`.
5. Tokens are stored encrypted; the integration row flips to
   `status: connected`.

The OAuth callback is rate-limited per IP. If you see
`oauth_error=...`, check the URL params for the cause; common
ones are `state_mismatch` (you took too long, retry) or
`scope_denied` (Google asked you to approve scopes you didn't).

## Connecting via API key (Twilio example)

1. Get the SID + auth token from the Twilio console.
2. `/integrations` → click **Connect** next to Twilio.
3. Paste both fields + your sender number.
4. Save. The token is encrypted before insert.

The token is never shown again after save. Click **Rotate** to
issue a new key (you'll need to update Twilio first).

## Disconnecting

Click **Disconnect**. The integration row sets
`status: disconnected` but the row stays — re-connecting later
preserves history. To purge entirely, click **Delete** (admin
only). Linked records (e.g. EmailAccount rows) are preserved
but stop syncing.

## Encryption-at-rest

OAuth tokens (`accessToken`, `refreshToken`) and API keys are
encrypted with AES-256-GCM via `lib/philly/crypto.ts` before
insert. The encryption key comes from `INTEGRATION_SECRET`
(must be set in production — see `docs/RUNBOOK.md §1`).

If `INTEGRATION_SECRET` is unset in production, the module
throws at import → app refuses to start. In dev, a deterministic
placeholder is used (warning surfaced in logs).

## Where to go next

- **[Email](features/email)** — uses the Gmail / Outlook
  integration
- **[Calendar](features/calendar)** — uses Google / Microsoft
  Calendar
- **[SMS](features/sms)** — uses the Twilio integration
- **[E-signatures](features/e-signatures)** — DocuSign /
  HelloSign / PandaDoc
- **[Automations](features/automations)** — most actions need
  at least one connected integration
