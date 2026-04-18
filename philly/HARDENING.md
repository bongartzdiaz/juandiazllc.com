# Philly Dashboard — Production Hardening

Everything that makes this app production-ready, in one place. Pair with `DEPLOYMENT.md` (the runbook) and `.env.example` (the env vars).

---

## Layered defenses

```
                ┌────────────────────────────────┐
                │          Cloudflare (opt)      │  ← DDoS, bot filter, CDN
                └───────────────┬────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │      Nginx (port 443/80)       │  ← TLS, HTTP→HTTPS, rate limit, HSTS
                │  deploy/nginx.conf.example     │
                └───────────────┬────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │    Next.js middleware.ts       │  ← CSRF, CSP, X-Frame, request-id
                └───────────────┬────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │   Route handlers (per-route)   │  ← Auth (JWT), Zod, rate-limit, audit
                └───────────────┬────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │        Prisma + MariaDB        │  ← parameterised queries only
                └────────────────────────────────┘
```

---

## 1. Error reporting (Sentry)

**Files:**
- `src/lib/sentry.ts` — lazy wrapper. No-ops when `SENTRY_DSN` is unset.
- `src/instrumentation.ts` — called once on server start by Next.js.
- `src/app/global-error.tsx` — root error boundary, POSTs client errors to `/api/log-error`.
- `src/app/api/log-error/route.ts` — IP rate-limited sink that forwards client errors to Sentry.

**Enable:**
```env
SENTRY_DSN="https://<key>@<org>.ingest.sentry.io/<project>"
SENTRY_ENVIRONMENT="production"    # optional
SENTRY_RELEASE="${GIT_SHA}"        # set by deploy workflow
SENTRY_TRACES_SAMPLE_RATE="0.1"    # optional, 10 % of transactions
```

The deploy workflow automatically marks each release in Sentry when `SENTRY_AUTH_TOKEN` is set as a repo secret.

**Use in code:**
```ts
import { captureException, setSentryUser } from '@/lib/sentry'

try { /* risky thing */ }
catch (err) { captureException(err, { route: '/api/foo' }); throw err }
```

---

## 2. Structured logging

**File:** `src/lib/logger.ts`

- One JSON line per event in production (`LOG_LEVEL=info` by default)
- Pretty-printed with colors in development
- Auto-redacts `password`, `token`, `apiKey`, `secret`, `authorization`, `cookie`, JWTs

**Shipping logs:** Any line-based shipper works — Promtail→Loki, Fluent Bit→Elastic, Datadog agent, CloudWatch agent. Point it at PM2's log files (`./logs/out.log`, `./logs/err.log`).

---

## 3. HTTP security headers

All set in `src/middleware.ts`; applied to every non-static response.

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | `default-src 'self'; …` (locked down, Sentry + https images allowed) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (HTTPS responses only) |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera/mic/geolocation/payment/usb/interest-cohort = `()` |
| `X-DNS-Prefetch-Control` | `off` |

**CSP tuning:** if you add a new CDN (fonts, analytics), edit `buildCsp()` in `src/middleware.ts` and add the origin to the relevant directive (usually `script-src`, `style-src`, `img-src`, or `connect-src`).

---

## 4. CSRF protection

**File:** `src/middleware.ts`

Every unsafe API request (POST/PATCH/PUT/DELETE on `/api/*`) must have an `Origin` or `Referer` whose host matches the request host. Cross-origin requests are blocked with 403 regardless of session cookie.

**Exempt paths** (they authenticate themselves via signatures / API keys):
- `/api/sms/webhook`
- `/api/webhooks/inbound/*`
- `/api/v1/*` (public API — key auth)
- `/api/auth/*` (NextAuth handles its own CSRF)
- `/api/log-error` (client error sink — IP rate limited)
- `/api/health`

---

## 5. Rate limiting

**File:** `src/lib/rate-limit.ts`

In-memory token bucket keyed by IP / userId / orgId. Presets:

| Preset | Capacity | Refill | Use |
|--------|----------|--------|-----|
| `PRESET_AUTH` | 10 | 1/s | login, public forms |
| `PRESET_MUTATION` | 60 | 2/s | authenticated POST/PATCH/DELETE |
| `PRESET_READ` | 300 | 10/s | authenticated GETs |
| `PRESET_SEND` | 20 | 0.5/s | email/SMS/webhook dispatch |

Nginx also has a hard limit of `5 r/s` with burst 10 on `/api/auth/*` as a belt-and-braces defense.

**Swap for Redis in multi-instance deployments:** replace the `_store` Map in `rate-limit.ts` with a Redis-backed adapter. The public function signatures stay identical.

---

## 6. Authentication

- **JWT strategy** (no DB round-trip per request). 30-day rolling session.
- **Credentials provider** backed by bcrypt (`passwordHash` on User).
- **Secure cookies** auto-enabled when `NEXTAUTH_URL` starts with `https://`.
- **X-Forwarded-Proto** honoured (Nginx template sets it).

**Preflight enforces** at boot:
- `NEXTAUTH_SECRET` is set and ≥32 chars
- `NEXTAUTH_SECRET` is not the placeholder from `.env.example`
- `NEXTAUTH_URL` uses `https://` in production
- At least one admin user exists

---

