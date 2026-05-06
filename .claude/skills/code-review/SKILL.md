---
name: code-review
description: Review een PR (van Roy, Noah, contractor of jezelf) op kwaliteit, security, brand-compliance, performance, en stack-conventies. Output is gestructureerde feedback (must-fix / nice-to-have / kudos). Anders dan /security-review (alleen security) en /simplify (fix issues); deze GEEFT feedback voor anderen. Gebruik wanneer Juan een PR moet reviewen.
trigger: /code-review
---

# /code-review

PR-review met dezelfde standaarden waarmee je zelf werkt. Output past in GitHub PR-comments (per regel) of als overall summary.

## Usage
```
/code-review <pr-url-of-branch>
/code-review <branch> --base <main>
/code-review <branch> --focus <security|perf|ux|tests|all>
/code-review <branch> --tone <strict|coaching|approve-with-nits>
```

## Review-rubric

### 1. Security
- [ ] Geen secrets in code (search: `API_KEY`, `SECRET`, `TOKEN`, `password`)
- [ ] User-input gevalideerd server-side (Zod)
- [ ] RLS gerespecteerd; geen `service_role` client-side
- [ ] SQL: geparametriseerd, geen string-concat
- [ ] Auth-checks aanwezig op protected routes
- [ ] Geen `dangerouslySetInnerHTML` zonder sanitization
- [ ] CORS-allowlist specifiek (geen `*` op authenticated)
- [ ] Geen stack-leak in 500-respons (productie)

### 2. Brand/UX (HMB-projecten)
- [ ] Geen emojis (zie NEXUS BOS regels)
- [ ] Geen prijsgaranties of exacte installatiekosten
- [ ] Geen concurrent-bashing
- [ ] B1 NL voor user-facing tekst
- [ ] Toestemming-checkbox NOOIT pre-checked (telemarketing-2026)
- [ ] Privacy-link aanwezig bij forms

### 3. Performance
- [ ] Geen `any[]` waar concrete type kan
- [ ] Memoization waar relevant (useMemo voor expensive derive)
- [ ] Lazy-load below-fold heavy components
- [ ] Geen `useEffect+fetch` in PT-code (gebruik TanStack Query)
- [ ] Bundle-impact gecheckt bij nieuwe lib-import
- [ ] Images via `next/image` of equivalent
- [ ] Geen client-side full-table-scans (DB-02)

### 4. Tests
- [ ] Tests aanwezig voor business-logic
- [ ] Happy + 2-3 error-paths gedekt
- [ ] Geen `expect(true).toBe(true)` placeholders
- [ ] Mock op de boundary (MSW), niet de business-fn

### 5. Code quality
- [ ] File <300 LOC of bewust opgesplitst
- [ ] Functies <50 LOC
- [ ] Naming concreet, geen `data`/`info`/`item`
- [ ] Geen TODO's zonder ticket-link
- [ ] Geen commented-out code
- [ ] Imports opgeschoond
- [ ] TypeScript strict (geen `@ts-ignore` zonder reden)

### 6. Conventions
- [ ] `"use client"` alleen waar nodig (Next.js)
- [ ] Cn helper voor class-merge (shadcn pattern)
- [ ] cva voor variants (niet inline ternary)
- [ ] Error-handling structureel (zie `/error-boundary`)
- [ ] Logging zonder PII

### 7. Documentation
- [ ] PR-description bevat why + test-plan
- [ ] README updated bij ENV-vars wijziging
- [ ] Migratie heeft rollback-snippet
- [ ] Breaking changes geflaggeerd

## Output structuur

```markdown
# Review: <PR-titel>

**Tone:** approve-with-nits  
**Total findings:** 2 must-fix, 4 nice-to-have, 3 kudos

## Must-fix (blokkeert merge)

### 🚫 `app/api/leads/route.ts:34` — service_role client-side leak
```diff
- const supabase = createClient(URL, SERVICE_ROLE_KEY);  // wordt naar client gezonden
+ // Move to /lib/supabaseAdmin.ts (server-only)
```
**Why:** Service-role bypassed RLS. Client-bundle kan met `view-source` worden geleest.

### 🚫 `_components/PhoneField.tsx:28` — pre-checked consent
```diff
- <input type="checkbox" defaultChecked={true} ... />
+ <input type="checkbox" defaultChecked={false} ... />
```
**Why:** Per 1 juli 2026 illegaal. Zie [[project_hmb_otp_telemarketing_2026]].

## Nice-to-have

- `_lib/utils.ts:12` — split deze 80-LOC fn in 3 (zie `/refactor extract-fn`)
- `app/dashboard/page.tsx:45` — `useMemo` voor `filteredItems` (re-renders bij elke key-press)
- ...

## Kudos

- Goeie naming op `OtpChallengeRow`-type — duidelijk wat het is
- Test-coverage 4 paths op `verify` — solid
- ...

## Suggested next steps

1. Fix must-fix items
2. Squash + merge (commits zijn nu 12, 1 logische change)
```

## Tone-keuze

| Tone | Wanneer |
|---|---|
| `strict` | Junior-PR, eerste keer in de codebase, security-kritiek |
| `coaching` | Mid-level, want te helpen leren |
| `approve-with-nits` | Senior, want quick-merge maar met punten ter overweging |

## Hard rules — wat code-review NIET doet

- **Niet de auteur kapotmaken** — feedback op code, niet persoon
- **Niet bike-shedden** — als geen functioneel verschil, skip "ik zou het anders schrijven"
- **Niet alleen problemen** — kudos voor goede patronen
- **Niet vaag** — "kan beter" zonder hoe = nutteloos. Altijd voorstel
- **Niet alles op gelijke voet** — must-fix vs nice-to-have helder

## Review-flow

1. **Lees PR-description** — begrijp doel + scope
2. **`git diff <base>..HEAD`** — overall view
3. **Per file** — focus op gewijzigde regels (`+`/`-`)
4. **Run** lokaal als mogelijk — `npm run build` + tests
5. **Check** tegen rubric per file-type
6. **Compose** feedback per `must-fix` / `nice-to-have` / `kudos`
7. **Approve / request-changes** met motivering

## Bij PR van Roy/Noah specifiek

- **Roy** (ops): focus op security, RLS, CORS — UX is niet z'n wereld
- **Noah** (binnendienst): meestal config/data — geen code-quality feedback nodig
- Bij twijfel: schrijf comment ipv "request changes" — laat ruimte voor uitleg

## Combineer met
- `/security-review` — voor security-only deep-dive
- `/test-write` — als je tests wilt vragen
- `/refactor` — als je structurele wijziging adviseert
- `/git-pr` — voor je eigen PR-description
