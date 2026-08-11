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

**That risk fired twice more, 2026-08-11.** Both in edge functions — a surface
nobody greps, because it lives in Supabase rather than in this repo.

- `diaz-trial-init` offered "€99 (i.p.v. €1.000)" in the trial welcome email.
  Corrected to €997, redeployed as v5, verified against the served source.
- `diaz-affiliate-activate` said "Free Pro license (€1.000 value)" and listed
  "Pro · €1.000" in the partner commission table. Corrected to €997,
  redeployed as v5. Never sent — `affiliate_partners` is empty — but live.

**The full surface list, for the next price change:** this file, the pricing
page, the checkout, the pv-string-sizer README, and the edge functions
(`diaz-trial-init`, `diaz-affiliate-activate`, `diaz-beta-checkout`). Grep the
old value across all of them before calling it done. The edge functions are the
ones that get forgotten.

**The invented commission ladder is gone. Fixed 2026-08-11, v6.** The partner
email in `diaz-affiliate-activate` printed a five-step ladder: Solo €500, Pro
€997, Team €2.500, Enterprise €5.000, Agency €10.000. Only Pro was covered by
this file. "Solo" and "Team" are not tiers at all — the licence tiers in the
database are basic/pro/lifetime/educational/enterprise/agency — and €2.500,
€5.000 and €10.000 appear on no other surface.

It now prints only prices this file verifies: Founding Beta €99, Pro €997,
Educational €500, each times the partner's own rate. Enterprise and agency are
described as quoted per deal at the same percentage, which is true and does not
require a number we have not set.

**Rule this leaves behind:** a partner-facing email is a price list. Every
number in one has to trace back to this file, or be phrased as a quote.

**€197 is dropped. Decided 2026-08-11 by Juan.** A 2026-07-26 session had
recorded a move to a single tier of €197 one-time, replacing €99/€497/€997.
It was never implemented anywhere — not in this repo, not in the diaz-editor
checkout, not in `diaz-beta-checkout`, which still charges `unit_amount: 9900`.
The prices in the table above stand: **€99 Founding Beta, €997 after.** Treat
any €197 you find in notes or drafts as stale.

## Diaz Editor — product

| Claim | Status |
| --- | --- |
| 3D building editor + 2D CAD module | ✅ |
| DXF **export** | ✅ verified — `packages/editor/src/lib/dxf-export.ts`, ships in v0.4.46 |
| DXF **import** | ⚠️ merged 2026-07-26, but **in no downloadable build yet**. Do not claim until a release ships with it. Walls only, from user-selected layers |
| **IFC** (any version, import or export) | ❌ **NEVER CLAIM THIS.** Zero lines of IFC code exist. See below |
| **Native DWG** | ❌ **NEVER CLAIM THIS.** DXF only. See `project_diaz_editor_gtm_claims` |
| Works offline, no cloud | ✅ desktop app, local files |
| PDF export with title block + bill of materials | ✅ |
| 30+ trade components | ✅ as stated on site; recount before changing the number |
| 9 disciplines | ✅ as listed on site |
| Languages | EN, NL, DE, ES — server-rendered, full hreflang ✅ verified |

## Competitor pricing — every one needs a dated source

Checked 2026-07-21 against each vendor's own checkout, US pricing in USD.
**Three of the four were wrong**, and one product no longer exists under the
name we used.

| Product | Was in copy | Actual | Source | Checked |
| --- | --- | --- | --- | --- |
| AutoCAD LT | `$455/yr` (site), `$575/year` (captions) | **$540/year** | autodesk.com/products/autocad-lt/buy | 2026-07-21 |
| Revit | `$2,805/year` (captions) | **$3,005/year** | autodesk.com/products/revit/buy | 2026-07-21 |
| Autodesk Fusion | `$545/yr` as "Fusion 360" (site) | **$680/year** list, $510 first-year promo | autodesk.com/products/fusion-360/buy | 2026-07-21 |
| SketchUp Pro | `$349/yr`, `€349`, "349 Euro" | **$399/year** ($33.25/mo billed annually) | sketchup.trimble.com/en/plans-and-pricing | 2026-07-23 |
| SketchUp Studio | `$699/yr` | **$819/year** ($68.25/mo billed annually) | sketchup.trimble.com/en/plans-and-pricing | 2026-07-23 |

Three notes that matter more than the numbers:

1. **"Fusion 360" is now "Autodesk Fusion".** Naming a competitor's product
   wrong is a small thing that a comparison-shopper notices immediately.
2. **Fusion's price depends on tier and promo.** $680 is list for Fusion for
   Design; there is a 25%-off first year at $510, and cheaper tiers exist. A
   single number for Fusion is always going to be an approximation — say which
   tier, or drop it.
3. **These are USD — and that is the vendor's own currency.** Trimble and
   Autodesk list in USD on their own pricing pages; even SketchUp's German
   locale shows "$33,25 USD". Every €-denominated competitor figure our copy
   ever carried was an invention, not a vendor price. Quote USD, always.

~~**Action:** one person, one afternoon, six vendor pages.~~ **Done, all four
verified** (three on 2026-07-21, SketchUp on 2026-07-23 — the Trimble page
rendered for automated fetch on retry). The 2026-07-23 sweep (diaz-editor
PR #431) corrected 323 files including the `.md` blog sources, EUR variants
and derived 5-year totals the first sweep missed, plus the programmatic-SEO
generator templates so regeneration cannot reintroduce old numbers.
Re-check all of them before any campaign that leans on the comparison — vendor
pricing moves, and a stale figure in an ad is a legal problem rather than a
typo.

## juandiazllc.com

| Claim | Status |
| --- | --- |
| Fractional revenue operator / operations consultant | ✅ positioning, not a factual claim |
| Sectors: energy, real estate, hospitality + adjacent | ✅ |
| Construction-management background | ✅ |
| Ventures named as live: Voltafy, Performance Tracker, Help Mij Besparen, Salderingsregeling 2027 | ✅ real projects — but see below |
| Client results, revenue figures, testimonials | ❌ none exist; do not imply any |

## The IFC claim — how a feature that never existed reached 1,643 places

Counted on `main` 2026-07-26: **1,643 IFC mentions across 413 files**, against
**zero lines of IFC code** in `packages/` or `apps/`. Most of it was one
templated line repeated by the programmatic-SEO generators:

> *"DXF + IFC import — works with any architect, contractor or installer"*

A second template also claimed **DWG** — the one format the rules here have
always forbidden:

> *"DXF + IFC import/export — works with architects (IFC), contractors (DWG),
> and CNC workshops (DXF)"*

Corrected 2026-07-26 (diaz-editor PR, phase 3): 1,303 templated mentions swept
mechanically, the remaining ~102 rewritten by hand because they were embedded
in advice paragraphs — including a whole H2 section explaining how to run an
IFC workflow that does not exist.

**Two lessons worth keeping:**

1. **A generator multiplies a claim.** One wrong sentence in
   `_gen-programmatic-seo*.py` became a thousand. Any claim entering a template
   deserves the scrutiny of a claim entering a contract — fix the generator, or
   the sweep undoes itself on the next regeneration.
2. **"Built" is not "shipped".** DXF import was merged and tested on
   2026-07-26, but the newest downloadable build (v0.4.46, 4 July) does not
   contain it. Claiming it the day it merges is the same error as IFC, only
   subtler: the buyer downloads and cannot find the feature. **A claim goes
   live when the release does, not when the PR does.**

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
