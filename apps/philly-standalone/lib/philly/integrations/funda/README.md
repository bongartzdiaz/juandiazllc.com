# Funda integration — scaffold

**Status:** scaffolded with mock-driven tests, awaiting NVM/VBO partner-API credentials.

This directory implements the Funda integration as described in task #12 of the launch playbook. The full publish + lead-receive cycle is wired against an in-process mock server; when real Funda credentials land it should be ~2 days to flip from mock to production, not a 2-week build.

## What's in here

| File | Production-ready? | Notes |
|---|---|---|
| `types.ts` | partial | Wire-format types. Listing payload field names match the public NVM-XML schema; webhook event shape is GUESSED (Funda doesn't publish webhook docs publicly). |
| `adapter.ts` | yes | Pure functions: `validate(deusProperty)` + `toFundaPayload(...)`. 35 tests pin every rule + the address-split heuristic. |
| `client.ts` | yes (shape), no (URL) | OAuth2 client_credentials + listing CRUD. Hit the real Funda URL by setting `FUNDA_BASE_URL` env var; default points to `api.funda.nl/partner/v1`. |
| `mock-server.ts` | n/a (test-only) | Drop-in `fetch` replacement that responds with realistic Funda shapes. Records all calls for assertion. |
| `lead-ingestor.ts` | yes | Pure function: `FundaLeadWebhook` → `IngestOutcome`. 12 tests cover dedup, idempotency, invalid-payload paths. |
| `*.test.ts` | yes | 47 hermetic tests in adapter + client. 12 more in lead-ingestor. |

## What's NOT in here yet (next PRs)

1. **Database schema:** `PortalListing` model (Property ↔ portal mapping with unique `(portal, externalId)`). Adds ~15 lines to `prisma/schema.prisma`.
2. **`/api/properties/[id]/publish` route:** UI button → invokes `FundaConnector.publish()` → writes a `PortalListing` row. Idempotent on re-publish.
3. **Webhook receiver wire-up:** `app/api/webhooks/inbound/[provider]/route.ts` dispatches when `provider === 'funda'` → calls `ingestFundaLead()` → writes a Contact + audit row.
4. **i18n strings:** `FUNDA_VALIDATION_CODES` mapped to localised messages for the publish UI ("EPC vereist", "Postcode ongeldig", etc.).
5. **Webhook URL surface in `/integrations` UI:** show per-org `/api/webhooks/inbound/funda?org=…&token=…` with copy-to-clipboard.

## How to wire up credentials (operator)

When Funda grants partner access, you need three things:

```bash
# Set in Vercel prod env:
FUNDA_CLIENT_ID=<your client_id from NVM/VBO portal>
FUNDA_CLIENT_SECRET=<your client_secret>
# Optional — override the base URL if Funda points you at a sandbox:
FUNDA_BASE_URL=https://api.funda.nl/partner/v1
FUNDA_TOKEN_URL=https://api.funda.nl/oauth/token
```

Verify in `/integrations` UI → Funda → "Test connection". Should return:

> ✓ Connection ok (0 leads pending)

The empty leads list is expected on a fresh tenant — Funda only forwards leads matching listings you've published.

## Why scaffold before credentials?

Two reasons:

1. **Time-to-revenue when credentials land.** The bottleneck of "build the integration" is mostly NOT the wire format — it's the validation rules (EPC required, photo count, postcode shape) and the dedup-by-portal-id model. Those are pinned and tested today. When credentials land, swapping mock for real is hours, not weeks.

2. **Test coverage for the EU-pivot.** The validator catches the most common operator mistakes (missing EPC, wrong country, too few photos) BEFORE the listing goes to Funda. That's value even with no Funda access — the same validator powers a "publishable on Funda?" badge in the property list view.

## Design notes

- **Pure functions over classes where possible.** `adapter.ts` exports plain functions; `lead-ingestor.ts` takes a `ports` object instead of a Prisma client. This makes the unit tests trivial — no `vi.hoisted` + module mocks needed.
- **Connector class is a thin shim.** `FundaConnector` implements `BaseConnector` + `PortalPublisher`. It delegates to the pure functions via dynamic `import()`. The reason: the registry imports connectors eagerly, and we don't want every page that touches the registry to pull in the Funda HTTP client.
- **Errors carry codes, not just messages.** `FUNDA_VALIDATION_CODES` is a const-as-enum. The UI side translates the code to a localised message; the server side keeps the code for logging + retry decisions. Same pattern as `lib/philly/webhooks/secrets.ts`.
- **Idempotency is built into the type system.** `ingestFundaLead` returns a discriminated union; the caller must handle `duplicate_event` explicitly. No "oh I forgot to check the event ID" bugs.

## See also

- `~/.claude/projects/.../memory/launch_readiness_brief_2026-05-26.md` — strategic context for the Funda integration
- `~/.claude/projects/.../memory/competitor_whise.md` — why Funda matters for NL-FR-BE wedge
- `lib/philly/integrations/connectors/base.ts` — the `PortalPublisher` interface
