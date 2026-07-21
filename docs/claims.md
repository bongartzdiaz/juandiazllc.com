# Claims — one source of truth

Every number and factual claim used in marketing copy lives here once. Copy on
any surface quotes this file; nothing invents its own figure.

This exists because the same claim was appearing with different numbers in
different places. On 2026-07-21, live and public simultaneously:

| Claim | diazatlas.com | Elsewhere |
| --- | --- | --- |
| AutoCAD LT price | `$455/yr` | `$575/year` — the 30-post social captions pack, EN and ES |
| Diaz Editor regular price | `€997` | `€1,000` — pv-string-sizer README on GitHub |

Neither is a style problem. A competitor price that is wrong is misleading
advertising, and two different prices for your own product reads as
carelessness to exactly the buyer who is comparing carefully.

## Rules

1. **A number appears here or it does not get published.** No figure goes
   straight into copy.
2. **Every competitor claim carries a source and a date.** Vendor pricing
   changes; an undated claim rots silently.
3. **Nothing that implies traction we do not have.** No customer counts, no
   revenue, no testimonials, no "trusted by". As of 2026-07-21 there has been
   no completed purchase — all six issued licences are manual grants, two of
   them to family. Any success claim is false today.
4. **When a number changes, change it here, then grep for the old value.**

---

## Diaz Editor — pricing

| Claim | Value | Status |
| --- | --- | --- |
| Founding Beta price | €99, one-time | ✅ verified — `unit_amount: 9900` in `diaz-beta-checkout` |
| Founding Beta cap | 100 spots | ✅ verified — `public_beta_status.cap = 100` |
| Founding spots taken | 2 | ✅ verified — `public_beta_status.sold`, changes; never hardcode |
| Regular price after beta | €997, one-time | ✅ decided 2026-07-21 — chosen over €1,000 because it already appeared on the site, pricing page and checkout |
| Subscription | None. One-time purchase. | ✅ verified — Stripe `mode: 'payment'`, not `subscription` |
| Updates | Lifetime | ✅ product promise, no expiry in licence issuance |
| Trial | 14 days, no card | ✅ verified — `diaz-trial-init` |
| Educational tier | €500 | ✅ live Payment Link on the homepage |

~~**Action:** pick €997 or €1,000 and make both surfaces agree.~~ **Done
2026-07-21.** €997 it is; the pv-string-sizer README was corrected to match.
The remaining risk is the same one repeating: four surfaces carry prices, and
nothing enforces that they agree. When this number next changes, grep for the
old value across all four before calling it done.

## Diaz Editor — product

| Claim | Status |
| --- | --- |
| 3D building editor + 2D CAD module | ✅ |
| DXF import and export | ✅ |
| **Native DWG** | ❌ **NEVER CLAIM THIS.** DXF only. See `project_diaz_editor_gtm_claims` |
| Works offline, no cloud | ✅ desktop app, local files |
| PDF export with title block + bill of materials | ✅ |
| 30+ trade components | ✅ as stated on site; recount before changing the number |
| 9 disciplines | ✅ as listed on site |
| Languages | EN, NL, DE, ES — server-rendered, full hreflang ✅ verified |

## Competitor pricing — every one needs a dated source

⚠️ **All figures below are unverified.** They are the numbers currently in use,
not confirmed prices. Before the next copy change, check each against the
vendor's own pricing page and record the date. An out-of-date competitor price
in an ad is a legal problem, not a typo.

| Product | Figure in use | Where | Source | Checked |
| --- | --- | --- | --- | --- |
| AutoCAD LT | `$455/yr` | diazatlas.com | — | ⚠️ never |
| AutoCAD LT | `$575/year` | social captions | — | ⚠️ conflicts with the above |
| SketchUp Pro | `$349/yr` | both | — | ⚠️ never |
| Fusion 360 | `$545/yr` | diazatlas.com | — | ⚠️ never |
| Revit | `$2,805/year` | social captions | — | ⚠️ never |
| AutoCAD (full) | `~€2,203/yr` | GTM claims memo | Autodesk list price, "from" | dated, pre-publish |

**Action:** one person, one afternoon, six vendor pages. Then this table is an
asset instead of a liability.

## juandiazllc.com

| Claim | Status |
| --- | --- |
| Fractional revenue operator / operations consultant | ✅ positioning, not a factual claim |
| Sectors: energy, real estate, hospitality + adjacent | ✅ |
| Construction-management background | ✅ |
| Ventures named as live: Voltafy, Performance Tracker, Help Mij Besparen, Salderingsregeling 2027 | ✅ real projects — but see below |
| Client results, revenue figures, testimonials | ❌ none exist; do not imply any |

**Careful with venture copy.** Describing a venture is fine. Implying it earned
a specific outcome is not, unless the number is here with a source. The
Performance Tracker copy was already corrected once for claiming inverter
integrations that do not exist in the code.

## Where copy lives

| Surface | Source of copy |
| --- | --- |
| juandiazllc.com | `lib/i18n/dict.ts` (en/nl/de/es) + `components/sections/*` |
| diazatlas.com | `diaz-editor` repo, HTML with `data-nl` / `data-de` / `data-es` attributes |
| Social posts | `diaz-content-vault` manifest + `CAPTIONS-30-POSTS-EN-ES` in `diaz-editor` |
| pv-string-sizer | its own README |

A price change touches all four. That is the point of this file.
