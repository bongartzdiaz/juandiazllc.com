---
name: ui-page
description: Bouw een complete pagina (Next.js App Router OF Vite + React Router v6) met layout, metadata, loading/error states, breadcrumbs, en passende secties. Werkt voor HMB Dashboard, funnel-app, Performance Tracker, Philly. Gebruik wanneer Juan vraagt "maak een pagina voor X", "nieuwe route Y", of bij scaffold van nieuwe feature.
trigger: /ui-page
---

# /ui-page

Complete pagina-scaffold volgens stack-conventies. Niet alleen `page.tsx`/route — ook layout, metadata, loading-state, error-boundary, en stukken UI volgens doel.

## Usage

```
/ui-page <pad> <doel>
/ui-page <pad> --stack <hmb|funnel|pt|philly|generic>
/ui-page <pad> --type <list|detail|form|dashboard|landing|settings>
/ui-page <pad> --auth <public|authenticated|admin>
/ui-page <pad> --data <static|server|client>
```

## Hard rules

### Per stack

| Stack | Routing | Layout | Metadata |
|---|---|---|---|
| `hmb` (Next.js Dashboard) | App Router `app/<pad>/page.tsx` | `app/<pad>/layout.tsx` als nodig | `metadata` export |
| `funnel` (Next.js 14) | App Router `app/<pad>/page.tsx` | inheriting | `metadata` of `generateMetadata` |
| `pt` (Vite + React Router v6) | `<Route>` in `App.tsx` + page in `src/pages/<pad>.tsx` | shared `<Layout>` wrapper | `useDocumentTitle` hook |
| `philly` (Next.js 16) | App Router | check repo-conventies | idem |

### Verplichte elementen

- **Metadata** (Next.js) of `<title>` (Vite) — beschrijvend, ≤60 char title, ≤155 char description
- **Loading-state** — `loading.tsx` (Next.js) of skeleton in component
- **Error-boundary** — `error.tsx` (Next.js) of try/catch + ErrorBoundary
- **Empty-state** voor list-pages
- **Breadcrumbs** voor pages dieper dan 2 levels
- **Heading-hierarchie** klopt: 1× `<h1>`, daarna `<h2>`, etc
- **Responsive** — mobile-first
- **Accessibility** — landmarks (`<main>`, `<nav>`, `<aside>`), skip-link op grote pages

### Auth-flow per stack

| Stack | Public | Authenticated | Admin |
|---|---|---|---|
| `hmb` | n.v.t. | middleware redirect naar `/login` | + role-check in page |
| `funnel` | default (lead-funnel) | n.v.t. | n.v.t. |
| `pt` | login-page only | `<RequireAuth>` wrapper of `useUser()` redirect | `<RequireRole>` of middleware |
| `philly` | check Prisma session | idem | idem |

## Output structuur

### Next.js App Router (hmb/funnel/philly)

```
app/<pad>/
├── page.tsx                # de pagina-component
├── layout.tsx              # alleen als deze pagina (sub-)layout heeft
├── loading.tsx             # auto-shown tijdens server-component load
├── error.tsx               # error boundary
├── not-found.tsx           # alleen als specifiek
├── _components/            # page-scoped components
│   ├── <Naam>Section.tsx
│   └── ...
└── opengraph-image.tsx     # alleen voor public landing-pages
```

### Vite + React Router (pt)

```
src/pages/<pad>.tsx         # de page-component
src/pages/<pad>/components/ # page-scoped components (als 3+)
```
Plus `<Route path=".." element={<Page />} />` in `App.tsx`.

## Page-skeleton — Next.js App Router

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Pagina-naam | HMB",
  description: "Korte beschrijving onder 155 char.",
  // openGraph, twitter, alternates indien nodig
};

export default async function PageName() {
  // server-side data fetch hier (alleen als server-component)
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Pagina-titel</h1>
        <p className="mt-2 text-gray-600">Subhead met context.</p>
      </header>

      <Suspense fallback={<SectionSkeleton />}>
        <DataSection />
      </Suspense>
    </main>
  );
}
```

## Page-skeleton — Vite + React Router

```tsx
import { useEffect } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function PageName() {
  useDocumentTitle("Pagina-naam | Performance Tracker");

  return (
    <div className="container mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Pagina-titel</h1>
      </header>
      <DataSection />
    </div>
  );
}
```

Plus in `App.tsx`:
```tsx
<Route
  path="/pad"
  element={
    <RequireAuth>
      <Layout>
        <PageName />
      </Layout>
    </RequireAuth>
  }
/>
```

## Type-specifieke secties

### `--type list`
- Filter-bar bovenaan (search + filters)
- TanStack Table (`/ui-table`)
- Pagination
- Bulk-actions als select aan
- "Nieuwe X"-knop rechtsboven
- Empty-state met CTA

### `--type detail`
- Breadcrumbs
- Header met titel + actions (edit/delete)
- Tab-navigation als veel data (Algemeen/Activiteit/Notities)
- Sticky right-sidebar met meta-info (created, owner, status)
- Activity-log onderaan

### `--type form`
- Single-column op mobile, 2-col op desktop voor groot form
- `/ui-form` skill voor de form zelf
- Cancel-knop (links) + submit (rechts) onderaan
- "Niet-opgeslagen wijzigingen"-warning bij navigate-away

### `--type dashboard`
- KPI-cards (4× of 6× grid) bovenaan
- Charts (recharts of tremor) eronder
- Recent activity / latest entries
- Date-range picker + filters
- Export-knop rechtsboven

### `--type landing`
- Hero (headline + subhead + CTA)
- Trust-indicators (logos, badges)
- Mechanism-section
- Social proof
- FAQ
- Final CTA
- Schema.org JSON-LD

### `--type settings`
- Sidebar-nav met secties (links)
- Per sectie: section-title + description + form
- "Save"-knop per sectie OF auto-save met indicator

## Output flow
1. **Brief** — bevestig stack, locatie, type, auth, data-bron
2. **Files-overzicht** — welke files worden aangemaakt
3. **page.tsx** — main pagina-component
4. **layout.tsx / loading.tsx / error.tsx** — als nodig
5. **Sub-components** in `_components/` als nodig
6. **Route-registratie** (Vite) of automatic (Next.js)
7. **Metadata** of `<title>`-call
8. **Test-stub** — 1 test per kritisch path

## Combineer met
- `/ui-form` — voor form-pages
- `/ui-table` — voor list-pages
- `/api-route` — voor data-fetching endpoints
- `/auth-flow` — voor authenticated routes
- `/seo-audit-page` — review na publicatie
- `/a11y-audit` — review na bouwen
