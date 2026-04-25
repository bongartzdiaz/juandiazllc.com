---
slug: features/email
lang: en
title: Email
summary: Two-way Gmail/Outlook sync, threaded inbox per contact, send via the connected account, attach to deals/contacts.
tags: [features, email, gmail, outlook]
related: [features/integrations, features/contacts, features/automations, features/inbox]
updated: 2026-04-25
---

# Email

`/email` is the unified inbox over your connected Gmail or
Outlook accounts. Messages auto-attach to contacts (by email
address match) and deals (via the contact link).

## Setup

Connect Google or Microsoft in [`/integrations`](features/integrations).
The connector fetches your inbox on first connect (last 30 days
by default) and incrementally syncs every 5 minutes thereafter.

Multiple accounts per org are supported — each user can
connect their own. Per-user isolation: you only see emails on
your own connected accounts.

## The inbox view

- **Thread list** on the left — newest first, with
  unread/starred indicators
- **Thread reader** on the right — collapsed messages by default,
  click to expand
- **Filters** — folder (Inbox / Sent / Drafts), unread-only,
  search across body + subject

## Sending

Click **Compose** → from-account picker, to/cc/bcc, subject,
body. Send goes through the provider's SMTP (Gmail send /
Microsoft Graph send). The sent message appears in your Sent
folder + auto-attaches to any matching contact.

Attachments: drag-and-drop into the body. Encoded inline for
Gmail, multipart for Outlook.

## Auto-attachment

When sync ingests a message, the engine looks at from-address +
to/cc addresses and finds matching `Contact` rows in your org.
For each match, an `Activity` of type `email_received` is added
to that contact, and to any `Deal` linked to that contact.

This is what powers "every email I exchanged with Sarah is on
her contact's Activity tab automatically".

## Drafts

Saved drafts sync up to your account's Drafts folder. Editing
in either place re-syncs.

## Privacy

Emails are PII. Retention policy: 3 years from receipt
(configurable in `lib/gdpr/pii-registry.ts`); auto-purged by
the retention cron. Subject to admin-led data-subject erasure
— if a contact requests deletion, every email referencing
their address is hard-deleted.

## Permissions

- View / send: any user, scoped to their own connected accounts
- Connect / disconnect a Gmail account: admin

## Where to go next

- **[Integrations](features/integrations)** — connect Gmail /
  Outlook
- **[Inbox](features/inbox)** — multi-channel unified inbox
  (email + SMS + WhatsApp)
- **[Automations](features/automations)** — `email.received`
  and `send_email` actions
