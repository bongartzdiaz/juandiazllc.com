# DEUS Hetzner Cutover Runbook

Operator-executable plan to move the DEUS CRM (`/philly/*`) from Vercel +
Supabase to a Hetzner GEX44 box, while leaving the marketing site
(`juandiazllc.com`) on Vercel. Auth migrates from Supabase Auth to Lucia
v3 on a self-hosted Postgres 17. The existing MariaDB Prisma data layer
stays exactly where it is — only auth moves.

Target window: **Friday 21:00 CET** (low-traffic, full Saturday for
recovery if needed).

Box spec: Hetzner GEX44 — Ryzen 7 PRO 8700GE, 64 GB RAM, 1 TB NVMe.

Each script referenced below lives in `scripts/migrate-to-hetzner/` at
the repo root. Run scripts as the operator (`deus`), not root, except
where stated.

---

## Section 1 — Pre-flight checklist (T-7 days)

Goal: confirm every external dependency before booking the cutover.
None of these are reversible-cheap on Friday night.

- [ ] **Hetzner GEX44 ordered + provisioned.** Robot console access
  works. Note the public IPv4 + IPv6 in `MANUAL_TASKS.md`. Reverse
  DNS set to `app.juandiazllc.com` (or `app.lucen.ai` post-rename).
- [ ] **Operator SSH key in Hetzner Robot.** `ssh-keygen -t ed25519`
  on the operator laptop, public key uploaded under Robot →
  Server → Rescue / Linux. The bootstrap script disables password
  auth, so a missing key locks the box.
- [ ] **DNS access confirmed.** Confirm the registrar for
  `juandiazllc.com` (TransIP / Cloudflare / Namecheap — record
  which one in `MANUAL_TASKS.md`). Operator must be able to log in
  and edit A/AAAA records. If on Cloudflare, decide proxy on/off
  per record (recommend: `juandiazllc.com` proxied, `app.*` DNS-only
  so Caddy can issue TLS via HTTP-01 on port 80).
- [ ] **B2 bucket created in EU region.** Backblaze B2 → Buckets →
  Create — `deus-backups-eu`, region `eu-central-003`, lifecycle
  rule "keep 30 days". Generate an Application Key scoped to that
  bucket only. Save `B2_KEY_ID` + `B2_APPLICATION_KEY` for step 8.
- [ ] **GitHub deploy key.** On the box later: `ssh-keygen -t
  ed25519 -f ~/.ssh/deus_deploy -N ""`. Add the **public** key to
  the `bongartzdiaz/website` repo under Settings → Deploy keys
  (read-only). The bootstrap script puts it on the box; this item
  just reserves operator time on github.com.
- [ ] **Postgres dump + MariaDB dump tested locally.** Pull a
  recent backup from MariaDB and run `pg_dump` against the staging
  Lucia DB so we know `09-smoke-test.sh` will pass without a
  surprise schema drift on Friday.
- [ ] **Resend SPF + DKIM still healthy.** `dig TXT
  juandiazllc.com` shows the Resend record; `dig CNAME
  resend._domainkey.juandiazllc.com` resolves. Email cutover
  reuses the same domain — nothing to change here, but verify
  before Friday.
- [ ] **Stripe webhook endpoint URL noted.** It's currently
  `https://juandiazllc.com/philly/api/billing/webhook`. After
  cutover the host is unchanged (we're routing through Caddy on the
  same domain), so the webhook stays valid. Just confirm.
- [ ] **Maintenance banner ready.** `app/[locale]/page.tsx` has a
  feature flag, or a `<MaintenanceBanner />` component is staged
  on a branch that can be merged + deployed via Vercel in 90
  seconds at T=0.
- [ ] **Friday-night ops contact.** Hash on standby for
  smoke-test eyeballs. If solo: this is fine — the smoke-test
  script automates the 10 critical paths.

---

## Section 2 — Box bootstrap (T-2 days)

Run `01-bootstrap.sh` on the freshly provisioned Hetzner box. SSH in as
`root` once with the password Hetzner emailed:

```bash
ssh root@<BOX_IP>
# upload the script:
scp scripts/migrate-to-hetzner/01-bootstrap.sh root@<BOX_IP>:/root/
ssh root@<BOX_IP>
chmod +x /root/01-bootstrap.sh
DEUS_OPERATOR_KEY="ssh-ed25519 AAAA... operator@laptop" \
DEUS_DOMAIN="juandiazllc.com" \
  /root/01-bootstrap.sh
```

