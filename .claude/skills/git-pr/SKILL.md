---
name: git-pr
description: Genereer een complete PR-description (titel + summary + test-plan + screenshot-checklist + risk-assessment) voor de huidige branch. Pulls van git diff/log + relevante context. Output past in `gh pr create --body` template. Gebruik wanneer Juan klaar is met een feature en de PR wil openen — bespaart 5 min schrijven per PR + zorgt voor consistente review-quality.
trigger: /git-pr
---

# /git-pr

PR-description schrijven die de reviewer in 30 seconden begrijpt. Tegenover wat-changed-tells-itself: de description vertelt **waarom** + **wat te checken**.

## Usage

```
/git-pr
/git-pr --base <branch>             # default main of master
/git-pr --type <feat|fix|refactor|chore|docs|perf|sec>
/git-pr --linear <issue-id>         # link Linear-issue
/git-pr --no-screenshot             # skip screenshot-checklist
```

## Hard rules

### Title
- Max 70 chars
- Format: `<type>(<scope>): <imperatief>`
- Voorbeelden:
  - `feat(otp): add SMS verification flow for telemarketing-2026`
  - `fix(submit): gate mock-pad on NODE_ENV in production`
  - `refactor(ratelimit): move from in-memory to Postgres-backed`
  - `sec(rls): revoke mat-views from anon role`
- NIET: "Update files", "Improvements", "Misc fixes"

### Summary (1-3 bullets)
Lead met **why**, niet what. Reviewer ziet diff voor what.

Slecht: `- Added send-otp route`  
Goed: `- Lead-form moet vóór 1 juli 2026 expliciete telefoon-opt-in hebben (telemarketing-wet); SMS-OTP via MessageBird is de gouden standaard voor consent-bewijs.`

### Test-plan (markdown checklist)
Wat moet de reviewer (of jij na merge) checken om te weten dat het werkt? Concreet:

```markdown
## Test plan
- [ ] Lokaal: `npm run dev`, fill form `/offerte-check`, klik Verstuur code → SMS arriveert (of mock-log toont code)
- [ ] OTP modal opent na verstuur, code uit log invullen → success-state
- [ ] Verkeerde code 5× → toont max_attempts error
- [ ] Wacht 11 min na challenge → toont expired error
- [ ] Submit form → `hmb_leads` row heeft `phone_verified_at`, `telemarketing_opt_in=true`
- [ ] Probeer dezelfde verify-token 2× via curl → 2e geeft `token_already_used`
```

NIET: "Test it works" / "Manual test".

### Risk-assessment (verplicht voor non-trivial PR)
1 regel per risico-laag. Skip als alles `none`.

```markdown
## Risk
- **Production data**: none — alleen new tables/columns, IF NOT EXISTS
- **Breaking API**: none — submit-route nog backwards-compatible bij `verify_token` aanwezig
- **Rollout**: gradueel — feature-flag kan later, nu env-flag MOCK_SMS
- **Rollback**: `gh pr revert` werkt; DB-rollback in `migrations/<...>.sql` einde van file
```

### Screenshot-checklist (voor UI-PRs)

```markdown
## Screenshots
- [ ] Desktop happy-path
- [ ] Mobile happy-path (iPhone 14 size)
- [ ] Error-state (rate-limit getoond)
- [ ] Loading-state
- [ ] Dark-mode (als project dark-mode heeft)
```

Markeer met TODO's; reviewer plakt screenshots in.

### Linked issues / context

```markdown
## Context
- Vault: [[10-Projecten/HMB/project_otp_telemarketing_2026_05_04]]
- Wet: [Rijksoverheid 15-05-2025](https://www.rijksoverheid.nl/...)
- Closes #123
```

## Voorbeeld-output

