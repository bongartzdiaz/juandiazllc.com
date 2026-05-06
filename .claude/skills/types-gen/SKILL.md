---
name: types-gen
description: Genereer of regenereer TypeScript types vanuit Supabase schema. Volgt npm-script + Database-type pattern. Detect drift tussen lokale types en remote schema. Gebruik na elke DB-migratie of wanneer Juan vraagt "regen types" / "type errors na schema-wijziging".
trigger: /types-gen
---

# /types-gen

Type-generation pipeline voor Supabase. Houd types in sync met DB-schema; voorkom runtime errors door drift.

## Usage
```
/types-gen <project>
/types-gen <project> --output <pad>
/types-gen <project> --check-drift            # alleen detectie, geen schrijf
/types-gen <project> --branch <staging|main>
```

## Setup eenmalig per repo

### Install Supabase CLI
```bash
npm install -D supabase
# of global:
brew install supabase/tap/supabase
```

### Login + link
```bash
npx supabase login
npx supabase link --project-ref pssmedgsbwyggsovpnvg
```

### npm-script in `package.json`
```json
{
  "scripts": {
    "types:gen": "supabase gen types typescript --linked > src/types/supabase.ts",
    "types:check": "tsc --noEmit",
    "types:gen-and-check": "npm run types:gen && npm run types:check"
  }
}
```

### Imports-helper
```ts
// src/types/supabase.ts (auto-generated, niet editen)
export type Database = { ... };

// src/types/db.ts (handmatig — handige aliases)
import type { Database } from "./supabase";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

// Domain-aliases
export type Lead = Tables<"hmb_leads">;
export type LeadInsert = TablesInsert<"hmb_leads">;
export type OtpChallenge = Tables<"otp_challenges">;
```

### Supabase client met typing
```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Nu krijg je auto-completion op `.from("hmb_leads").select("name, email")` met typed rows.

## Use-case patterns

### Type een query-result
```ts
import type { Lead } from "@/types/db";

const { data } = await supabase.from("hmb_leads").select("*");
// data: Lead[] | null  ← auto-typed via Database<>
```

### Type een insert
```ts
import type { LeadInsert } from "@/types/db";

const lead: LeadInsert = {
  email: "x@example.nl",
  phone: "+31612345678",
  // 'id' / 'created_at' optional — DB defaults
};
await supabase.from("hmb_leads").insert(lead);
```

### Type een RPC
```ts
const { data } = await supabase.rpc("otp_rate_check", {
  p_phone: "+31612345678",
  p_ip: "0.0.0.0",
});
// data: typed via Database["public"]["Functions"]["otp_rate_check"]["Returns"]
```

## Drift detection

### CI-check (GitHub Actions)
```yaml
- name: Check type drift
  run: |
    npx supabase gen types typescript --linked > /tmp/fresh.ts
    diff src/types/supabase.ts /tmp/fresh.ts || \
      (echo "::error::Types out of sync. Run 'npm run types:gen' locally and commit."; exit 1)
```

### Lokaal pre-commit hook (husky)
```bash
# .husky/pre-commit
npm run types:gen
git diff --quiet src/types/supabase.ts || \
  (echo "Types regenerated, please re-stage."; exit 1)
```

## Workflow per scenario

### Na nieuwe migratie
```bash
# 1. Apply migratie (zie /db-migration)
npx supabase db push

# 2. Regen types
npm run types:gen

# 3. Check compile-errors
npm run types:check

# 4. Fix errors waar schema-wijziging types breekt
# 5. Commit beide: migratie + types
git add supabase/migrations/<...>.sql src/types/supabase.ts
git commit -m "feat(db): add otp_challenges + regen types"
```

### Bij staging vs main verschil
```bash
# Vergelijk staging-types met main
npx supabase gen types typescript --linked --schema public > types-staging.ts
git fetch origin main
git checkout origin/main -- src/types/supabase.ts
diff src/types/supabase.ts types-staging.ts
```

## Hard rules

- **Types-file is read-only** — alleen via `gen` updaten, nooit handmatig
- **Domain-aliases in eigen file** (`db.ts`) — voorkomt merge-conflicts bij regen
- **Commit migratie + types samen** — een PR die migratie merged zonder types breekt main
- **Geen `any` casting** om type-errors weg te drukken — fix de root cause

## Stack-specifieke aandachtspunten

### PT (Vite)
Existing `src/integrations/supabase/types.ts` — gebruik dat bestaande pad.

### Next.js (App Router)
Server- en client-components beide importeren `Database` type. Werkt out-of-box.

### Edge functions (Deno)
Geen TS via `gen` — schrijf types handmatig in `_shared/types.ts`. Eventueel: kopieer relevant subset uit Next.js `supabase.ts` na regen.

## Combineer met
- `/db-migration` — types regen ALTIJD na migratie
- `/migration-fix` — bij drift staging vs prod
- `/refactor` — bij grote rename: regen + run `tsc` om alles te vinden
