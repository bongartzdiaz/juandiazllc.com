---
name: refactor
description: Refactor een file/component/function met behoud van gedrag — modulair maken, dood-code weg, types strakker, naming verbeteren, complexity verminderen. NIET hetzelfde als /simplify (die fixt issues); deze restructureert. Gebruik wanneer een file >300 LOC is, een functie te complex, of bij voorbereiding op nieuwe feature in legacy-code.
trigger: /refactor
---

# /refactor

Restructureer code met behoud van gedrag. Output is altijd een diff met motivering per wijziging.

## Usage

```
/refactor <pad>
/refactor <pad> --goal <split-file|extract-fn|simplify-types|reduce-complexity|deduplicate>
/refactor <pad> --aggressive                  # ook naming/conventions hernoemen
/refactor <pad> --keep-public-api             # exports moeten gelijk blijven
```

## Hard rules

### Behoud gedrag
- **Geen feature-toevoeging** — alleen herstructurering
- **Tests moeten nog passen** (run `npm test` of equivalent)
- **Public API blijft gelijk** als `--keep-public-api` (exports, prop-types, return-types)
- **Geen TODO's of `// fix later`** — als je iets vindt dat fix nodig heeft, log het apart

### Wat MAG

- Splits file >300 LOC in coherente sub-files
- Extract functies >50 LOC of 3+ niveaus nesting
- Hernoem ambigue identifiers (`data` → `userProfile`)
- Vervang `any` door specifieke types
- Inline single-use helpers
- Dedupliceer copy-paste (3+ vergelijkbare blokken → 1 helper)
- Verwijder dood-code (unreachable, unused exports na grep)
- Vervang inline magic numbers/strings door named constants
- Move imports naar top, sorteer (deps eerst, dan local, dan types)
- Convert callback-hell → async/await
- Convert classes → functions waar idiomatic (React components)
- Vervang `useEffect+fetch` door TanStack Query (in PT)

### Wat MAG NIET zonder expliciete go

- Public API breken (exports verwijderen, prop-namen wijzigen)
- Library-keuzes wijzigen (Tailwind→CSS-modules, RHF→Formik)
- Architectuur-shifts (Vite→Next.js, REST→tRPC)
- Database-schema raken
- Behavior wijzigen onder pretext van "kleinere fix"

## Refactor-trigger checklist

| Symptoom | Doel | Strategie |
|---|---|---|
| File >300 LOC | `split-file` | Coherente groepen → eigen bestand |
| Functie >50 LOC | `extract-fn` | Stappen → named helpers |
| 4+ levels nesting | `reduce-complexity` | Early returns, guard clauses |
| 3+ vergelijkbare blokken | `deduplicate` | Generic helper of map() over config |
| `any[]` of `Record<string, any>` | `simplify-types` | Specifieke types of generics |
| Veel inline functions in JSX | extract | useCallback of move out |
| useEffect met fetch (PT) | replace | TanStack Query useQuery |
| 5+ useState in 1 component | extract | useReducer of zustand store |
| Props-drilling 3+ levels | extract | Context of compound component |

## Output structuur

### Step 1 — Audit

```
AUDIT: <bestand>

Smell #1: <wat>
Locatie: regel X-Y
Score: HIGH/MEDIUM/LOW
Voorstel: <hoe>

Smell #2: ...
```

### Step 2 — Plan

```
PLAN
1. <stap 1, low risk first>
2. <stap 2>
3. ...

Geschatte effort: S/M/L
Public API impact: geen / minor / breaking
```

### Step 3 — Diff per stap

Per stap: vóór + na + 1 zin reden.

### Step 4 — Test-suggestie

Welke tests moeten run om regression te detecteren? Als geen tests bestaan: 3 minimal cases die de risico-areas dekken.

## Voorbeelden

### Split-file (file >300 LOC)

Voor:
```
app/dashboard/page.tsx (450 LOC)
  ├── 5 inline components
  ├── 8 helper functies
  └── 1 mega-component
```

Na:
```
app/dashboard/page.tsx (60 LOC)        # alleen orkestratie
app/dashboard/_components/
  ├── KpiGrid.tsx (40 LOC)
  ├── ActivityFeed.tsx (80 LOC)
  └── RecentLeads.tsx (60 LOC)
app/dashboard/_lib/
  ├── formatKpi.ts (25 LOC)
  └── filterLeads.ts (30 LOC)
```

### Extract-fn (functie te complex)

Voor:
```ts
function processLead(lead: Lead) {
  // 70 LOC met 4 niveaus nesting...
}
```

Na:
```ts
function processLead(lead: Lead) {
  const validated = validateLead(lead);
  if (!validated.ok) return validated;
  const enriched = enrichWithGeo(validated.data);
  const scored = scoreLead(enriched);
  return persistLead(scored);
}
```

### Simplify-types

Voor:
```ts
function fetchData(opts: any): Promise<any> { ... }
```

Na:
```ts
interface FetchOpts { id: string; include?: ("activity" | "notes")[] }
type FetchResult = Lead & { activity?: Activity[]; notes?: Note[] };
function fetchData(opts: FetchOpts): Promise<FetchResult> { ... }
```

## Stack-specifiek

### PT (Vite + React 18)
- `useEffect+fetch` → `useQuery` van TanStack Query
- Class components → function components
- Inline event handlers in lists → useCallback

### Next.js (HMB / funnel / Philly)
- `"use client"` alleen als nodig (interaction, useState, browser API)
- Server components als default — geen useEffect voor server data
- API routes met validation → extract Zod-schema naar shared lib

### Edge functions (Supabase)
- Auth-pattern uniformeren via `_shared/auth.ts`
- CORS naar `_shared/cors.ts`

## Output flow
1. **Audit** — lijst smells met severity
2. **Plan** — volgorde van stappen, low-risk first
3. **Diff per stap** — file-by-file, met motivering
4. **Test-suggestie** — wat run om regression te checken
5. **Open vragen** — bij ambiguïteit liever vragen dan gokken

## Combineer met
- `/simplify` — voor issue-level fixes
- `/test-write` — voeg tests toe als ze ontbreken
- `/perf-audit` — als refactor performance-driven is
- `/git-pr` — voor de PR-description
