# Single Sign-On (SAML / OIDC) — operator setup runbook

The platform delegates authentication to **Supabase Auth**, which
supports SAML 2.0 (with the `Pro+` tier) and OIDC (any tier). This
runbook walks an operator through wiring an enterprise customer's
Identity Provider (IdP) into the platform end-to-end.

You do **not** need to write any platform code — Supabase handles
the SAML/OIDC handshake; the platform receives a normalised session
on the other side.

## Prerequisites

- Supabase project with the **Pro** plan or higher (SAML requires
  Pro; OIDC works on any tier).
- Admin access to the customer's IdP (Okta, Azure AD / Entra ID,
  Google Workspace, JumpCloud, OneLogin, Auth0, …).
- Supabase project ref and management API access token, or the
  Supabase Studio UI.
- The customer's verified email domain (e.g. `acme.com`).

## Decision: SAML or OIDC?

| | SAML | OIDC |
| ---- | ---- | ---- |
| **Best for** | Established enterprise IdPs (Okta, Entra ID) | Modern SaaS IdPs (Auth0, Google Workspace) |
| **Supabase tier** | Pro+ | All tiers |
| **JIT provisioning** | Yes | Yes |
| **SCIM provisioning** | Add separately | Add separately |
| **Recommended default** | ✅ for big enterprise | ✅ for SMB |

If unsure, ask the customer's IT for "what protocol does our IdP
publish for line-of-business apps" — they will name one.

## SAML setup (Okta example)

### 1. Create the SAML connection in Supabase

```bash
# Replace PROJECT_REF + SUPABASE_ACCESS_TOKEN.
curl -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth/sso/providers" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "saml",
    "metadata_url": "https://<okta-domain>/app/<app-id>/sso/saml/metadata",
    "domains": ["acme.com"]
  }'
```

The `domains` array is what makes IdP-initiated and SP-initiated
flows work — any user signing in with `@acme.com` is routed through
this IdP.

### 2. Configure the SAML app in Okta

- **Single Sign-On URL (ACS):** `https://<your-supabase-project>.supabase.co/auth/v1/sso/saml/acs`
- **Audience URI / Entity ID:** `https://<your-supabase-project>.supabase.co/auth/v1/sso/saml/metadata`
- **Name ID format:** `EmailAddress`
- **Application username:** `Email`
- **Attribute statements:**
  - `email` → `user.email`
  - `name` → `user.firstName + ' ' + user.lastName`
  - `groups` → `user.groups` (filter to org-admin / org-manager / org-viewer if you want IdP groups to drive role)

### 3. Test the end-to-end flow

1. Sign out of all sessions on the platform.
2. Visit `https://juandiazllc.com/login`.
3. Enter `<test-user>@acme.com` and submit.
4. Supabase redirects to Okta.
5. After Okta authenticates, control returns to Supabase, which
   issues a session cookie.
6. The platform's `requireScope()` provisions a Philly `User` row
   on first sight (`auth-helpers.ts:resolvePhillyUser`) — you do
   not need to pre-create the user.

### 4. JIT — what happens on first sign-in

The very first time a SAML/OIDC user lands on the platform:

- A `User` row is created with their email + name from the IdP
  assertion.
- They are placed in the **organisation whose admin invited them**
  (per the `Membership` table from Bundle G), or, if no
  organisation has invited them yet, they hit the onboarding flow
  to create or join an org.
- Role defaults to `viewer` unless the IdP attribute statement maps
  group → role; the org admin can promote them via the standard
  Users page.

### 5. Group → Role mapping (optional, recommended)

If the IdP publishes a `groups` claim, the platform can read it via
Supabase user-metadata and demand a particular group for a role.
Add the mapping in the customer's onboarding configuration — exact
mapping path is currently a manual operator step. _(Out-of-band
todo: ship `lib/auth/sso-group-map.ts` to make this declarative.)_

## OIDC setup (Auth0 / Google Workspace)

The shape is the same as SAML — register the app at Supabase as
`type: "oidc"`, point the `metadata_url` at the IdP's
`.well-known/openid-configuration`, and add the customer's email
domain. The flow on the platform side is identical.

```bash
curl -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth/sso/providers" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "oidc",
    "metadata_url": "https://acme.auth0.com/.well-known/openid-configuration",
    "domains": ["acme.com"],
    "client_id": "<auth0-client-id>",
    "client_secret": "<auth0-client-secret>"
  }'
```

## Per-customer hardening checklist

Once SSO is wired, walk the customer through the matching platform
controls — these are independent of the IdP:

- [ ] **Per-org IP allowlist** — `PATCH /api/admin/security` with
  `ipAllowlist: "<comma-sep CIDRs>"`. Set this so even valid SSO
  sessions can only land on the platform from the corporate VPN.
- [ ] **Session idle timeout** — `PATCH /api/admin/security` with
  `sessionIdleTimeoutMinutes: 30` (or whatever their policy says).
  Idle sessions are kicked back to SSO.
- [ ] **Mandatory 2FA for admins** — already enforced by the
  platform from Bundle F; no toggle needed. Inform the customer.
- [ ] **Audit log integrity** — schedule
  `npm run audit:chain -- --json` daily and pipe the output to
  their SIEM. Exit 1 = broken chain.
- [ ] **Audit log access** — admins can view `/audit` in-app.
  Tell the customer this exists; surprisingly common procurement
  question.
- [ ] **Sub-processor list** — share
  [`docs/legal/SUB-PROCESSORS.md`](../legal/SUB-PROCESSORS.md). Big
  customers will sign a DPA only after vetting this.
- [ ] **DPIA for AI features** — share
  [`docs/legal/DPIA-AI-ATTRIBUTES.md`](../legal/DPIA-AI-ATTRIBUTES.md)
  if the customer enables AI Attributes on contacts.

## SCIM provisioning

Production-grade enterprise customers expect **SCIM 2.0** for
automated user provisioning + de-provisioning from their IdP.
The platform now ships SCIM 2.0 (Bundle R, RFCs 7643 + 7644).
Operator setup lives in [`SCIM-SETUP.md`](./SCIM-SETUP.md) — the
short version is: issue a long-lived `ApiKey` row with
`scopes: ["scim:users"]`, hand it to the customer's IdP, point
the IdP at `https://<your-host>/api/scim/v2/Users`.

Status of the implementation:
- **Users**: shipped (CRUD, filter, pagination — RFC 7644).
- **Groups**: not yet shipped — group → role/sections mapping
  is the next milestone. Today, all SCIM-provisioned users land
  with the default `viewer` role and the operator manually
  promotes them.
- **`externalId` round-trip**: not persisted — the IdP's stable
  identifier isn't stored on the User row yet, so de-provisioning
  is by email, not by `externalId`.

## Troubleshooting

| Symptom | Probable cause | Fix |
| ---- | ---- | ---- |
| User sees "Onboarding required" after SSO | Domain not registered with Supabase, or IdP claim has no email | Verify `domains[]` in the SSO provider and the IdP's NameID format |
| 403 IP_NOT_ALLOWED | Per-org IP allowlist active | Check `Organization.ipAllowlist`; whitelist the customer's egress |
| 401 IDLE_REAUTH_REQUIRED | `sessionIdleTimeoutMinutes` exceeded | Re-authenticate via SSO |
| 409 NEEDS_ONBOARDING | First sign-in but no Membership exists | An org admin invites them via the Users page |
| Loop after IdP login | ACS URL or Audience URI typo | Compare the values in §2 against the Supabase project config |

Reference: [Supabase SSO docs](https://supabase.com/docs/guides/auth/enterprise-sso),
[Supabase SAML setup](https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml).
