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

## Testing gaps (CLAUDE.md priority)

- [ ] Zod validation schemas under `lib/philly/validation/` —
      highest ROI, no mocks needed.
- [ ] Dict key parity test — catches locales that silently fall
      back to English.
- [ ] `proxy.ts` CSRF tests — security-critical, untested.
- [ ] `lib/i18n/metadata.ts` tests — `buildAlternates`, `ogLocale`,
      `alternateOgLocales`.
