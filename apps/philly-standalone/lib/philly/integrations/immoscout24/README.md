# ImmoScout24 integration — scaffold

**Status:** scaffolded with mock-driven tests, awaiting ImmoScout24 partner programme credentials.

Sibling of `lib/philly/integrations/funda/`. Same shape, DE-specific. Closes task #14 of the launch playbook.

## What's in here

| File | Notes |
|---|---|
| `types.ts` | Wire-format types. Listing fields match the public IS24-XML schema; REST API may use camelCase variants — adjust at wire-up time. |
| `adapter.ts` | Pure: `validate(deusProperty)` + `toIS24Payload(...)` + `splitGermanAddress(...)`. |
| `client.ts` | OAuth2 client_credentials + offer CRUD + token cache. |
| `mock-server.ts` | Drop-in fetch replacement for hermetic tests. |
| `lead-ingestor.ts` | Pure: `IS24LeadWebhook` → `IngestOutcome` with dedup + 5 lead-type variants. |

## DE-specific differences vs Funda

| Aspect | Funda (NL) | IS24 (DE) |
|---|---|---|
| Country code | NL | DE |
| Postcode | 4 digits + 2 letters ("1011 AB") | 5 digits (e.g. "10117", "01067") |
| Energy scale | A++++ through G (NL revision 2025) | A+ through H (DIN V 18599 / EnEV 2014) |
| Cert. types | one | two: Bedarfsausweis + Verbrauchsausweis |
| Min photos | 4 | 3 |
| Max photos | 30 | 25 |
| Marketing type | `sale` / `rent` literals | `KAUF`/`MIETE`/`PACHT`/`ERBPACHT`/`WG_ZIMMER` |
| Lead types | 4 | 5 (adds FINANCING) |
| Contact name | flat `fullName` | structured `salutation`/`firstName`/`lastName` |

## How to wire up credentials (operator)

```bash
# Set in Vercel prod env:
IS24_CLIENT_ID=<your client_id from ImmoScout24 partner portal>
IS24_CLIENT_SECRET=<your client_secret>
# Optional sandbox override:
IS24_BASE_URL=https://api.immobilienscout24.de/restapi/api
IS24_TOKEN_URL=https://api.immobilienscout24.de/oauth/token
```

Then `/integrations` UI → ImmoScout24 → "Test connection" → should return:
> ✓ Connection ok (0 leads pending)

## Design notes

- **DEUS bedrooms → IS24 `numberOfRooms`** is a heuristic: assumes total rooms = bedrooms + 1 (one living room). Operator can override via `numberOfRooms` on the input shape.
- **EPC grade capping**: DEUS stores grades up to A++++ (NL 2025 scale), IS24 only accepts A+ as the top. The mapper caps anything starting with `A+` down to `A+`.
- **Address splitting handles roman numerals + range additions**: e.g. "Mozartstraße 7-9" → houseNumber=7, addition="-9". "Hauptstraße 42 III" → houseNumber=42, addition="III".
- **CALLBACK lead-type triggers `preferredMethod=phone`** — the only auto-mapping rule for inbound preference. All other types default to email.

## What's NOT in here yet (future PRs when credentials land)

Same five items as Funda — `PortalListing` Prisma model, `/api/properties/[id]/publish`, webhook dispatcher wiring, i18n strings for IS24_VALIDATION_CODES, `/integrations` UI surface. The Funda + IS24 surfaces should land together in single PRs since they're parallel.

## See also

- Sister scaffold: `lib/philly/integrations/funda/README.md`
- Connector base: `lib/philly/integrations/connectors/base.ts` (`PortalPublisher`)
