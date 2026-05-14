# Rebrand Plan — Philly → DEUS

> Plan only. Execution happens on a dedicated branch (`claude/rebrand-philly-to-deus`), broken into 5 sequenced PRs against `main` (or against `claude/ai-command-bar` before its merge).
> Drafted: 2026-05-14

---

## Scope summary

**Before rebrand state (as of `4ee75af`):**

| Metric | Count |
|---|---|
| Source mentions of "philly" (case-insensitive) | 3,345 |
| Top-level folders named with "philly" | 9 |
| Package.json names containing "philly" | 1 (`philly-crm`) |
| Visible UI brand strings | "Philly Dashboard — Business Platform" |

**After rebrand target state:**

| Metric | Count |
|---|---|
| Customer-facing "philly" mentions | 0 |
| Internal-only "Philly" mentions in legacy comments | OK to leave (history) |
| Top-level folder names with "philly" | 0 |
| Package.json name | `deus-crm` |
| Visible UI brand strings | "DEUS Dashboard" |

**Out of scope of this rebrand:**
- DEUS-SHARED mirror-repo name — keep, that's the partner-deploy target
- Git history — never rewrite history, the philly past stays in git log
- External integrations / API consumers — see Section 7 below for the migration plan

---

## Why a dedicated branch (not on PR #10)

PR #10 (`claude/ai-command-bar`) is the Stripe + welcome flow + 4-locale parity work from Session 4. Mixing a 3,000-line refactor into it:

- Massively expands the PR's diff size → harder to review
- Risks merge conflicts with any in-flight work on `main`
- Couples two unrelated changes ("ship Stripe + i18n" vs "rebrand product")

Use a dedicated `claude/rebrand-philly-to-deus` branch. Sequence:

1. Wait for PR #10 to merge OR branch off `claude/ai-command-bar` (then rebase later)
2. 5 sub-PRs against that branch (see Section 4)
3. When all 5 land, merge the rebrand branch → main

---

## Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Production URL changes break customer bookmarks | HIGH | Add 301 redirects from `/philly/*` → `/deus/*` in `next.config.mjs` middleware; keep redirects forever (cheap) |
| Public API consumers using `/philly/api/*` endpoints | HIGH | Inventory consumers first (search Vercel logs for past 90 days); notify each; keep `/philly/api/*` aliases for 6 months |
| Environment variable names with `PHILLY_*` prefix break deploys | MEDIUM | Add `DEUS_*` env vars first (alongside PHILLY_*), code reads both during transition, drop `PHILLY_*` after 1 release |
| Prisma model names with `philly` field references | MEDIUM | Add new fields, migrate data, deprecate old fields over 2 releases — never rename columns in single migration |
| DEUS-SHARED mirror sync workflow breaks | MEDIUM | Update `sync-deus-shared.yml` to use new paths after Phase 3 folder renames land |
| Documentation drift across `docs/user/{en,nl,de,es}/` | LOW | Use scripted find-replace on docs/user/, manual review of each file |
| MEMORY.md auto-memory mentions Philly | LOW | Update memory references after rebrand stabilizes (not blocking) |
| Brand assets (logo, favicon, og:image) still say Philly | MEDIUM | Add design task to backlog: 5 new asset files (logo SVG, favicon ICO, OG card PNG, 3 social variants) |

---

## Sequenced execution plan (5 PRs)

### PR-A — Brand assets + visible strings (lowest risk, fastest)

**Scope:** No path changes, no schema changes. Just text + assets.

**Files affected (estimated):**
- `app/layout.tsx` — site title metadata
- `app/page.tsx` — heading copy
- `apps/philly-standalone/app/layout.tsx` — dashboard title
- `apps/philly-standalone/app/welcome/page.tsx` — wizard copy
- `messages/*.json` — all 4 locales (~50 string replacements per locale)
- All `docs/user/{en,nl,de,es}/` markdown — ~200 docs total
- `README.md`
- Brand assets: logo SVG, favicon, OG card, social headers

**Risk:** Zero — pure content change.
**Estimated size:** ~150 files, ~1,500 line-changes.
**Review difficulty:** Low — most changes are find-replace.

### PR-B — Env vars + Stripe metadata aliases

**Scope:** Add `DEUS_*` env vars alongside `PHILLY_*`. Code reads `DEUS_*` first, falls back to `PHILLY_*`.

**Files affected:**
- `apps/philly-standalone/lib/philly/billing/stripe.ts` — env var reads
- `lib/philly/billing/stripe.ts` — env var reads (root-side mirror)
- `.env.example` — add `DEUS_*` entries
- Stripe customer metadata: add `deus_tier` field alongside `philly_tier`

**Risk:** Low — backward compatible, no removals yet.
**Estimated size:** ~30 files.

### PR-C — Folder renames (most disruptive — single PR, single moment)

**Scope:** Rename 9 folders. All imports update in lockstep.

**Folder renames:**
- `app/philly/` → `app/deus/`
- `apps/philly-standalone/` → `apps/deus-standalone/`
- `components/philly/` → `components/deus/`
- `hooks/philly/` → `hooks/deus/`
- `i18n/philly/` → `i18n/deus/`
- `lib/philly/` → `lib/deus/`
- `apps/philly-standalone/components/philly/` → `apps/deus-standalone/components/deus/`
- `apps/philly-standalone/hooks/philly/` → `apps/deus-standalone/hooks/deus/`
- `apps/philly-standalone/lib/philly/` → `apps/deus-standalone/lib/deus/`

