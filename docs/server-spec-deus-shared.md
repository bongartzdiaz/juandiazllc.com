# DEUS server-software spec — supplier conversation sheet

For self-hosted deployment of `bongartzdiaz/DEUS-SHARED` at
`deus.lucenai.eu`. Written to be sent to the hosting supplier as a
standalone document — they should be able to read this top-to-bottom
and answer "yes the existing dedi is enough" or "you need a bigger
box, here's what".

---

## 1. The architecture decision (read first)

Before sizing, one architectural question has to be answered. It
changes the per-client RAM footprint by ~10×.

### Option A — Logical multi-tenancy (current code)

One database, one app process. Every row has an `organizationId`
column, every query is scoped by it. This is what the current
DEUS-SHARED codebase already implements.

- **Per-client cost:** ~rows in shared tables (negligible per
  tenant — measured in MB)
- **Capacity on a single GEX44-class dedi:** 500-1000+ tenants
- **Operational overhead:** one DB to back up, one Prisma migration
  to run, one connection pool to tune.
- **Blast radius:** a SQL bug that drops the `organizationId` filter
  exposes data across tenants. We have automated tests + audit
  reviews catching this, but the *physical* isolation is missing.

### Option B — Physical DB-per-tenant (what your message describes)

One app process, but each client gets its own MariaDB database
(`deus_clientA`, `deus_clientB`, …). The app reads `client-name`
from the URL path, looks up the tenant config, connects to that
tenant's DB. App code stays largely the same — only the connection
factory changes.

- **Per-client cost:** ~150-500 MB on disk, ~50-100 MB RAM
  (connection pool + InnoDB buffer slice)
- **Capacity on a single GEX44-class dedi:** 50-100 tenants
- **Operational overhead:** one Prisma migration *per tenant* on
  schema changes, one backup job per DB, one row in a tenant
  registry.
- **Blast radius:** strong physical isolation. A SQL bug can't
  cross DBs.

### Option C — One full app instance per tenant (heaviest)

PM2 runs a separate Node process per client. Caddy routes by path
to the right upstream port. Each tenant has its own DB, app
process, and config. Closest to "managed dedicated".

- **Per-client cost:** ~500 MB RAM for the Node process + DB
  footprint
- **Capacity on a single GEX44:** 15-25 tenants
- **Operational overhead:** highest. Use only if a client demands
  it (regulated industry, EU data-sovereignty contract, etc.).

**Default recommendation:** start with Option B for the new
"client-name" pattern. Strong isolation, manageable ops, code
change is one connection-factory layer. Move specific clients to
Option C if a contract requires it.

---

## 2. URL pattern — path vs subdomain

You proposed `deus.lucenai.eu/client-name`. The alternative is
`client-name.deus.lucenai.eu`. Both work. Trade-offs:

| Aspect | `deus.lucenai.eu/client-name` | `client-name.deus.lucenai.eu` |
|---|---|---|
| TLS cert | One cert for `deus.lucenai.eu` | Wildcard cert `*.deus.lucenai.eu` |
| Cookie isolation | Cookies on `deus.lucenai.eu` are visible to ALL clients (cross-client risk) | Cookies on `clientA.deus.lucenai.eu` are NOT visible to `clientB.*` (clean isolation) |
| Asset URLs | App must know the prefix on every link/image (more code complexity) | App is unaware of the prefix (zero-touch) |
| OAuth callbacks | One generic callback URL with state-encoded tenant | One callback URL per tenant or shared with state |
| DNS setup | One A record | One A record + a wildcard A record |
| Operator complexity | Higher | Lower |

**Recommendation:** subdomain-per-tenant
(`client-name.deus.lucenai.eu`). Wildcard A record points at the
dedi, Caddy auto-issues per-host certs via DNS-01 challenge. Cookie
isolation is automatic. App code changes are minimal.

If the path-based pattern is non-negotiable, we can do it, but the
auth code needs explicit cookie scoping (`Path=/client-name`) and
the OAuth callback handlers need extra care.

---

## 3. Required server software (OS-level install)

This is what actually has to be apt-installed on the box.

### Base OS
- **Ubuntu 24.04 LTS** (preferred — current Hetzner runbook targets
  this) or **Debian 12** stable.
- Standard: `curl`, `wget`, `gnupg`, `ca-certificates`, `git`, `jq`,
  `unzip`, `htop`, `build-essential` (for native node modules like
  bcrypt).

### Runtime
- **Node.js 22 LTS** — install via NodeSource APT repo.
- **pnpm 9** — preferred package manager (`npm install -g pnpm`).
- **PM2** — process supervisor (`npm install -g pm2`).

