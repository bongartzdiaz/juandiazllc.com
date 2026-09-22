# Pricing — Juan Diaz, LLC (juandiazllc.com)

Machine-readable pricing for AI assistants and buying agents. Generated from
`_drafts/pricing/pricing-tiers.csv` and `docs/claims.md` by `scripts/regenerate-pricing.mjs`;
a CI check fails when this file and the human pricing page drift apart.

- Human page: https://juandiazllc.com/en/pricing (also /nl, /de, /es)
- Services page: https://juandiazllc.com/en/services
- Contact: https://juandiazllc.com/en/contact
- Currency: EUR. Prices exclude VAT.
- If this file and a page disagree, the page wins.

## Services — Juan Diaz, fractional revenue operator

Priced per outcome, not per hour. Advisory is a standalone engagement; the build does not have to follow.

### Blueprint call
- Price: free
- Duration: 30 minutes
- Deliverable: a one-page diagnosis of where the operation and the numbers disagree
- Book: https://juandiazllc.com/en/contact

### Diagnostic sprint
- Price: €2,500 fixed, excl. VAT
- Duration: 30 days
- Deliverable: the build plan with a number on every phase, plus the first component already running
- Ownership: the plan is the client's, even if someone else executes it
- Credit: if the build follows, the sprint fee comes off it in full

### Scope, build, operate
- Price: fixed fee for the first 90 days of strategy and build, then a monthly retainer for operations
- Quoted after the diagnostic sprint, not before
- Capacity: three engagements run at the same time; start date depends on what is already running

## DEUS CRM — per-seat tiers (EU-hosted)

The price you sign up at is the price you pay until you change tiers. No usage limits, no overage fees, no AI credits, no per-API charges: the bill depends on the number of seats only.

### Starter
- Price: €40 per seat per month (monthly billing) | €32 per seat per month (annual billing, 20% off)
- Minimum seats: 3
- Free trial (no credit card): 14 days
- Included: Contacts; Deals and pipelines; Kanban boards with due dates; Notes and file attachments; Saved views and filters; Calendar and events; Email templates; Two-factor authentication; Role-based access control; IP allowlist; Audit log retention: 1 year; GDPR-compliant by default; EU-only data residency; DPA available on signup; DSAR export (JSON); CSV import (up to 10k rows); Email support (24 hour response); Shared multi-tenant (Hetzner Falkenstein)

### Professional
- Price: €69 per seat per month (monthly billing) | €55 per seat per month (annual billing, 20% off)
- Minimum seats: 5
- Free trial (no credit card): 14 days
- Included: Contacts; Deals and pipelines; Kanban boards with due dates; Notes and file attachments; Bulk operations; Saved views and filters; Calendar and events; Email templates; Custom SMTP (send via your domain); AI lead scoring; AI contact attributes (auto-fill); Two-factor authentication; Role-based access control; IP allowlist; Audit log retention: 1 year; GDPR-compliant by default; EU-only data residency; DPA available on signup; DSAR export (JSON); Custom logo; CSV import (up to 10k rows); Outbound webhooks; REST API access; Priority email (4 hour business hours); Shared multi-tenant (Hetzner Falkenstein)

### Business
- Price: €99 per seat per month (monthly billing) | €79 per seat per month (annual billing, 20% off)
- Minimum seats: 10
- Free trial (no credit card): 14 days
- Included: Contacts; Deals and pipelines; Kanban boards with due dates; Notes and file attachments; Bulk operations; Saved views and filters; Calendar and events; Email templates; Custom SMTP (send via your domain); AI lead scoring; AI contact attributes (auto-fill); Two-factor authentication; Role-based access control; IP allowlist; Audit log retention: 1 year; GDPR-compliant by default; EU-only data residency; DPA available on signup; DSAR export (JSON); Custom logo; CSV import (up to 10k rows); Outbound webhooks; REST API access; Priority email (4 hour business hours); Private Slack channel; Shared multi-tenant (Hetzner Falkenstein)