**Files affected:** ~500 (every file that imports from one of these folders).

**Tooling:**
```bash
# 1. Git mv for each folder (preserves history)
git mv app/philly app/deus
git mv apps/philly-standalone apps/deus-standalone
# ... etc

# 2. Update all imports
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" \) \
  -not -path "./node_modules/*" -not -path "./.next/*" \
  -exec sed -i 's|/philly/|/deus/|g; s|philly-standalone|deus-standalone|g' {} +

# 3. Update package.json
sed -i 's|"philly-crm"|"deus-crm"|g' apps/deus-standalone/package.json
```

**Risk:** HIGH — breaks all in-flight branches. Must be merged when no other PRs are open.
**Tests:** Full `npm test` + `npm run build` + Vercel preview deployment before merge.
**Rollback plan:** Revert via Vercel UI + `git revert` the PR; folder names cascade back.

### PR-D — URL redirects + API aliases (post-folder-rename safety net)

**Scope:** Customer-facing URLs `/philly/*` are now `/deus/*`. Add 301 redirects for backwards compat.

**Files:**
- `next.config.mjs` — add `redirects()` config:
  ```js
  async redirects() {
    return [
      { source: '/philly/:path*', destination: '/deus/:path*', permanent: true },
      { source: '/philly', destination: '/deus', permanent: true },
    ];
  }
  ```
- `apps/deus-standalone/middleware.ts` — same for the standalone app

**API aliases (keep for 6 months):**
- `/philly/api/*` → forwards to `/deus/api/*` (no breaking change)
- After 6 months: remove the `/philly/api/*` aliases entirely (PR-E1, separate)

**Risk:** Low — redirects don't break anything.

### PR-E — DEUS-SHARED mirror sync workflow update

**Scope:** Update `.github/workflows/sync-deus-shared.yml` to reference new paths (`apps/deus-standalone/` instead of `apps/philly-standalone/`).

**Files:**
- `.github/workflows/sync-deus-shared.yml`
- DEUS-SHARED mirror repo: tracking that the source has moved

**Risk:** Low — workflow is opt-in (manual trigger only).

---

## Migration of in-flight branches

When PR-C (folder rename) is in flight, all other open feature branches need rebasing. Inventory of branches as of 2026-05-14:

```
claude/ai-command-bar      (PR #10 — Stripe + welcome — must merge BEFORE PR-C)
claude/zen-noyce-f6e719    (status unknown — check before PR-C)
```

Rule: **No new branches opened against `main` until PR-C lands.** Anyone working on a feature branches off `claude/rebrand-philly-to-deus` from PR-A onward.

---

## Cost / time estimate

| PR | Estimated dev time | Reviewer time | Calendar days |
|---|---|---|---|
| PR-A (brand strings + assets) | 4-6h | 1h | 1 day |
| PR-B (env vars) | 2h | 30m | 0.5 day |
| PR-C (folder renames) | 4h focused execution | 2h thorough review | 1 day |
| PR-D (redirects) | 2h | 30m | 0.5 day |
| PR-E (sync workflow) | 1h | 15m | 0.25 day |
| **Total** | **~15h** | **~4h** | **3-4 days** |

Brand assets (new logo/favicon/OG card) parallel-track via design — assume 1 week if outsourced, less if in-house.

---

## Pre-flight checklist

Before starting PR-A:

- [ ] PR #10 (`claude/ai-command-bar`) merged to `main` (or explicit branch-off-then-rebase decision made)
- [ ] DEUS logo + favicon + OG card designed and exported
- [ ] Inventory complete: list of all external API consumers using `/philly/api/*`
- [ ] Communications plan: customer email "we're rebranding to DEUS, your bookmarks redirect, no action needed"
- [ ] Domain decision: keep `juandiazllc.com` as umbrella OR move dashboard to `deus.juandiazllc.com` subdomain? (current plan: keep same URL structure, just rename internal paths)
- [ ] DEUS-SHARED mirror repo owner notified (no breaking change for consumers; just internal path update on next sync)

---

## What's already done (Phase 1 — pricing artifacts)

Completed 2026-05-14 in PR (this commit):

- All 27 customer-facing pricing artifacts rebranded DEUS-SHARED → DEUS
- `DEUS-SHARED-Pricing-Workbook.xlsx` renamed to `DEUS-Pricing-Workbook.xlsx`
- Internal xlsx content (cover sheet, all 10 tabs) regenerated under DEUS branding
- Volitfy/Marketing duplicates also rebranded for consistency

This pre-positions the marketing surface for when the codebase rebrand executes — when DEUS Dashboard launches, the pricing page copy doesn't need a second edit pass.

---

## Open questions for Juan

1. **Logo / brand asset budget?** Can be in-house in Figma or outsourced. If in-house, ~4 hours of design time.
2. **Domain strategy:** keep dashboard at `juandiazllc.com/dashboard` OR move to `deus.juandiazllc.com`? (recommendation: keep on `juandiazllc.com` initially for SEO equity, consider subdomain in 12 months)
3. **External API consumers:** any partner currently calling `/philly/api/*` endpoints? Need a 6-month sunset plan if yes.
4. **Mirror-repo name:** keep `DEUS-SHARED` as the mirror repo name, or rename to something cleaner (e.g., `deus-mirror`, `deus-partner-builds`)? Recommendation: keep `DEUS-SHARED` — already in workflows, GitHub Actions secrets, etc.
5. **Timing:** execute now (small disruption window) or after a specific milestone (e.g., first paying customer)? Recommendation: now, before customer base grows.
