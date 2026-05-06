---
name: ui-component
description: Bouw een React-component (shadcn + Tailwind + TS) volgens Juan's stack-conventies — met variants, accessibility, dark mode, typing, en gebruiksvoorbeeld. Werkt voor Performance Tracker (Vite), HMB Dashboard (Next.js), funnel-app (Next.js 14), Philly (Next.js 16). Gebruik wanneer Juan vraagt "schrijf component X", "maak een Y-card", "bouw badge/button/input/...", of bij refactor van bestaande inline JSX naar herbruikbaar component.
trigger: /ui-component
---

# /ui-component

Bouwt een React-component volgens Juan's standaard: shadcn-stijl + Tailwind + TS strict + a11y + dark-mode + Red Hat Mono waar van toepassing.

## Usage

```
/ui-component <naam> <doel>
/ui-component <naam> --type <atom|molecule|organism>
/ui-component <naam> --stack <pt|hmb|funnel|philly|generic>
/ui-component <naam> --variants "<csv>"            # bv "default,outline,ghost,destructive"
/ui-component <naam> --sizes "<csv>"               # bv "sm,md,lg"
/ui-component <naam> --client                       # forceer "use client" (Next.js)
```

## Hard rules

### Stack-keuzes
- **Tailwind classes** — geen inline styles, geen styled-components
- **shadcn/ui patroon** — `cva` voor variants, `cn()` helper voor class merge, `forwardRef` voor leaf components
- **TypeScript strict** — geen `any`, expliciete prop-types, exporteer Props-type
- **Accessible by default** — labels, ARIA, focus-states, keyboard nav
- **Dark mode** — gebruik `dark:` modifier, geen hardcoded kleuren waar tokens bestaan
- **Geen emojis** in component-output
- **B1 NL** in user-facing strings (waar van toepassing)

### Stack-specifieke flags

| Stack | Folder | Imports | Notes |
|---|---|---|---|
| `pt` | `src/components/<scope>/` | `@/components/ui/...`, `@/lib/utils` | Vite + React 18, geen `"use client"` |
| `hmb` | `app/_components/` of `app/<route>/_components/` | `next/link`, `next/image` | App Router, gebruik `"use client"` alleen als nodig |
| `funnel` | `app/_components/` of `app/offerte-check/_components/` | idem | "use client" voor interaction |
| `philly` | `src/components/...` | Next.js 16 + Prisma | check bestaande conventies |
| `generic` | n.v.t. | minimaal | exporteer kant-en-klaar snippet |

### Variants-pattern (cva)

```ts
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const fooVariants = cva(
  "base-classes-here",
  {
    variants: {
      variant: {
        default: "...",
        outline: "...",
      },
      size: {
        sm: "...",
        md: "...",
        lg: "...",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface FooProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof fooVariants> {
  // domein-props hier
}
```

## Output structuur

1. **Imports** — minimaal, type-imports gescheiden
2. **Variants** — cva-block (alleen als 2+ variants gevraagd)
3. **Props-interface** — geëxporteerd, JSDoc per non-trivial prop
4. **Component** — `forwardRef` als het DOM-element dat ondersteunt, anders gewone functie
5. **displayName** voor DevTools
6. **Default export** alleen als bestand 1 export heeft, anders named
7. **Gebruiksvoorbeeld** in JSDoc-comment boven de component

## Accessibility-checklist (volg ALTIJD)

- [ ] Interactieve elementen krijgen `aria-label` of zichtbare label
- [ ] Buttons gebruiken `<button>`, geen `<div onClick>`
- [ ] Focus-state zichtbaar (`focus-visible:ring-2`)
- [ ] Disabled-state heeft `aria-disabled` + visueel verschil (`opacity-50`, `cursor-not-allowed`)
- [ ] Form-inputs hebben `id` + `<label htmlFor>` of `aria-labelledby`
- [ ] Modals/dialogs: `role="dialog"`, `aria-modal="true"`, focus-trap, ESC-close
- [ ] Loading-state heeft `aria-busy="true"` of `role="status"` + `aria-live`
- [ ] Errors gebruik `role="alert"` of `aria-describedby`
- [ ] Keyboard nav werkt — geen mouseover-only interactions
- [ ] Color contrast WCAG AA (4.5:1 voor body, 3:1 voor large)

## Tailwind-tokens (HMB brand defaults)

- Primary green: `bg-emerald-600`, `text-emerald-700`, `border-emerald-200`
- Neutral gray: `bg-gray-50`, `text-gray-900`, `border-gray-200`
- Danger: `bg-red-50`, `text-red-700`, `border-red-200`
- Success: `bg-emerald-50`, `text-emerald-700`
- Spacing-rhythm: `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8` (vermijd `gap-5`/`gap-7`)
- Radius: `rounded-md` (sm), `rounded-xl` (cards), `rounded-2xl` (modals/sheets)
- Shadow: `shadow-sm` (cards), `shadow-md` (raised), `shadow-xl` (modal)

## Output flow

1. **Brief** — bevestig: stack, locatie-pad, variants, props
2. **Component-code** — kant-en-klaar, met imports
3. **Gebruiksvoorbeeld** — 2-3 regels JSX waar dit component in gebruikt wordt
4. **Tests-suggestie** — 1 zin per kritisch gedrag (unit/visual/a11y)
5. **Open vragen** — als er aannames zijn, lijst ze; anders niets

## Bij `--type organism`
- Splits in subcomponents (eigen file per subcomponent als >50 LOC)
- Beheer state via props, niet intern (tenzij echt zelfstandig)
- Bied composable API: `<Card>`, `<Card.Header>`, `<Card.Body>`

## Bij Performance Tracker (`--stack pt`)
- Check bestaande conventies in `c:\Users\LENOVO\Downloads\Volitfy\performance-tracker\src\components`
- shadcn-componenten staan in `src/components/ui/`
- TanStack Query voor data-fetching — geen `useEffect+fetch`
- Routes via React Router v6, geen `next/link`

## Bij funnel-app (`--stack funnel`)
- Locatie default: `app/_components/` voor cross-page, anders `app/<route>/_components/`
- "use client" alleen als nodig (interaction, useState, browser API)
- Gebruik bestaand `_lib/track.ts` voor events

## Combineer met
- `/a11y-audit` — review na bouwen
- `/test-write` — voeg tests toe
- `/storybook` (TODO) — voeg story toe als project Storybook heeft
- `/refactor` — als het component te groot wordt
