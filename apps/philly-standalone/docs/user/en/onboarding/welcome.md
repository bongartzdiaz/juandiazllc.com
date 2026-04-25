---
slug: onboarding/welcome
lang: en
title: Welcome to Philly CRM
summary: What the CRM does, who it's for, and the five-minute path from first sign-in to a working tenant.
tags: [onboarding, getting-started, overview]
related: [onboarding/create-organization, onboarding/invite-team, concepts/tenancy]
updated: 2026-04-25
---

# Welcome to Philly CRM

Philly is an operator-first CRM. It centralises the work of a small
or mid-sized organisation — your contacts, your deals, your projects,
your inbox, your calendar — and adds the integrations and AI tooling
that turn raw data into action.

## Who it's for

Philly serves three industry verticals out of one codebase:

- **Philanthropy** — partners, donors, beneficiaries, grants, impact metrics.
- **Real estate** — buyers, sellers, properties, listings, transactions, commissions.
- **Hospitality** — guests, reservations, rooms, vendors, staff.

The dashboard auto-adapts based on the industry your organisation
selects. Most pages exist in all three modes; a handful are vertical-specific.

## What you get on day one

- A multi-tenant database where every record is scoped to your
  organisation. Other organisations can never see your data.
- Role-based access (admin / manager / viewer) with a per-section
  allow-list — you can give a viewer access to "deals" but hide
  "audit log".
- A full audit trail of who-did-what, with cryptographic
  tamper-evidence (Article 30 GDPR record-keeping).
- Self-service GDPR tooling — operators can export or delete their
  own account; admins can process data-subject requests for contacts.
- A complete privacy posture: no analytics cookies, no fingerprinting,
  no third-party trackers. The CRM works without any consent banner.

## Five-minute setup

Brand-new sign-in goes through `/onboarding`:

1. **Sign in** with your email at the brand site (Supabase auth).
2. **Create your organisation** — pick a name; you become its admin.
3. **Invite your team** — admin → `/settings/users` → email + role.
4. **Pick your industry** — settings → `industry` (philanthropy / realestate / hospitality).
5. **Add your first record** — a contact, a deal, a project, a property — whichever you'd reach for first.

That's it. The rest of this guide walks you through each of those
in detail and links to feature docs as you go.

## Where to go next

- **[Create your organisation](onboarding/create-organization)** — the very first step on first sign-in.
- **[Invite your team](onboarding/invite-team)** — pre-create teammate accounts so they land in your org on first sign-in.
- **[Roles & permissions](concepts/roles)** — admin vs manager vs viewer, and the per-section allow-list.
- **[Tenancy & data isolation](concepts/tenancy)** — how the CRM keeps your data separate from other organisations.
- **[Your privacy & data rights](concepts/gdpr)** — the self-service `Export my data` and `Delete my account` flows.

If you get stuck, the assistant in the bottom-right corner can
answer questions about any feature in plain language.
