---
name: empty-state
description: Bouw consistente loading / empty / error / no-permission states voor lijsten, dashboards, search-results, forms. Visueel consistent + recovery-CTA. Werkt voor PT, HMB Dashboard, funnel-app, Philly. Gebruik wanneer Juan vraagt "wat tonen we als X leeg is", bij refactor van inline-states naar herbruikbare componenten, of bij UX-polish.
trigger: /empty-state
---

# /empty-state

State-componenten die elke list/dashboard/search dekken — geen "Loading..." of `<div>nothing</div>` placeholders meer.

## Usage
```
/empty-state <scope>
/empty-state <scope> --types <loading|empty|error|forbidden|all>
/empty-state <scope> --tone <minimal|encouraging|technical>
```

## De 5 standaard-states

| State | Wanneer | UI |
|---|---|---|
| `loading` | Initial fetch, full-page or section | Skeleton blocks (niet spinner alleen) |
| `empty-first` | Geen data ooit (nieuwe gebruiker) | Onboarding-CTA + illustratie |
| `empty-filtered` | Filters/search → 0 results | "Geen resultaten" + reset-filters CTA |
| `error` | Fetch faalde | "Probeer opnieuw" knop + support-link |
| `forbidden` | RLS / role-blokkade | "Geen toegang" + role-info + upgrade-CTA |

## Hard rules
- **Skeleton > spinner** voor content-areas (geen layout-shift bij load)
- **Spinner OK** voor inline button-loads (<2s)
- **Empty-state heeft ALTIJD een actie** — geen dood-eind UI
- **Error-state heeft retry** — niet alleen "Er ging iets mis"
- **Empty-first vs empty-filtered ANDERS** — eerste = welkom, tweede = "probeer minder filters"
- **Geen emoji's** in states (zie HMB brand)

## Component-suite

### `<EmptyState>` (universele)
```tsx
import { Button } from "@/components/ui/button";
import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; href?: string; onClick?: () => void };
}

export function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div role="status" className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-gray-600">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-6 flex gap-3">
          {action && <Button onClick={action.onClick}>{action.label}</Button>}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

### Use-cases

```tsx
// Empty-first: nieuwe gebruiker, geen leads ooit
<EmptyState
  icon={<UsersIcon className="h-12 w-12" />}
  title="Nog geen leads"
  description="Zodra je eerste lead binnenkomt verschijnt 'ie hier."
  action={{ label: "Naar campagne instellingen", onClick: goToSettings }}
/>

// Empty-filtered: filters actief, 0 results
<EmptyState
  title="Geen resultaten gevonden"
  description="Probeer de filters te versoepelen of een andere zoekterm."
  action={{ label: "Reset filters", onClick: resetFilters }}
/>

// Error
<EmptyState
  icon={<AlertIcon className="h-12 w-12 text-red-500" />}
  title="Kon data niet laden"
  description="Er ging iets mis bij het ophalen. Probeer het opnieuw."
  action={{ label: "Opnieuw proberen", onClick: refetch }}
  secondaryAction={{ label: "Mail support", href: "mailto:support@hmb.nl" }}
/>

// Forbidden
<EmptyState
  icon={<LockIcon className="h-12 w-12" />}
  title="Geen toegang"
  description="Je hebt geen rechten voor deze pagina. Vraag een admin om toegang."
  secondaryAction={{ label: "Terug naar dashboard", href: "/dashboard" }}
/>
```

### `<ListSkeleton>` (loading)
```tsx
export function ListSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div role="status" aria-label="Bezig met laden" className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-lg border border-gray-100 p-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

### `<TableEmptyRow>` voor tabellen
```tsx
<TableRow>
  <TableCell colSpan={cols} className="h-32 text-center text-gray-500">
    {filtersActive ? "Geen resultaten. Versoepel je filters." : "Nog geen records."}
  </TableCell>
</TableRow>
```

## Usage-patroon in pages

```tsx
function LeadsPage() {
  const { data, isLoading, isError, refetch } = useQuery({ ... });

  if (isLoading) return <ListSkeleton rows={8} />;
  if (isError) return <EmptyState title="Kon leads niet laden" action={{ label: "Opnieuw", onClick: refetch }} />;
  if (data.length === 0) {
    return filtersActive
      ? <EmptyState title="Geen resultaten" action={{ label: "Reset filters", onClick: reset }} />
      : <EmptyState title="Nog geen leads" description="..." action={{ label: "Setup", onClick: setup }} />;
  }
  return <LeadsTable data={data} />;
}
```

## Tone-keuze per stack

| Stack | Tone |
|---|---|
| HMB public/funnel | `friendly` — warm, B1, recovery-CTA helder |
| PT admin | `minimal` — direct, geen onnodige uitleg |
| Internal tools | `technical` — toon error-code voor support |

## Checklist
- [ ] Elke list-page heeft 4 states gedekt
- [ ] Skeletons matchen layout (geen jump bij load)
- [ ] `role="status"` op loading/empty, `role="alert"` op error
- [ ] Empty-first vs empty-filtered onderscheiden
- [ ] Recovery-actie ALTIJD aanwezig

## Combineer met
- `/ui-table` — empty-state in table-context
- `/error-boundary` — voor crash-states (boundary catches uncaught errors)
- `/ui-component` — voor de individuele `<EmptyState>`/`<ListSkeleton>` components