### Web layer
- **Caddy 2** — reverse proxy + auto-TLS (Let's Encrypt). Wildcard
  cert via DNS-01 challenge requires the Caddy DNS provider plugin
  for whichever DNS is canonical (Cloudflare, TransIP, Hetzner DNS).
  Plugin is a Caddy build flag — supplier may pre-build or install
  via `xcaddy`.

### Databases
- **MariaDB 11.4 LTS** — Prisma data layer (every model except auth).
  Tuning for 64 GB box: `innodb_buffer_pool_size = 24G`,
  `max_connections = 500`.
- **PostgreSQL 17** — Lucia auth DB only (users + sessions).
  Smaller footprint: `shared_buffers = 4G`, `effective_cache_size =
  16G`. Coexists with MariaDB on the same host.

### Cache / rate-limit (recommended, not strict)
- **Redis 7** — rate-limit token-bucket store + session cache. The
  current code uses an in-process token bucket which doesn't survive
  PM2 restart and doesn't share across instances. Redis is the
  standard upgrade. ~512 MB RAM.

### Backup tooling
- **b2 CLI** (Backblaze) — daily Postgres + MariaDB dumps to an EU
  B2 bucket. Pre-install `/usr/local/bin/b2`.
- Cron job hits `/etc/cron.d/deus`, runs the existing
  `scripts/migrate-to-hetzner/08-backup-cron.sh`.

### Security
- **ufw** firewall — open only 22, 80, 443.
- **fail2ban** — SSH brute-force defense.
- **unattended-upgrades** — security patches only, no kernel.
- **OpenSSH** — already on every dedi; just hardened (key-only,
  `PermitRootLogin no`).

### Email
- **Resend API** — SaaS, no server install. Just an env var
  (`RESEND_API_KEY`). DNS-side: SPF + DKIM records on
  `lucenai.eu`.
- Optional fallback: **Postfix** as a relay-only MTA, but only if
  the supplier already manages it.

### Observability
- **Sentry SDK** — SaaS, no server install. Env var `SENTRY_DSN`.
- **journalctl + logrotate** — built into systemd, no extra install.
- **UptimeRobot** (or Pingdom) — external, hits `/api/health`. SaaS.

### NOT needed
- Docker / Kubernetes — Next.js runs directly under PM2.
- Webserver before Caddy — no Apache/nginx layer.
- A separate DNS server — using the registrar's DNS.
- Load balancer — single-box for now; scale-out is a future
  architectural step, not blocking week-one.

---

## 4. Resource sizing — per-tenant footprint

Numbers below are for **Option B (physical DB-per-tenant)**. For
Option A, divide everything by 100. For Option C, multiply RAM by 2.

### Per-tenant footprint (steady state, 50 users + 10k contacts)

| Resource | Per-tenant cost |
|---|---|
| Disk (MariaDB) | 150-500 MB |
| Disk (Postgres lucia row) | <1 MB |
| RAM (MariaDB connection pool, 10 active) | 80-100 MB |
| RAM (InnoDB buffer slice on shared pool) | 30-50 MB |
| RAM (app-side Prisma client) | 20 MB |
| **Total per tenant** | **~150 MB RAM, ~300 MB disk** |

### Shared baseline (constant regardless of tenant count)

| Resource | Cost |
|---|---|
| OS + systemd | 1 GB RAM |
| Caddy 2 | 100-200 MB RAM |
| Node.js / Next.js / PM2 | 500-800 MB RAM |
| MariaDB server (without buffer pool) | 1 GB RAM |
| Postgres server | 500 MB RAM |
| Redis (if installed) | 256-512 MB RAM |
| MariaDB innodb_buffer_pool | 16-24 GB RAM (tunable) |
| Backups buffer (B2 staging) | 1-2 GB disk |
| **Baseline RAM** | **~20-28 GB** |
| **Baseline disk** | **~10 GB** (OS + tools) |

### Capacity envelopes by box size

| Dedi class | RAM | Tenants @ Option B | Tenants @ Option C |
|---|---|---|---|
| AX42 / 32 GB | 32 GB | ~30-50 | ~5-10 |
| GEX44 / 64 GB | 64 GB | ~80-120 | ~15-25 |
| EX101 / 128 GB | 128 GB | ~250-400 | ~50-80 |
| AX162 / 256 GB | 256 GB | ~600-900 | ~150-250 |

Disk is rarely the constraint at this scale — even 1000 tenants ×
500 MB = 500 GB, fits comfortably on a 1 TB NVMe.

### Network

- 1 Gbps unmetered or 100 TB/month is plenty for a CRM workload.
- Typical: <50 GB/month per tenant (mostly API + asset bytes).
- Webhooks (Stripe, Google Calendar push) are tiny.

---

## 5. What changes in the DEUS-SHARED codebase for Option B

The current code is single-DB. Going DB-per-tenant requires three
specific additions:

### A. Tenant resolver middleware

Reads `client-name` from the URL (path or subdomain), looks up the
tenant in a small registry, attaches the tenant's DB connection
string to the request context.

```ts
// lib/tenant.ts (new)
export async function resolveTenant(req): Promise<Tenant> {
  const slug = subdomainOf(req.url) || pathFirstSegment(req.url);
  const tenant = await registryDb.tenant.findUnique({ where: { slug } });
  if (!tenant) throw new Error("unknown_tenant");
  return tenant; // includes mariaDbUrl, postgresAuthDbUrl
}
```

### B. Per-tenant Prisma client factory

Right now there's a single `getAuthPrisma()` shared across the app.
For Option B, that becomes `getTenantPrisma(tenant)` with a
connection-pool cache keyed by tenant slug. ~80 lines.

### C. Tenant registry — one table, shared

Lives in a small "control plane" Postgres DB:

```sql
CREATE TABLE tenant (
  id           UUID PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,        -- "client-a"
  display_name TEXT NOT NULL,
  mariadb_url  TEXT NOT NULL,                -- per-tenant DB
  postgres_url TEXT NOT NULL,                -- per-tenant Lucia DB (or shared)
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### D. Provisioning script

Adding a new client = one shell command. Roughly:
1. Create MariaDB DB + user
2. Run all Prisma migrations against it
3. Insert tenant row in registry
4. Issue cert for `client-name.deus.lucenai.eu` (Caddy does this
   automatically the first time a request hits)

This is ~150 LOC of TypeScript / shell. Not blocking week-one if
you provision the first 1-2 tenants by hand from a runbook.

### E. Connection pool sizing

Each tenant pool starts with `connection_limit = 5`. With 100
tenants × 5 connections = 500 connections — matches the MariaDB
`max_connections = 500` setting above. If you go past 100 tenants,
either raise `max_connections` or lower per-tenant pool size to 3.

---

## 6. Cutover sequence (week one)

1. Supplier confirms dedi spec is sufficient (this doc).
2. Run `scripts/migrate-to-hetzner/01-bootstrap.sh` per the existing
   Hetzner cutover runbook — installs everything in §3 above.
3. Add `wildcard_*.deus.lucenai.eu` A record at the registrar
   pointing at the dedi's IP.
4. Configure Caddy with the wildcard `on_demand_tls` + DNS-01
   provider plugin.
5. Build the tenant resolver + Prisma factory (§5 A, B, C).
6. Provision tenant 1 (you / Hash) end-to-end.
7. Provision tenant 2 as a real customer.
8. From there, every new tenant is ~5 minutes (one provisioning
   script run).

---

## 7. Questions for the supplier

Concrete, copy-paste:

1. Box spec (cores / RAM / NVMe)?
2. Network: dedicated 1 Gbps? Bandwidth allowance?
3. Region: EU-hosted? (Required for GDPR — Falkenstein, Helsinki,
   Amsterdam all fine.)
4. RAID for the disk? (Recommend RAID-1 or hardware-mirrored NVMe
   for production CRM.)
5. Snapshots: how often, where stored?
6. Reverse-DNS / PTR record: can we set it to
   `deus.lucenai.eu`?
7. IPv6 included?
8. Console / KVM / Rescue access if SSH locks us out (the
   bootstrap script disables password auth — no key = no recovery
   without KVM).
9. DDoS protection at the network layer (Hetzner / OVH include
   this; budget hosts often don't).
10. Bandwidth overage policy.

---

## 8. Quick-decision summary

If your existing dedi is **GEX44-class (64 GB) or larger**:
- Option A (logical) → effectively unlimited tenants. Default if
  no contract requires physical isolation.
- Option B (DB-per-tenant) → up to ~80-120 tenants. Recommended for
  the `client-name` pattern.
- Option C (instance-per-tenant) → up to ~15-25 tenants. Reserve
  for one-off contracts.

If your existing dedi is **AX42-class (32 GB) or smaller**:
- Option A → still fine for a few hundred tenants.
- Option B → 30-50 tenants ceiling. Plan dedi #2 around tenant 25.
- Option C → too tight; upgrade before you onboard customer #5.

If you're buying a *new* dedi specifically for this:
- Pick **GEX44 or EX44** as the floor. 64 GB is the sweet spot for
  Option B at 50+ tenants without re-architecting.
- 1 TB NVMe is fine; disk is not the constraint.
- EU region (Hetzner Falkenstein is the standard pick).

---

## What this doc does NOT cover

- Application-level rate limits (handled per-tenant in the app via
  Redis tokens — see `lib/philly/rate-limit.ts` in the existing
  codebase).
- Migration of existing tenants from juandiazllc.com to DEUS-SHARED
  (covered separately in `docs/repo-split-cutover.md`).
- Stripe billing per tenant (each tenant = one `Subscription` row,
  one Stripe Customer; no infra change).
- Email deliverability across tenants (Resend handles this; one
  domain for transactional, optional per-tenant sub-domain for
  marketing).
- DR / cross-region replication (single-box for now; multi-region
  is a Q3+ architectural step).