After it finishes, **log out and back in as `deus@<BOX_IP>`** — root
password login is now disabled.

What the script installs and configures (see header comment in
`01-bootstrap.sh` for the canonical list):

- **OS:** Ubuntu 24.04 LTS. Picked over Debian 12 because (a) Hetzner
  ships it as a first-class image with `cloud-init` pre-baked, (b)
  Ubuntu's `unattended-upgrades` defaults match what we want for a
  prod box, (c) the official Postgres APT repository tracks Ubuntu
  releases the day they ship. Debian 12 would also work; the cost is
  marginally older default packages and a slightly clunkier security
  upgrade story.
- **User:** `deus` with `sudo` (NOPASSWD for `systemctl restart caddy`
  + `pm2`). Operator SSH key authorized; root login + password auth
  disabled in `/etc/ssh/sshd_config.d/10-deus.conf`.
- **fail2ban:** sshd jail enabled, 3 retries, 1 h ban.
- **UFW:** default deny incoming, allow 22/tcp, 80/tcp, 443/tcp.
  IPv6 enabled. Logging set to `low`.
- **Postgres 17:** from the official `apt.postgresql.org` repo.
  `postgresql-17` + `postgresql-contrib-17`. Tuned for 64 GB RAM
  (see `/etc/postgresql/17/main/conf.d/10-deus-tuning.conf` written
  by the script):
  - `shared_buffers = 16GB`
  - `effective_cache_size = 48GB`
  - `work_mem = 32MB`
  - `maintenance_work_mem = 2GB`
  - `wal_buffers = 16MB`
  - `max_connections = 200`
  - `random_page_cost = 1.1` (NVMe)
  - `effective_io_concurrency = 200`
  - `checkpoint_completion_target = 0.9`
  - `min_wal_size = 1GB`, `max_wal_size = 4GB`
- **MariaDB:** **stays as-is** wherever it currently lives. The script
  does not touch it. Auth migration is the only DB change.
- **Caddy 2:** from `cloudsmith.io/~caddy/repos/stable`. The Caddyfile
  is replaced with `06-caddy-config.example` rendered against the
  operator's domain.
- **Node 22 LTS:** via NodeSource (Active LTS until April 2027). `npm`
  ships with it; we install `pnpm` globally for build hygiene.
- **PM2:** `npm install -g pm2`. `pm2 startup systemd` registers the
  init script as the `deus` user.
- **Misc:** `git`, `curl`, `jq`, `unzip`, `htop`, `zfsutils-linux`
  (NVMe is ext4 by default — ZFS is for a future snapshot story, not
  shipped here). `b2` CLI for backup pushes.

Verify the bootstrap landed:

```bash
ssh deus@<BOX_IP>
sudo ufw status verbose                       # 22, 80, 443 only
sudo systemctl is-active fail2ban             # active
sudo systemctl is-active postgresql           # active
sudo systemctl is-active caddy                # active (default Caddyfile)
node --version                                # v22.x
pm2 ping                                      # pong
```

---

## Section 3 — Auth migration: Supabase → Lucia

**Why Lucia v3:** session-based, stores everything in Postgres, no
external dependency, no JWT crypto for our team to maintain. The CRM
already has a session-cookie surface (`lib/supabase/middleware.ts`); we
swap the cookie issuer and the validation, keep the cookie name + flow.

