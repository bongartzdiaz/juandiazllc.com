---
name: i18n-extract
description: Extract hardcoded strings naar i18n keys (NL/EN/ES) — voor Voltafy CAD (battery-system), HMB international expansion, BesparenBelgie. Werkt met next-intl, i18next, of paraglide. Detect missing keys, ongebruikte keys, plurals, interpolation. Gebruik wanneer Juan een component naar i18n wil migreren of nieuwe locale toevoegt.
trigger: /i18n-extract
---

# /i18n-extract

String-extraction + key-management voor multi-locale apps.

## Usage
```
/i18n-extract <pad>
/i18n-extract <pad> --locales "nl,en,es"
/i18n-extract <pad> --lib <next-intl|i18next|paraglide>
/i18n-extract <pad> --action <extract|find-missing|find-unused|translate>
```

## Library-keuzes

| Lib | Voor | Kenmerk |
|---|---|---|
| **next-intl** | Next.js App Router (HMB Dashboard, funnel-app, Philly) | Server + client, message-format, tijdzones |
| **i18next** | Vite (PT) + general | Mature, plugin-rijk |
| **paraglide-js** | Build-time, type-safe | Kleinste bundle, compile-time keys |
| **format.js (react-intl)** | Legacy | Vermijden voor new code |

Voor Voltafy CAD (Vite-based?): **i18next** of **paraglide**.

## File-structuur (next-intl voorbeeld)

```
app/
├── [locale]/
│   ├── layout.tsx
│   ├── page.tsx
│   └── ...
└── i18n.ts                # locale-config

messages/
├── nl.json
├── en.json
└── es.json

middleware.ts              # locale-routing
```

## Setup eenmalig (next-intl)

```bash
npm install next-intl
```

```ts
// middleware.ts
import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["nl", "en", "es"],
  defaultLocale: "nl",
  localePrefix: "as-needed",
});

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
```

```ts
// i18n.ts
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

## Extract pattern

### Voor (hardcoded)
```tsx
export function HeroSection() {
  return (
    <section>
      <h1>Bereken je besparing in 2 minuten</h1>
      <p>Gratis advies, geen aankoopplicht.</p>
      <button>Start berekening</button>
    </section>
  );
}
```

### Na (next-intl)
```tsx
import { useTranslations } from "next-intl";

export function HeroSection() {
  const t = useTranslations("HomePage.hero");
  return (
    <section>
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <button>{t("cta")}</button>
    </section>
  );
}
```

`messages/nl.json`:
```json
{
  "HomePage": {
    "hero": {
      "title": "Bereken je besparing in 2 minuten",
      "subtitle": "Gratis advies, geen aankoopplicht.",
      "cta": "Start berekening"
    }
  }
}
```

`messages/en.json`:
```json
{
  "HomePage": {
    "hero": {
      "title": "Calculate your savings in 2 minutes",
      "subtitle": "Free advice, no purchase obligation.",
      "cta": "Start calculation"
    }
  }
}
```

## Plurals

```json
{
  "leads": {
    "count": "{count, plural, =0 {Geen leads} =1 {1 lead} other {# leads}}"
  }
}
```

```tsx
{t("leads.count", { count: 12 })}  // → "12 leads"
{t("leads.count", { count: 1 })}   // → "1 lead"
```

## Interpolation

```json
{
  "welcome": "Hallo {name}, welkom terug"
}
```

```tsx
{t("welcome", { name: user.firstName })}
```

## Server-side (Next.js Metadata)

```tsx
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: "HomePage" });
  return {
    title: t("hero.title"),
    description: t("hero.subtitle"),
  };
}
```

## Hard rules

### Naming-conventies
- **Hierarchical keys** (`HomePage.hero.title`) — niet flat (`home_hero_title`)
- **Per-page namespace** — voorkom collisions, makkelijk reviewen
- **Geen sentences als key** — gebruik semantic name (`hero.cta` niet `start_calculation`)
- **Action-words in cta-keys** (`save`, `cancel`, `submit`)

### Brand-rules per locale (HMB)
- NL: tutoyeren ("je"), B1, geen marketing-hype
- EN: same tone, formal "you", British spellings (calculate niet calculate)
- ES: tutoyeren ("tú"), regional default = Spain Spanish (es-ES)

### Anti-patterns
- **Geen string-concat** — `"Hello " + name` werkt niet voor RTL of word-order verschillen
- **Geen hard-coded plurals** — `{count} ${count === 1 ? "lead" : "leads"}` → use ICU plural format
- **Geen string in code voor user-text** — alles via `t()`

## Detection-actions

### Find missing keys

```bash
# Alle keys die in nl.json maar niet in en.json staan
diff <(jq -r 'paths(scalars) | join(".")' messages/nl.json | sort) \
     <(jq -r 'paths(scalars) | join(".")' messages/en.json | sort)
```

### Find unused keys (in codebase)

```bash
# Voor elke key in nl.json: grep in src/ — geen hits = unused
for key in $(jq -r 'paths(scalars) | join(".")' messages/nl.json); do
  grep -rq "\"$key\"" src/ || echo "UNUSED: $key"
done
```

### Find hardcoded strings (extract candidates)

```bash
# Find JSX text-content dat niet via t() loopt
grep -rE '>[A-Z][a-z]+ [a-z]+ [a-z]+' --include="*.tsx" src/ | grep -v 't('
```

## Translate-flow

1. **Extract** — alle hardcoded → `nl.json` (master locale)
2. **Translate** — gebruik `/translate` skill of DeepL voor `en.json`/`es.json`
3. **Review** — native speaker passage door
4. **Test** — locale-switch in dev, controleer overflow/layout

## Combineer met
- `/translate` — voor de daadwerkelijke vertaling NL→EN/ES
- `/copy-check` — review per locale tegen brand
- `/refactor` — voor grootschalige extract
- `/responsive-check` — verschillende locales hebben andere lengtes
