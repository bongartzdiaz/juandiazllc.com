---
slug: onboarding/pick-industry
lang: en
title: Pick your industry
summary: How the industry setting (philanthropy / real-estate / hospitality) reshapes the dashboard and which contact/deal types are available.
tags: [onboarding, settings, industry]
related: [onboarding/welcome, onboarding/first-contact, onboarding/first-deal]
updated: 2026-04-25
---

# Pick your industry

Philly is one CRM with three industry "skins". The same database
backs all of them; what changes is which sections are surfaced in
the sidebar, which contact + deal types are offered in the form
pickers, and a handful of vertical-specific KPIs.

## The three industries

- **Philanthropy** — the default. Optimised for non-profit
  operations: partners, donors, beneficiaries, stakeholders;
  projects with SDG goals, impact metrics, grants.
- **Real estate** — buyers, sellers, investors, tenants,
  landlords; properties, listings, showings, offers,
  transactions, commissions, CMA reports.
- **Hospitality** — guests, vendors, partners, staff;
  reservations, rooms, housekeeping, open houses, drip
  campaigns.

You can switch at any time from `/settings` → industry. Your
existing data is unaffected — only the UI rearranges.

## What actually changes

| Setting | Philanthropy | Real estate | Hospitality |
| --- | --- | --- | --- |
| Default contact types | partner / donor / stakeholder / beneficiary | buyer / seller / tenant / landlord / investor | guest / vendor / partner / staff |
| Default pipeline | Prospect → Engaged → Cultivated → Solicited → Stewarded | Lead → Showing → Offer → Under contract → Closed | Inquiry → Hold → Confirmed → Checked-in → Checked-out |
| KPI cards on `/projects` | Active / Total Budget / Budget Used | Active Listings / Portfolio Value / Avg Price | Available / Avg Nightly Rate / Occupancy |
| Sidebar additions | Impact, Donors, Grants | Properties, Showings, Offers, Open Houses, Commissions, Transactions, CMA | Rooms, Open Houses, Drip Campaigns |
| `/projects` becomes | Projects | Properties | Venues |

The shared data model is industry-agnostic. A `Contact` is a
`Contact` regardless of which industry; the type picker is a
display-layer concern.

## Picking the right one

If you're a non-profit, charity, foundation, or any
mission-driven organisation: **Philanthropy**.

If you list, sell, or rent property: **Real estate**.

If you run a hotel, B&B, event venue, or short-term rental:
**Hospitality**.

If you're none of those, default to **Philanthropy** — the type
labels are the most generic and you can rename or extend them
later if needed.

## Switching later

Switching from one industry to another:

1. **Doesn't delete data.** Every existing contact, deal,
   project stays in the database.
2. **Doesn't rename existing rows.** A contact you saved as
   `donor` still has `type: "donor"` after you switch to real
   estate — it just doesn't appear in the new type-filter pills.
   Edit the type from the contact detail page if you want it to
   reappear under the new industry's labels.
3. **Reshuffles KPIs.** Dashboard cards re-render against the
   new vertical's metrics on next load.

## Multi-industry organisations

Today, an organisation has exactly one industry at a time. If you
genuinely run two verticals (e.g. a foundation that also operates
a hospitality venue), the cleanest setup is two organisations —
one per industry — under the same admin. Cross-org reporting is
a separate feature on the roadmap.

## Where to go next

- **[Add your first contact](onboarding/first-contact)** — see
  the type picker in action.
- **[Add your first deal](onboarding/first-deal)** — see the
  default pipeline for your industry.
- **[Settings overview](features/settings)** — full reference
  for the settings tree.
