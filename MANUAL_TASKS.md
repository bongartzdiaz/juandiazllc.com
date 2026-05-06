# Manual tasks — things Claude can't do from the repo

Every item here is a one-time human action that unblocks code that's
already shipped. Strike through (`~~...~~`) when done.

## Newsletter double opt-in (PR 715d102)

- [ ] Run the updated migration in Supabase SQL editor (brand project):
      `supabase/brand/newsletter_subs.sql`. Safe to re-run —
      alter-if-not-exists handles the existing table.
- [ ] Add Vercel env vars (production + preview):
  - `RESEND_API_KEY` — from resend.com dashboard
  - `NEWSLETTER_FROM` — e.g. `noreply@juandiazllc.com`
  - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings
    (the service role, NOT the anon key — keep it out of the browser)
- [ ] Verify the `noreply@juandiazllc.com` sender domain in Resend
      (SPF + DKIM records on the DNS zone).
- [ ] Smoke test: subscribe with a real address, click the link,
      verify `confirmed_at` is stamped and `confirm_token` is null in
      the `newsletter_subs` row.

## Cookie consent + analytics (PR f1b4a4a / earlier)

- [ ] Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to `juandiazllc.com` in Vercel.
      Optional: `NEXT_PUBLIC_PLAUSIBLE_HOST` if self-hosting.
- [ ] Create the Plausible site (plausible.io or self-host) so the
      domain matches the env var.

## Impressum content (PR f1b4a4a)

- [ ] Confirm the Impressum copy is legally sufficient for your DE
      audience. Current content uses "address on written request" —
      some lawyers prefer a concrete registered agent street address.
      If needed, add to `lib/i18n/dict.ts` under `impressum.p.company`
      in all 4 locales.

## Brand assets (from earlier sessions)

- [ ] Drop real portrait at `/public/me/portrait.jpg` (used on /about).
- [ ] Drop real hero image at `/public/hero.jpg` (used on home hero
      fallback layer).

## Translation retry (rate-limited)

- [ ] After 10pm UTC reset, re-run the chrome-translation agent for
      `/login`, `/work` (index + slug), `/insights` (index + slug +
      tag), `/sectors` (index + slug), `/signals` (index + slug).

## Lighthouse CI

- [ ] Confirm `.github/workflows/lighthouse.yml` runs on production
      pushes to main (Vercel Preview Protection auth-walls previews,
      so PR runs were moved to main-only).

## DEUS / LucenAI — multi-tenant readiness (May 2026 sprint)

Pre-deploy actions for the seats / invites / GDPR / CSV-import bundles.

- [ ] Run Prisma migrations against the production DB:
  ```
  npx prisma migrate dev --name seats_and_invites
  npx prisma migrate dev --name user_soft_delete
  ```
  Or in production, `npx prisma migrate deploy` after the schema is on the production branch.
- [ ] Add Vercel env vars (production + preview) for the philly project:
  - `RESEND_API_KEY` — invite emails. Without this, invites are created
    but no email is sent (UI flash banner explains the fallback).
  - `INVITE_FROM_EMAIL` — defaults to `noreply@lucen.ai`. Verify the
    sender domain in Resend (SPF + DKIM on the lucen.ai DNS zone).
  - `NEXT_PUBLIC_APP_URL` — defaults to `https://app.lucen.ai`.
    Set to whatever the live customer URL is so accept-invite links
    resolve correctly.
  - `STRIPE_SECRET_KEY` — health-endpoint check + future billing webhook.
    Optional; absence is reported as "not configured", not "down".
- [ ] Confirm legal entity for the DPA / ToS / Privacy Policy. Drafts
      live in `_drafts/legal/*.md` with `[KvK TBD]` and `[address TBD]`
      placeholders. "Juan Diaz LLC" reads as US-style; if it's actually
      an NL BV / eenmanszaak, fill in the correct entity + KvK number.
- [ ] Smoke test on staging: invite teammate → accept → seat counter
      ticks → DSAR export downloads → soft-delete → 410 on next login.

## DEUS-SHARED mirror setup

`bongartzdiaz/DEUS-SHARED` is the mirror target for downstream
distribution. Source of truth stays in `bongartzdiaz/juandiazllc.com`.
Sync workflow lives at `.github/workflows/sync-deus-shared.yml`.

- [ ] Create the target repo `bongartzdiaz/DEUS-SHARED` (private,
      empty — no README/license/.gitignore so the first push isn't
      a non-fast-forward conflict).
- [ ] Generate a fine-grained PAT at
      [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):
  - Resource owner: `bongartzdiaz`
  - Repository access: only select `bongartzdiaz/DEUS-SHARED`
  - Permissions → Repository: `Contents: Read and write`
  - Expiration: 90 days (set a calendar reminder to rotate)
- [ ] Add the PAT as a repo secret named `DEUS_SHARED_PAT` at
      `Settings → Secrets and variables → Actions → New repository secret`
      in `bongartzdiaz/juandiazllc.com`.
- [ ] Trigger the workflow manually the first time:
      `Actions → Sync to DEUS-SHARED → Run workflow → main`.
      Confirm `bongartzdiaz/DEUS-SHARED` now mirrors this repo.
- [ ] Future syncs run automatically on every push to `main`.

**Rotation note:** when the PAT expires, the workflow fails with
"DEUS_SHARED_PAT secret is not set" (or a 401 from GitHub). Generate
a new fine-grained PAT and update the secret — same scope as above.

## Testing gaps (CLAUDE.md priority)

- [ ] Zod validation schemas under `lib/philly/validation/` —
      highest ROI, no mocks needed.
- [ ] Dict key parity test — catches locales that silently fall
      back to English.
- [ ] `proxy.ts` CSRF tests — security-critical, untested.
- [ ] `lib/i18n/metadata.ts` tests — `buildAlternates`, `ogLocale`,
      `alternateOgLocales`.