## 7. Input validation

All mutation endpoints use Zod schemas (`src/lib/validation/schemas.ts`). Invalid bodies return 400 with a structured `{ error, issues[] }` response — never a stack trace.

---

## 8. Audit logging

Every create/update/delete writes an `AuditLog` row via `logAudit(scope, action, entity, entityId, changes)`. Viewable by admins at `/audit`.

---

## 9. Database hardening

- MariaDB 11.4 bound to `127.0.0.1:3306` in Docker (never exposed to public)
- `mysql_secure_installation` on bare-metal path removes anon users + test DB
- Prisma uses parameterised queries exclusively — SQL injection not possible via ORM
- Nightly `mysqldump` via `deploy/backup.sh` with 14-day local retention + optional S3

**Automated backups:**
```bash
chmod +x deploy/backup.sh
sudo cp deploy/backup.sh /usr/local/bin/philly-backup
# Password in a mode-0600 file:
sudo install -d /etc/philly && sudo chmod 700 /etc/philly
echo -n 'YOUR_DB_PASSWORD' | sudo tee /etc/philly/db-password >/dev/null
sudo chmod 600 /etc/philly/db-password
# Cron at 03:00 UTC daily:
echo '0 3 * * * /usr/local/bin/philly-backup >> /var/log/philly-backup.log 2>&1' | sudo tee /etc/cron.d/philly-backup
```

**Restore:**
```bash
sudo ./deploy/restore.sh /var/backups/philly/philly-20260417-030000.sql.gz
```

---

## 10. CI/CD

**`.github/workflows/ci.yml`** runs on every push and PR:
1. `npm ci`
2. `prisma generate`
3. `tsc --noEmit` (typecheck)
4. `next lint`
5. `next build`
6. `npm audit --omit=dev --audit-level=high` (parallel job)

**`.github/workflows/deploy.yml`** runs on push to `main`:
1. SSH to VPS using `VPS_SSH_KEY` secret
2. Run `deploy/deploy.sh` (which handles git pull, deps, migrations, build, pm2 reload)
3. Smoke test `/api/health`
4. Mark Sentry release (if `SENTRY_AUTH_TOKEN` secret is set)

**Required GitHub secrets/variables:**

| Name | Type | Example |
|------|------|---------|
| `VPS_SSH_KEY` | secret | `-----BEGIN OPENSSH PRIVATE KEY-----\n…` |
| `VPS_HOST` | secret | `your-vps.example.com` or IP |
| `VPS_USER` | secret | `deploy` |
| `PRODUCTION_URL` | variable | `https://dashboard.your-company.com` |
| `VPS_PATH` | variable (optional) | `/var/www/philly-dashboard` |
| `SENTRY_AUTH_TOKEN` | secret (optional) | from Sentry → Auth Tokens |
| `SENTRY_ORG` | variable (optional) | `your-sentry-org-slug` |
| `SENTRY_PROJECT` | variable (optional) | `philly-dashboard` |

**`.github/workflows/codeql.yml`** runs weekly + on PR for static security analysis.

**`.github/dependabot.yml`** opens weekly PRs grouped as:
- `safe-updates` — all minor/patch updates outside framework packages
- `framework` — Next, Prisma, React, next-auth (reviewed individually)
- GitHub Actions: monthly
- Docker base images: monthly

---

## 11. Deployment targets checklist

Before you point real traffic at a new VPS:

- [ ] `.env.local` filled in, `NEXTAUTH_SECRET` regenerated
- [ ] `NEXTAUTH_URL` is `https://` and matches the public domain exactly
- [ ] `SEED_ADMIN_PASSWORD` changed from default
- [ ] `npm run preflight` exits 0
- [ ] `curl https://your-domain/api/health` returns `{"status":"ok",…}`
- [ ] Let's Encrypt cert issued; `certbot renew --dry-run` succeeds
- [ ] HSTS header uncommented in Nginx after HTTPS verified stable
- [ ] `ufw allow 80 && ufw allow 443 && ufw deny 3306` (or your firewall equivalent)
- [ ] Nightly backup cron installed and first run verified
- [ ] Uptime monitor pointed at `/api/health`
- [ ] Sentry DSN set (if using) and first test event received
- [ ] GitHub deploy workflow secrets all set; manual dispatch succeeds
- [ ] Admin password changed on first login

---

## 12. Going further

| Concern | Option |
|---------|--------|
| Multi-region / HA | Move MariaDB to a managed service (PlanetScale, DO Managed DB), front app with multiple PM2 hosts behind a load balancer |
| Secrets management | Doppler, 1Password Connect, AWS Secrets Manager — replace `.env.local` with env injection at boot |
| Log aggregation | Promtail → Loki (free, self-hosted), or Datadog |
| Monitoring | Prometheus scrape of `/api/health` + PM2 metrics; Grafana dashboards |
| WAF | Cloudflare free tier in front of Nginx (bot fight, rate limit, managed rules) |
| DDoS | Cloudflare Pro, or AWS Shield if you're on Lightsail |
| DB encryption at rest | MariaDB InnoDB table-level encryption + key rotation |
| Field-level encryption | Encrypt `Integration.accessToken` / `refreshToken` columns before insert using `crypto.createCipheriv` + a server-side key |
