---
slug: features/properties
lang: en
title: Properties (real-estate)
summary: Listing inventory — bedrooms, baths, sqm, district, listing type, status, photos, MLS sync, CMA.
tags: [features, properties, real-estate, listings, mls]
related: [features/showings, features/offers, features/transactions, features/cma]
updated: 2026-04-25
---

# Properties

`/properties` is the real-estate inventory page. One row per
listing or actively-managed unit. Only visible when the org's
industry is set to `realestate` — see
[pick-industry](onboarding/pick-industry).

## The grid

KPI strip (total / active listings / portfolio value / avg
price) over a card grid. Each card: cover photo, title,
price, bedrooms / baths / sqm, status badge.

Toolbar: search + status filter + view toggle (grid / list /
map — coming soon).

## Creating a property

**+ New property** → form with:

- Title + description
- Address (street + district + city + postcode)
- Type — residential / commercial / land / industrial
- Listing type — for sale / for rent / sold / rented
- Bedrooms / baths / sqm / lot sqm
- Price
- Photos (drag-drop multi-upload to `/documents`)
- Custom flags (per-org taxonomy from
  `/settings/property-taxonomy`)

Save → property appears in the grid. Realtime broadcast
refreshes other tabs.

## Property detail page

`/properties/[id]`:

- Photo carousel
- Address + map
- Tabs: Overview | Showings | Offers | Documents | Activity
- Sidebar: linked deal, listing agent, key dates

## MLS sync

If you've connected an MLS feed at
[`/integrations` → MLS](features/integrations), inbound listings
auto-create properties in your org. Outbound listings push back
on save (provider-dependent).

The MLS connector deduplicates by external listing id. If the
MLS marks a listing as sold, the local row's status updates
automatically.

## CMA

Comparative Market Analysis — generate a CMA for a property
from `/properties/[id]` → Generate CMA. Pulls comparable
recent sales from the MLS feed + price trends.

The output is a `CmaReport` row visible at `/cma`.

## Permissions

- View: any user
- Create / edit: admin + manager
- MLS connection: admin

## Where to go next

- **[Showings](features/showings)** — schedule property visits
- **[Offers](features/offers)** — track buyer offers
- **[Transactions](features/transactions)** — the
  closing-process record
- **[Property taxonomy](features/settings-property-taxonomy)** —
  customise districts / types / flags
