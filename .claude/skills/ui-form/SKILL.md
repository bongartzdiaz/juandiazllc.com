---
name: ui-form
description: Bouw een complete React-form met react-hook-form + Zod + shadcn — inclusief validatie, error-states, submit-handling, accessibility, loading/disabled states. Werkt voor PT, HMB, funnel-app. Gebruik wanneer Juan vraagt "maak een form voor X", bij elke nieuwe lead/contact/intake/instellings-form, of bij refactor van bestaande form naar RHF+Zod.
trigger: /ui-form
---

# /ui-form

Form-bouw met de stack-defaults: react-hook-form + Zod + shadcn. Server-side validation met dezelfde Zod-schema (single source of truth).

## Usage

```
/ui-form <naam> <doel>
/ui-form <naam> --fields "<csv>"           # bv "naam:string,email:email,tel:phone-nl,verbruik:select"
/ui-form <naam> --stack <pt|hmb|funnel|generic>
/ui-form <naam> --submit <api-route|server-action|callback>
/ui-form <naam> --steps <n>                # multi-step form
```

## Hard rules

### Stack-keuzes
- **react-hook-form** voor state + validatie
- **@hookform/resolvers/zod** voor Zod-integratie
- **zod** voor schema (gedeeld met server-side)
- **shadcn `<Form>` primitives** (FormField, FormItem, FormLabel, FormControl, FormMessage)
- **Zod-schema in `_lib/schemas/<naam>.ts`** — single source of truth voor client + server

### Validation-patroon
- Schema apart van component (in `_lib/` of `lib/schemas/`)
- Server-side parse met dezelfde schema in `app/api/<route>/route.ts`
- Geen 2× validatie-regels, geen drift tussen client en server

### Compliance defaults
- Bij telefoon-form (HMB/funnel): vink ALTIJD telemarketing-2026 op (zie [[hmb-otp-v1-2026-05-04]])
- Form heeft privacy-link (footer of inline bij consent)
- Marketing-checkbox NOOIT pre-checked
- Specifiek doel benoemd ("voor offerte thuisbatterij" niet "voor onze diensten")

## Output structuur

1. **`_lib/schemas/<naam>.ts`** — Zod schema + types + parse helper
2. **`_components/<Naam>Form.tsx`** — RHF + shadcn component
3. **`api/<route>/route.ts`** (optioneel) — server-side parse + handle
4. **Gebruiksvoorbeeld** in parent-page

## Standaard veld-types

| Type | Zod | UI |
|---|---|---|
| `string` | `z.string().trim().min(2).max(60)` | `<Input>` |
| `email` | `z.string().email()` | `<Input type="email" autoComplete="email">` |
| `phone-nl` | `.refine(/^(\+31|0031|0)6[\s-]?\d{8}$/)` | `<Input type="tel" inputMode="tel" autoComplete="tel">` |
| `postcode-nl` | `.regex(/^\d{4}\s?[A-Z]{0,2}$/)` | `<Input>` met auto-uppercase |
| `verbruik` | `z.enum(["lt2500","2500-3500","3500-5000","gt5000","unknown"])` | `<Select>` |
| `optin` | `z.boolean().refine(v=>v===true)` | `<Checkbox>` |
| `textarea` | `z.string().min(10).max(500)` | `<Textarea>` |
| `date` | `z.string().regex(...)` of `z.date()` | `<DatePicker>` (shadcn) |
| `file` | custom — accepteert File-object | `<Input type="file">` |

## Form-skeleton template

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Foo, fooSchema } from "@/lib/schemas/foo";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Props {
  onSuccess?: (data: Foo) => void;
}

export function FooForm({ onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<Foo>({
    resolver: zodResolver(fooSchema),
    defaultValues: { /* ... */ },
  });

  async function onSubmit(values: Foo): Promise<void> {
    setSubmitting(true);
    setServerError(null);
    try {
      const resp = await fetch("/api/foo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const j = await resp.json();
      if (!resp.ok) {
        setServerError(j.error || "Er ging iets mis. Probeer opnieuw.");
        return;
      }
      onSuccess?.(values);
    } catch {
      setServerError("Geen verbinding. Probeer opnieuw.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* ...meer velden... */}

        {serverError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Bezig..." : "Verstuur"}
        </Button>
      </form>
    </Form>
  );
}
```

## Multi-step flow (`--steps n`)
- State `currentStep` (0..n-1) in parent of zustand
- Per stap eigen Zod-subschema; finale schema is `.merge()` of `.intersection()`
- Progress indicator (`<Progress>` of stap-dots)
- "Vorige" knop op stap 2+
- Validate huidige stap vóór `next()` (`form.trigger(fieldsInThisStep)`)
- Persistentie tussen stappen via `defaultValues` of `localStorage` (NOOIT PII)

## Accessibility-checklist
- [ ] Elke `<Input>` heeft een `<FormLabel>` (shadcn `FormLabel` rendert `<label htmlFor>`)
- [ ] `autoComplete` correct: `name`, `email`, `tel`, `postal-code`, `street-address`, `cc-number`
- [ ] `inputMode` waar relevant (`numeric`, `tel`, `email`)
- [ ] Errors via `<FormMessage>` zijn `aria-describedby`-gekoppeld
- [ ] Submit-state heeft `aria-busy="true"` op de form
- [ ] Server-errors gebruik `role="alert"`
- [ ] Submit-knop disabled tijdens request, niet alleen "verberg"

## Output flow
1. **Brief** — bevestig velden, validatie-regels, submit-doel
2. **Schema-file** (`_lib/schemas/<naam>.ts`)
3. **Component-file** (`_components/<Naam>Form.tsx`)
4. **API-route** (optioneel, alleen als `--submit api-route`)
5. **Gebruiksvoorbeeld** in parent-page
6. **Test-stub** met 3 cases (happy, validation-fail, server-error)

## Combineer met
- `/api-route` — voor de server-side endpoint
- `/copy-check` — review error-messages en labels op B1 + brand
- `/funnel-copy consent-otp` — als form telefoon-veld heeft (telemarketing-2026)
- `/a11y-audit` — review na bouwen
