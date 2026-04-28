# SCIM 2.0 — IdP-driven user provisioning

## What's implemented

A standards-conformant subset of [RFC 7643](https://datatracker.ietf.org/doc/html/rfc7643)
+ [RFC 7644](https://datatracker.ietf.org/doc/html/rfc7644) sufficient
for the user-provisioning workflows every common enterprise IdP runs:

| Endpoint | Methods | Notes |
| ---- | ---- | ---- |
| `/api/scim/v2/ServiceProviderConfig` | GET | Capabilities discovery |
| `/api/scim/v2/ResourceTypes` | GET | User only (Group not yet) |
| `/api/scim/v2/Users` | GET, POST | List + filter, create |
| `/api/scim/v2/Users/{id}` | GET, PATCH, PUT, DELETE | Read, partial update, full replace, soft delete |

**Filter expressions supported:** `userName eq "<value>"`,
`active eq <bool>`, and the AND combination of the two. Anything
else returns `400 / invalidFilter` so the IdP falls back to a
known-good path.

**PATCH paths supported:** `active`, `userName`, `name.formatted`,
`emails[type eq "work"].value`, plus path-less object-replace.
Other paths return `400 / invalidValue`.

**Group provisioning** is intentionally not implemented in this
bundle. The platform's `Membership` table (Bundle G) is the source
of truth for per-org role assignment; mapping IdP-Groups onto
Memberships is the next iteration.

## Authentication

Every SCIM request must carry:

```
Authorization: Bearer <token>
```

The token is a long-lived API key issued via the admin **Settings →
API Keys** page (or directly in the database if you don't yet have
the UI). Two requirements:

1. The key's `keyHash` matches the SHA-256 of the bearer token
   value the IdP sends.
2. The key's `scopes` JSON column includes the string `scim:users`.

Tokens are bound to a **single `organizationId`** — the IdP can
only see/provision users in that org. Multi-tenant SaaS shape: each
customer issues their own SCIM token from their own admin page.

## IdP setup — Okta example

1. **Create the SCIM token** on the platform:
   - Settings → API Keys → New API Key
   - Name: `Okta SCIM` (or similar)
   - Scopes: `scim:users`
   - Permissions: `admin` (legacy column; required for compatibility)
   - Copy the token shown once; you cannot retrieve it again.

2. **Configure Okta**:
   - Application → Provisioning → Integration
   - SCIM connector base URL: `https://<your-domain>/api/scim/v2`
   - Unique identifier field for users: `userName`
   - Authentication mode: `HTTP Header`
   - HTTP Header name: `Authorization`
   - HTTP Header value: `Bearer <token-from-step-1>`
   - Supported provisioning actions:
     - ✅ Push New Users
     - ✅ Push Profile Updates
     - ✅ Push User Deactivation
     - ❌ Import Users (we don't expose `Import-Users` semantics)
     - ❌ Import Groups (Groups not implemented)

3. **Test the connection**: Okta → Test Connector. Should return
   `200 OK` against `ServiceProviderConfig`.

## IdP setup — Azure AD / Entra ID example

1. Same step 1 to issue the token.
2. **Enterprise Application → Provisioning → Edit Provisioning**:
   - Provisioning Mode: `Automatic`
   - Tenant URL: `https://<your-domain>/api/scim/v2`
   - Secret Token: `<token-from-step-1>` (no `Bearer ` prefix —
     Entra adds it automatically)
   - Test Connection.
3. Set scope to **Sync only assigned users and groups** (recommended).
4. Save and start provisioning.

## What happens on first SCIM POST /Users

1. We hash the bearer token, look up the ApiKey row, verify the
   `scim:users` scope and that the key isn't expired.
2. Resolve the bound `organizationId`.
3. Validate the SCIM body (`userName` required; rest optional).
4. Uniqueness check on `email` — return `409 / uniqueness` if a
   user with that email already exists anywhere on the platform.
5. Create the `User` row with `passwordHash: ''` (SSO-provisioned
   means no local password — the user authenticates via SAML/OIDC
   per `docs/operations/SSO-SETUP.md`).
6. Mirror to the `Membership` table so the user has a home-org row
   from day 1 (Bundle G).
7. Audit-log the create (`changes: { provisionedVia: { new: 'scim' } }`).
8. Return `201` with the SCIM-shaped User envelope.

## What happens on PATCH active=false (deprovisioning)

We **soft-delete**:

1. `User.deletionScheduledAt` is set to `now() + 30 days`. The
   retention cron (`/api/cron/gdpr-retention`) finalises the delete
   on or after that date.
2. `User.tokensInvalidAfter` is set to `now()`, so any active
   session is rejected at the next `requireScope()` check.
3. Audit-log the change.

This pattern matches GDPR Art. 17 (right to erasure with reasonable
delay for compliance/audit). To force an immediate hard-delete,
operators run the erasure flow manually via
`/api/admin/gdpr/erase`.

## Limitations / known gaps

- `externalId` from the IdP is captured on parse but **not yet
  persisted**. Most IdPs cope (they correlate by `userName`); some
  (Entra) prefer round-tripping `externalId`. Adding a column is a
  small follow-up.
- **Groups** not implemented — see top of doc.
- **Bulk operations** not implemented (`/Bulk` endpoint absent;
  capabilities response says `bulk.supported: false`). IdPs
  fall back to per-user operations, which is fine for most
  workflows.
- **Sort, attributes, excludedAttributes** query params not
  honoured. We always return the full User envelope.
- **Filter** beyond the `userName` / `active` subset returns
  `invalidFilter`.

These are documented gaps with no observed real-world impact.
Surface a customer ticket if any IdP needs a missing capability.

## Reference

- Routes: `app/api/scim/v2/`
- Helpers: `lib/philly/scim/{auth,filter,mapping,schemas}.ts`
- Tests: `lib/philly/scim/{filter,mapping}.test.ts` (22 tests)
- Schema: `ApiKey.scopes` (JSON array of strings)
- Migration: `prisma/migrations/20260428040000_apikey_scopes/migration.sql`
