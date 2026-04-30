# Sub-processors

_Required by Article 28 §2 GDPR. The list below names every entity
to which we, as **processor** of customer data, transmit personal
data in the course of providing the Philly CRM platform. Any change
to this list (addition or substitution) is notified to controllers
in advance, with at least 30 days for objection, per the
[`DPA.md`](./DPA.md)._

| Field | Value |
| ---- | ---- |
| **Last updated** | [TO FILL: YYYY-MM-DD] |
| **Notice channel** | [TO FILL: e.g. "emails subscribed via the admin → Account → Sub-processor notifications page", or a Slack channel, or a status page URL] |
| **Objection window** | 30 days from notice |

---

## Active sub-processors

| # | Sub-processor | Purpose | Data categories | Hosting region(s) | Transfer mechanism |
| -- | ---- | ---- | ---- | ---- | ---- |
| 1 | **Supabase, Inc.** | Managed Postgres + Auth (operator login, hashed passwords, TOTP secrets, all CRM rows) | All data the controller stores in the CRM | EU (`eu-west-1`) primary; multi-AZ in-region | EU SCCs; Supabase Inc. is a US entity but the data plane is EU-resident |
| 2 | **Vercel, Inc.** | App hosting, edge proxy, image optimisation | Request metadata (IP, headers, path) for the duration of a request; no payload retention | EU edge regions for EU-locale customers; logs in `iad1` | EU SCCs |
| 3 | **Sentry (Functional Software, Inc.)** | Error monitoring (only when `SENTRY_DSN` is set) | Stack traces, request URL, redacted headers, scrubbed extras (see `lib/philly/sentry.ts` `beforeSend`) | EU (`de`) when configured | EU SCCs |
| 4 | **Anthropic, PBC** | Claude Haiku inference for AI Attributes + lead-scoring features (only when `ANTHROPIC_API_KEY` is set; only on demand) | Contact-enrichment prompts (name, email, phone, company, notes truncated to 1,500 chars) | United States | EU SCCs + Anthropic DPA; API configured for **zero retention** |
| 5 | **Twilio, Inc.** | SMS delivery (optional integration; only when the controller enables it and supplies their own credentials) | Recipient phone, sender phone, message body, delivery status | Per Twilio's region routing | EU SCCs |
| 6 | **Google LLC** | Gmail / Google Calendar sync — only the customer's own mailbox via OAuth (the controller authenticates as themselves; we never read mail without that consent) | Email contents from the operator's own inbox; calendar events | Per Google's region routing | EU SCCs |
| 7 | **Microsoft Corp.** | Outlook / Microsoft 365 calendar sync (same OAuth model as Google) | Calendar events; mail metadata | Per Microsoft's region routing | EU SCCs |
| 8 | **Plausible Insights OÜ** | Cookieless privacy-first analytics on the marketing website (`juandiazllc.com`); not loaded inside the CRM dashboard | Aggregated page-view counts, no cookies, no IP storage | EU (`de`) | Controller is EU-based, no third-country transfer |

> **Conditional sub-processors** (rows 3–7) are active only for
> controllers who explicitly enable them. The base CRM (rows 1–2)
> is the minimal sub-processor footprint for any deployment.

## Sub-processors used at the marketing layer only

These are loaded by the public marketing site (`juandiazllc.com`)
and never receive controller-collected CRM data:

- **GitHub, Inc.** — source-of-truth for the public website repo.
- **Cloudflare, Inc.** — DNS + WAF for the apex domain.

## How we vet a new sub-processor

1. Sign a Data Processing Agreement that includes EU SCCs (or proof
   of an adequacy decision).
2. Verify a published security posture — SOC 2 Type II or ISO 27001
   minimum.
3. Confirm zero-retention or short-retention behaviour for any
   payload that includes personal data.
4. Add the entry in this file, in the canonical RoPA in
   `lib/gdpr/ropa.ts`, and in the `recipients[]` of any affected
   processing activity.
5. Notify subscribed controllers ≥ 30 days before activation.

## Decommissioning

When a sub-processor is removed:

1. Confirm any data we transmitted has been deleted under the DPA's
   end-of-engagement clause.
2. Move the entry to the **Decommissioned sub-processors** section
   below with the date.
3. Bump `Last updated` at the top of this file.

## Decommissioned sub-processors

_(none yet)_
