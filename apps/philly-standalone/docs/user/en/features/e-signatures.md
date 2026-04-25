---
slug: features/e-signatures
lang: en
title: E-signatures
summary: DocuSign / HelloSign / PandaDoc integration — request, track, complete e-signatures on transaction documents.
tags: [features, e-signatures, docusign, hellosign, pandadoc, real-estate]
related: [features/integrations, features/transactions, features/documents]
updated: 2026-04-25
---

# E-signatures

`/e-signatures` is the signature workflow page. Upload a
document, pick signers, send via DocuSign / HelloSign /
PandaDoc, track until completion. Most useful in real-estate
mode (purchase agreements, lease contracts) but works in any
industry.

## Setup

Connect at least one provider in
[`/integrations`](features/integrations). API key only — no
OAuth dance for these. Multiple providers per org are supported;
each request picks the provider per-document.

## Sending a signature request

1. `/e-signatures` → **+ New request**
2. Upload PDF (or pick from `/documents`)
3. Add signers (name + email; from your contacts or external)
4. Place signature fields on the PDF (drag-drop UI)
5. Pick provider + send

The provider sends the signers an email with a sign link.
Status updates flow back via webhook (configured per provider
in `/integrations`).

## Status lifecycle

`pending` → `sent` → `viewed` → `signed` (or `declined` /
`expired`).

The signature row on `/e-signatures` updates as webhooks land.
Audit log records every transition.

## Linking to transactions

Each signature request belongs to a `Transaction`. The
Transaction page surfaces signatures in its sidebar. When all
signers complete, an automation can mark the transaction
"contract-executed" (configure in `/automations`).

## Storage

The signed PDF is fetched from the provider on completion and
stored in the CRM's documents storage. The Transaction stays
linked to both the original (pre-sign) and signed copies.

## Privacy

Signer name + email are PII; retention is **10 years** to match
contract evidentiary periods (configurable). Subject to
admin-led data-subject erasure.

## Permissions

Read: admin + manager. Send / cancel: admin + manager.

## Where to go next

- **[Integrations](features/integrations)** — connect
  DocuSign / HelloSign / PandaDoc
- **[Transactions](features/transactions)** — the entity
  signatures attach to
- **[Documents](features/documents)** — central document storage