### Enterprise
- Price: custom, per organisation rather than per seat — contact https://juandiazllc.com/en/contact?interest=enterprise
- Minimum seats: 15
- Free trial (no credit card): Custom
- Included: Contacts; Deals and pipelines; Kanban boards with due dates; Notes and file attachments; Bulk operations; Saved views and filters; Calendar and events; Email templates; Custom SMTP (send via your domain); AI lead scoring; AI contact attributes (auto-fill); Two-factor authentication; Role-based access control; IP allowlist; Audit log retention: 1 year; GDPR-compliant by default; EU-only data residency; DPA available on signup; DSAR export (JSON); Custom DPA negotiation; Custom logo; CSV import (up to 10k rows); Outbound webhooks; REST API access; Custom integrations (built for you); Private Slack channel; Phone support; Shared multi-tenant (Hetzner Falkenstein)

### Optional: migration service
- Price: €1,500 one-time
- Scope: migration from Pipedrive, HubSpot, Salesforce or a spreadsheet, run for you; five business days; two training sessions; first 30 days priority support

### Billing rules
- Annual billing pays the year upfront at 20% off; monthly billing is charged every 30 days at the full rate.
- Upgrades are immediate and prorated; downgrades take effect at the next billing cycle, without data loss.
- AI features are included from Professional upwards; the LLM cost is absorbed in the tier price.
- Hosting and service providers: Supabase (database and authentication), Vercel (application hosting), Stripe Payments Europe Ltd in Ireland (payments). AI-assisted contact enrichment is processed by Anthropic in the United States. Shared multi-tenant infrastructure on Hetzner (Falkenstein) on every tier.

## Feature table

### Core CRM

| | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| Contacts | ✓ | ✓ | ✓ | ✓ |
| Deals and pipelines | ✓ | ✓ | ✓ | ✓ |
| Kanban boards with due dates | ✓ | ✓ | ✓ | ✓ |
| Notes and file attachments | ✓ | ✓ | ✓ | ✓ |
| Bulk operations |  | ✓ | ✓ | ✓ |
| Saved views and filters | ✓ | ✓ | ✓ | ✓ |

### Calendar

| | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| Calendar and events | ✓ | ✓ | ✓ | ✓ |

### Email

| | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| Email templates | ✓ | ✓ | ✓ | ✓ |
| Custom SMTP (send via your domain) |  | ✓ | ✓ | ✓ |

### AI

| | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| AI lead scoring |  | ✓ | ✓ | ✓ |
| AI contact attributes (auto-fill) |  | ✓ | ✓ | ✓ |

### Security

| | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| Two-factor authentication | ✓ | ✓ | ✓ | ✓ |
| Role-based access control | ✓ | ✓ | ✓ | ✓ |
| IP allowlist | ✓ | ✓ | ✓ | ✓ |
| Audit log retention | 1 year | 1 year | 1 year | 1 year |

### Compliance

| | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| GDPR-compliant by default | ✓ | ✓ | ✓ | ✓ |
| EU-only data residency | ✓ | ✓ | ✓ | ✓ |
| DPA available on signup | ✓ | ✓ | ✓ | ✓ |
| DSAR export (JSON) | ✓ | ✓ | ✓ | ✓ |
| Custom DPA negotiation |  |  |  | ✓ |

### Branding

| | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| Custom logo |  | ✓ | ✓ | ✓ |

### Integrations

| | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| CSV import (up to 10k rows) | ✓ | ✓ | ✓ | ✓ |
| Outbound webhooks |  | ✓ | ✓ | ✓ |
| REST API access |  | ✓ | ✓ | ✓ |
| Custom integrations (built for you) |  |  |  | ✓ |

### Support

| | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| Email support (24 hour response) | ✓ |  |  |  |
| Priority email (4 hour business hours) |  | ✓ | ✓ |  |
| Private Slack channel |  |  | ✓ | ✓ |
| Phone support |  |  |  | ✓ |

### Infrastructure

| | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| Shared multi-tenant (Hetzner Falkenstein) | ✓ | ✓ | ✓ | ✓ |