**OAuth grants do NOT survive.** Supabase Auth holds the OAuth refresh
tokens in its own schema and Lucia has no way to import them. Users
who signed in via Google or GitHub re-OAuth on first login post-cutover.
Email-flag this in the maintenance banner ("you'll click the Google
button again on first login").

**Password rehash strategy:**
- Supabase Auth uses **bcrypt** for password hashes (cost varies by
  version, typically 10).
- Lucia v3 with `@node-rs/argon2` uses **argon2id** (memory 19 MiB,
  iterations 2, parallelism 1 — Lucia v3 sane default).
- We can't read plaintext passwords, so we can't rehash silently.
  Two options:
  1. **Lazy rehash on next login** (preferred). Store the bcrypt
     hash in `auth_user.bcrypt_legacy`. On `POST /login`, try
     argon2id first; on miss, try bcrypt; on bcrypt match, rehash
     to argon2id, NULL the bcrypt column, continue login.
  2. Force everyone to reset on cutover (clean but worse UX —
     ~50 users would need a password-reset link).
  We ship option 1. The `05-import-lucia-users.ts` script writes
  `bcrypt_legacy` into the new schema.

**Steps:**

1. **Init the Postgres DB** (run on the box as `deus`):
   ```bash
   sudo -u postgres psql -f scripts/migrate-to-hetzner/02-postgres-init.sql
   sudo -u postgres psql -d lucia_auth \
     -f scripts/migrate-to-hetzner/03-lucia-schema.sql
   ```
2. **Export users from Supabase** (operator laptop, with
   `SUPABASE_SERVICE_ROLE_KEY` in env):
   ```bash
   tsx scripts/migrate-to-hetzner/04-export-supabase-users.ts \
     > /tmp/supabase-users.json
   ```
   This dumps everything we need from `auth.users`: id, email,
   `encrypted_password` (bcrypt), email_confirmed_at, created_at,
   last_sign_in_at, the OAuth `app_metadata.providers` list (so we
   can email those users a "click Google again" notice). It does NOT
   dump refresh tokens or access tokens.
3. **Copy + import** (operator laptop → box):
   ```bash
   scp /tmp/supabase-users.json deus@<BOX>:~/
   ssh deus@<BOX>
   tsx ~/website/scripts/migrate-to-hetzner/05-import-lucia-users.ts \
     ~/supabase-users.json
   ```
   The script writes to `auth_user` and a placeholder
   `auth_session` is empty (sessions don't migrate — everyone
   re-logs-in).
4. **Cookie domain change.** Supabase issued cookies under
   `juandiazllc.com`; Lucia issues under the same parent domain
   `Domain=.juandiazllc.com; Secure; HttpOnly; SameSite=Lax;
   Path=/`. The marketing site never reads the cookie, so it's
   irrelevant for SEO. Set this in the Lucia `Lucia` constructor's
   `sessionCookie.attributes.domain`.

---

## Section 4 — DB migration: MariaDB stays + Postgres added

**MariaDB:** unchanged. Do NOT migrate the Prisma data layer to
Postgres in this cutover — that's a multi-week project and not the
goal. `lib/philly/auth.ts` keeps using `@prisma/adapter-mariadb`
against the existing connection string.

**Postgres:** new, hosts only Lucia auth. Three tables:
`auth_user`, `auth_session`, `auth_oauth_account` (see
`03-lucia-schema.sql` for the canonical DDL).

**Env vars** post-cutover (set in `.env.production` on the box,
referenced by PM2 ecosystem):

```
DATABASE_URL="mysql://<user>:<pass>@<mariadb-host>:3306/philly"   # unchanged
LUCIA_DATABASE_URL="postgres://lucia_app:<pass>@127.0.0.1:5432/lucia_auth"
SESSION_COOKIE_NAME="deus_session"
SESSION_COOKIE_DOMAIN=".juandiazllc.com"

# all of these stay:
RESEND_API_KEY=...
INVITE_FROM_EMAIL=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
MS_OAUTH_CLIENT_ID=...
MS_OAUTH_CLIENT_SECRET=...
SENTRY_DSN=...
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=...

# remove these:
NEXT_PUBLIC_SUPABASE_URL                # GONE
NEXT_PUBLIC_SUPABASE_ANON_KEY           # GONE
SUPABASE_SERVICE_ROLE_KEY               # GONE
```

The Supabase callback URLs in Google Cloud Console + Entra ID need to
be updated to point at the new Lucia OAuth callback paths
(`/philly/api/auth/oauth/google/callback` and
`/philly/api/auth/oauth/microsoft/callback`). Add these to the
existing app registrations BEFORE Friday — they can coexist with the
Supabase ones until cutover, then remove the Supabase entries the
following Monday.

---

## Section 5 — Application deploy

**Build location:** **build on the box**, not in CI. Reasons:
- Next.js 16 + Turbopack on a Ryzen 7 8700GE finishes a cold build in
  ~75 s. CI builds + tarball-shipping would add latency without
  buying anything.
- The box has 64 GB RAM and 16 vCPU threads; even a parallel build
  doesn't pressure it.
- Single-host deploy means no artifact-storage or registry
  complexity. Edit, `git pull`, `npm ci`, `npm run build`, `pm2
  reload`. That's the whole flow.

The CI in `.github/workflows/` continues to run typecheck + tests on
every push (it's the cheap safety net). We just don't ship from CI.

**PM2 ecosystem** (`07-pm2-ecosystem.example.js`):
- App: `deus-web` — `npm run start` (Next.js standalone server).
- 4 cluster instances (PM2 cluster mode) — Next.js handles its own
  worker pool but PM2 cluster gives us free zero-downtime reload.
- `max_memory_restart: '1500M'` — generous; Next.js with
  `output: 'standalone'` runs ~400-600 MB resident.
- `node_args: '--max-old-space-size=2048'` — bump from default 1.5 GB
  for build-time SSR work.
- Restart policy: `restart_delay: 4000`, `max_restarts: 5` per minute,
  beyond that PM2 marks it errored and stops bouncing.

**Caddy config** (`06-caddy-config.example`):
- Auto-TLS via Let's Encrypt HTTP-01 challenge on port 80.
- HSTS `max-age=31536000; includeSubDomains; preload`.
- Standard security headers: `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- HTTP/2 + HTTP/3 enabled (Caddy default).
- Reverse-proxy `/` → `127.0.0.1:3000` (the Next.js app).
- Stream/SSE keepalive disabled buffering (`flush_interval: -1`).
- Static-file path matchers preserved so Next.js handles its own
  `/_next/static/*` cache headers; Caddy doesn't second-guess.
- Real-IP via `trusted_proxies` directive — only loopback + the
  Hetzner-provided private IP space, so the app sees real client
  IPs in `X-Forwarded-For`. This is critical for our rate limiter
  (`enforceRateLimit`) and for IP-bound audit rows.
- The vhost block `juandiazllc.com` redirects `/philly/*` to
  `app.juandiazllc.com/philly/*` after cutover so old bookmarks
  don't break. Brand site stays on Vercel for that vhost — Caddy
  proxies non-`/philly` paths to Vercel via a `reverse_proxy
  cname.vercel-dns.com:443` block (with `header_up Host`).

  Alternative if proxying-to-Vercel is fragile: do the split at DNS
  instead — `juandiazllc.com` → Vercel, `app.juandiazllc.com` →
  Hetzner. This is simpler. We ship the DNS-split because it's
  bulletproof; the proxy-redirect block in the Caddyfile is left
  commented out as a fallback.

**Health check:**
`/philly/api/health` already exists (4-parallel checks: db, supabase
auth reachability, stripe, email_provider). Strip the
`supabase_auth` check post-cutover — it'll false-fail because we no
longer route through Supabase. Replace with a `lucia_db` check that
runs `SELECT 1` against `LUCIA_DATABASE_URL`. The Caddy `lb_try_duration
1s` directive uses this endpoint to mark the upstream up/down.

**Deploy steps** (run on the box as `deus`):

```bash
cd ~/website
git fetch origin
git checkout main
git pull --ff-only
npm ci --omit=dev=false               # we need devDeps for `next build`
npm run typecheck
npx prisma migrate deploy             # MariaDB migrations
npm run build
pm2 startOrReload ~/website/scripts/migrate-to-hetzner/07-pm2-ecosystem.example.js
pm2 save
sudo systemctl reload caddy
curl -sf http://127.0.0.1:3000/philly/api/health | jq .
```

If the health endpoint returns 200 with all checks `ok` → safe to
flip DNS in the cutover ceremony.

---

## Section 6 — Cutover ceremony (T=0, ~Friday 21:00 CET)

Linear, no surprises. Each step has an expected output; if the
output doesn't match, **stop and call rollback**.

**T-30 min (20:30):**
1. **Maintenance banner up.** Merge the `<MaintenanceBanner />` PR to
   `main` on `bongartzdiaz/website`. Vercel auto-deploys in ~90 s.
   Banner text (EN/NL/DE/ES already in `lib/i18n/dict.ts` under
   `maint.*` — add if missing): "DEUS is briefly offline for a
   planned upgrade. We'll be back by 22:00 CET. — juandiazllc.com".

2. **Pause writes.** In the marketing site repo, set the env var
   `READ_ONLY_MODE=1` on Vercel and redeploy. The CRM on the box
   isn't live yet, so this only blocks any straggler writes through
   Supabase Auth-backed routes from a Vercel preview URL someone
   might still have open.

**T-15 min (20:45):**
3. **Final delta sync.** On the operator laptop:
   ```bash
   tsx scripts/migrate-to-hetzner/04-export-supabase-users.ts \
     > /tmp/supabase-users-final.json
   scp /tmp/supabase-users-final.json deus@<BOX>:~/
   ssh deus@<BOX> 'tsx ~/website/scripts/migrate-to-hetzner/05-import-lucia-users.ts \
     --upsert ~/supabase-users-final.json'
   ```
   The `--upsert` flag updates rows that exist and inserts new ones —
   captures the 7-day window since the dry run.

**T-0 (21:00):**
4. **DNS cutover.** Records that change:

   | Record                             | Before                   | After             | TTL preview |
   |------------------------------------|--------------------------|-------------------|-------------|
   | `app.juandiazllc.com` A            | (does not exist)         | `<BOX_IPv4>`      | 60          |
   | `app.juandiazllc.com` AAAA         | (does not exist)         | `<BOX_IPv6>`      | 60          |
   | `juandiazllc.com` A/AAAA           | Vercel anycast           | unchanged         | n/a         |
   | `juandiazllc.com` `/philly/*`      | Vercel routing           | (HTTP 301 in app) | n/a         |

   Drop TTL on all DEUS-relevant records to 60 seconds **24 hours
   in advance** — Friday afternoon at the latest. Otherwise resolvers
   cache for hours. After cutover stabilises (T+24 h), restore TTL
   to 3600.

5. **Smoke test.** From operator laptop:
   ```bash
   bash scripts/migrate-to-hetzner/09-smoke-test.sh https://app.juandiazllc.com
   ```
   The 10 checks:
   1. `GET /philly/api/health` → 200, all checks `ok`.
   2. `GET /philly/login` → 200, has `<form>` element.
   3. `POST /philly/api/auth/login` (test user, scripted creds) →
      302 to `/philly`, sets `deus_session` cookie.
   4. `GET /philly` (with session cookie) → 200, has the Topbar.
   5. `POST /philly/api/contacts` (create one) → 201, returns row.
   6. `GET /philly/api/contacts/<id>` → 200, has the row.
   7. `DELETE /philly/api/contacts/<id>` → 204.
   8. `POST /philly/api/auth/logout` → 302, cookie cleared.
   9. `GET /philly/api/calendar/connections` (unauthenticated) →
      401 (negative test — confirms middleware works).
   10. `GET /philly/api/billing/webhook` (HEAD) → 405 method not
       allowed, but the route exists.

   Any failure → rollback (step 6).

6. **Rollback plan.**
   - **RTO target:** 5 minutes for DNS revert, 15 minutes for full
     restoration.
   - **DNS revert:** delete the `app.juandiazllc.com` A/AAAA records.
     Keep `juandiazllc.com` pointed at Vercel (where the marketing
     site lives — never moved). This restores the `/philly/*` route
     because Vercel still has the deployment.
   - **Maintenance banner stays up.** While DNS reverts propagate,
     users see the banner instead of a half-cutover state.
   - **What we lose:** any writes that landed on the Hetzner box
     in the cutover window (5 minutes of typical traffic). The
     `04-export-supabase-users.ts --diff` flag can list users
     created after the dump cutoff so we can re-create them
     manually if needed.
   - **What still works:** marketing site, Stripe webhooks (the
     URL hasn't changed), email sending (Resend has nothing to do
     with our infra).
   - **Hetzner box stays up.** Don't tear it down — debug the
     failure, fix, and re-attempt cutover the following Friday.

---

## Section 7 — Post-cutover (T+24 h, ~Saturday 21:00 CET)

7-day stabilisation watch starts here. Items below are for the
operator's Saturday morning check + a return on Sunday.

- [ ] **Backups landed in B2.** The cron in `08-backup-cron.sh` runs
  at 03:00 CET. By Saturday 09:00 there should be a Postgres dump
  + a MariaDB dump in `s3://deus-backups-eu/`. Run:
  ```bash
  b2 ls deus-backups-eu | tail
  ```
  Expect two files dated yesterday (Postgres) and one from MariaDB.
  Restore-test one: download a Postgres dump and `pg_restore` it
  into a `lucia_auth_test` DB. If it fails, the backup is useless —
  fix immediately, this is a P0.

- [ ] **Cron jobs firing.** The CRM has scheduled work that lived in
  Vercel Cron (`vercel.json` with cron paths). Replace with `cron`
  on the box (the bootstrap script created `/etc/cron.d/deus`).
  Confirm the entries fired:
  - `renew-channels` (calendar push-sync renewals — 6 h cadence,
    see `docs/calendar-push-sync.md`)
  - `audit-prune` (audit log cleanup — daily 04:00)
  - Any Stripe-related polling (we use webhooks, not polling, so
    nothing here — but verify the webhook endpoint is still being
    hit by checking `app/philly/api/billing/webhook/route.ts` logs:
    `pm2 logs deus-web | grep webhook`).

- [ ] **Sentry reconnected.** The DSN didn't change. Trigger a
  deliberate error (an admin endpoint with a `?throw=1` query
  param, if one exists, otherwise a manual `throw new Error('cutover
  test')` in a non-critical route during a maintenance window).
  Confirm it lands in Sentry → Issues. Resolve the issue.

- [ ] **Plausible reconnected.** The script tag has the same
  `data-domain` attribute. `juandiazllc.com` analytics on
  Plausible should show traffic continuity (a small dip during the
  cutover is expected and fine).

- [ ] **OAuth callbacks working.** Sign in with Google, sign in
  with Microsoft. If either fails, the most likely cause is the
  callback URL not added to the corresponding console.

- [ ] **Stripe webhook recent events green.** Stripe dashboard →
  Developers → Webhooks → click the endpoint → "Recent events"
  should show 2xx responses for any events that fired during +
  after cutover. If you see retries, the box was unreachable for
  those events — Stripe will keep retrying for 3 days, so they'll
  catch up.

- [ ] **DNS TTL restored.** After 24 h of stable traffic, raise
  TTLs back to 3600 (or 14400 for the brand site).

- [ ] **Operator first-business-day checklist (Monday 09:00 CET):**
  1. Pull `pm2 status` — all 4 cluster workers `online`, uptime
     ~60 h, CPU low, memory under 800 MB each.
  2. Check `journalctl -u caddy --since '24h ago' | grep -i error`
     — should be empty or only TLS-renewal noise.
  3. Check `/etc/cron.d/deus` ran — `journalctl _SYSTEMD_UNIT=cron.service
     --since '36h ago'`.
  4. Check `auth_session` table size in `lucia_auth` — should be
     growing as users log back in. If it's empty 60 h post-cutover,
     no one has logged in and we have a problem.
  5. Decide on Supabase Auth project teardown. Wait 7 days
     minimum before deleting the Supabase project — that's our
     break-glass for any user we missed in the export.

---

## Appendix A — Files referenced

All paths relative to repo root.

- `scripts/migrate-to-hetzner/01-bootstrap.sh` — first-SSH OS setup.
- `scripts/migrate-to-hetzner/02-postgres-init.sql` — DB + roles.
- `scripts/migrate-to-hetzner/03-lucia-schema.sql` — Lucia v3 tables.
- `scripts/migrate-to-hetzner/04-export-supabase-users.ts` — Supabase
  → JSON.
- `scripts/migrate-to-hetzner/05-import-lucia-users.ts` — JSON →
  Postgres + bcrypt-legacy.
- `scripts/migrate-to-hetzner/06-caddy-config.example` — Caddyfile.
- `scripts/migrate-to-hetzner/07-pm2-ecosystem.example.js` — PM2
  config.
- `scripts/migrate-to-hetzner/08-backup-cron.sh` — daily B2 push.
- `scripts/migrate-to-hetzner/09-smoke-test.sh` — 10 cutover checks.

## Appendix B — What's intentionally out of scope

- **MariaDB → Postgres migration.** Not in this cutover. The Prisma
  data layer keeps using `@prisma/adapter-mariadb` against the
  existing host.
- **Multi-region / HA.** Single-box deploy. Hetzner GEX44 has 99.9%
  SLA; that's enough for first customers.
- **CI build artifacts.** We build on the box. Re-evaluate when team
  grows past 2 deploys/day.
- **Container deploy (Docker / k8s).** No. Native systemd + PM2 is
  simpler and faster to debug at this scale. Containerize when we
  hit the next box.
- **`li.*` LinkedIn surface migration.** Single-tenant, operator-only.
  Stays on the existing config, no auth migration needed.