```markdown
feat(otp): add SMS verification flow for telemarketing-2026

## Summary
- Per 1 juli 2026 vervalt soft opt-in voor telemarketing in NL — elk gebeld nummer
  moet aantoonbare expliciete opt-in hebben. SMS-OTP via MessageBird is gouden
  standaard voor consent-bewijs.
- Implementeert volledige server-side OTP-stack (libs + 2 API-routes + DB-schema)
  + UI components (TrustBadge, PhoneVerifyStep, OtpModal) + privacy-page.

## Wat verandert
- Nieuw: `app/_lib/{otp,messagebird,verifyToken,supabaseAdmin,rateLimit,consent}.ts`
- Nieuw: `app/api/otp/send/route.ts`, `app/api/otp/verify/route.ts`
- Modified: `app/api/offerte-check/submit/route.ts` — vereist `verify_token`
- Nieuw: 3 Supabase migraties (otp_challenges, RPC, consent-velden, REVOKE mat-views)
- Nieuw: UI components in `app/_components/` en `app/offerte-check/_components/`

## Test plan
- [ ] DB-migraties geapplyd op staging Supabase
- [ ] `MESSAGEBIRD_API_KEY` + `OTP_PEPPER` + `OTP_VERIFY_SECRET` env-vars gezet
- [ ] Lokaal: `MOCK_SMS=true` → form-submit → modal → code uit log → success
- [ ] Met live MessageBird: SMS arriveert binnen 30s op eigen 06-nummer
- [ ] Wrong code 5× → 6e poging gaf max_attempts
- [ ] Token-replay: zelfde verify_token 2× → 2e = 409 token_already_used
- [ ] Mat-views: anon-key kan NIET meer SELECTen op `mv_*`
- [ ] Privacy-page op `/privacy` rendert alle 8 verwerkers

## Risk
- **Production data**: none — alleen IF NOT EXISTS tables/columns
- **Breaking API**: minor — submit-route eist nu `verify_token`. Bestaande clients
  (er zijn er nog geen, funnel is unlaunched) zonder token krijgen 401.
- **Rollback**: migraties hebben rollback-snippet. Code revert via `gh pr revert`.

## Screenshots
- [ ] Trust-badge boven form
- [ ] Phone-veld + consent-checkbox
- [ ] OTP-modal (mobile)
- [ ] Success-state
- [ ] Privacy-page

## Context
- Vault: [[10-Projecten/HMB/project_otp_telemarketing_2026_05_04]]
- Wet: [Rijksoverheid 15-05-2025](https://www.rijksoverheid.nl/actueel/nieuws/2025/05/15/ongevraagd-bellen-per-juli-2026-beperkt-wetsvoorstel-bedenktijd-deurverkoop)
- Vorige Audit: [[20-Kennis/Compliance/_Compliance-index]]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Output flow

1. **Run** parallel:
   - `git status` (branch + uncommitted)
   - `git log <base>..HEAD --oneline`
   - `git diff <base>...HEAD --stat`
2. **Group** changes per scope/area
3. **Detect** type uit conventional-commit prefix in commits
4. **Compose** title + summary + test-plan + risk + screenshots + context
5. **Print** als `gh pr create` HEREDOC ready-to-run:

```bash
gh pr create --title "..." --body "$(cat <<'EOF'
...
EOF
)"
```

## Heuristiek voor test-plan

Per file-type ander default:

| File-pattern | Default test-plan items |
|---|---|
| `**/*.test.ts` | Run `npm test <pad>`, all green |
| `**/api/**/route.ts` | curl happy + 1 error-path |
| `**/_components/*.tsx` | Visual check + keyboard nav |
| `**/migrations/*.sql` | Apply staging eerst, run verify-queries |
| `**/auth/*.ts` | Re-login + token-refresh test |

## Stack-specifiek

### Conventional commits scope
- HMB Dashboard: `(hmb)`, `(dashboard)`
- funnel-app: `(funnel)`, `(otp)`, `(submit)`
- PT: `(pt)`, `(rls)`, `(api)`, `(ui)`
- Supabase: `(db)`, `(rpc)`, `(rls)`, `(migrations)`

### Linear/issue auto-link
- `--linear PT-123` → "Closes PT-123" + URL

## Combineer met
- `/security-review` — als PR security-impact heeft
- `/test-write` — voeg tests toe vóór PR
- `/refactor` — als PR een refactor is, voeg before/after voorbeeld toe
