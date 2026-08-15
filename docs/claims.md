# Claims — one source of truth

Every number and factual claim used in marketing copy lives here once. Copy on
any surface quotes this file; nothing invents its own figure.

This exists because the same claim was appearing with different numbers in
different places. On 2026-07-21, live and public simultaneously:

| Claim | diazatlas.com | Elsewhere |
| --- | --- | --- |
| AutoCAD LT price | `$455/yr` | `$575/year` — the 30-post social captions pack, EN and ES |
| Diaz Editor regular price | `€997` | `€1,000` — pv-string-sizer README on GitHub |

Three weeks later the same shape was back, just with different numbers.
Measured 2026-08-12: the checkout charges **€197**, the homepage advertises
four tiers (€99 / €197 / €247 / €500), and the pv-string-sizer README still
says €99 → €997. Three surfaces, three answers, one product.

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

> ⚠️ **This table was rewritten on 2026-08-12 after measuring production.
> The version before it described a product that is not for sale.** What
> changed and why is in "The €197 reversal" below. Read that before quoting
> anything here.

Measured 2026-08-12 against project `vbozelswveaxsyccvaac` and the served
`https://diazatlas.com` (HTTP 200, 113,281 bytes).

| Claim | Value | Status |
| --- | --- | --- |
| Licence tier — 3 seats | €197, one-time | ✅ verified twice — `unit_amount: 19700` in the live `diaz-beta-checkout` (v28) **and** `public_beta_status.price_cents_eur = 19700` |
| Founding tier — 1 seat | €99, one-time | ⚠️ live Payment Link (HTTP 200) labelled €99 on the homepage. The **amount at Stripe is not verified** — Stripe renders it client-side, so it cannot be read from the served page. Check the dashboard. |
| Pro tier — 10 devices | €247, one-time | ⚠️ same: live Payment Link, label only, amount not verified |
| Educational tier — 25 seats | €500, one-time | ⚠️ same: live Payment Link, label only, amount not verified |
| Enterprise, agency | On quote, no list price | ✅ confirmed 2026-08-11 by Juan — by design, not omission |
| "Regular price after beta €997" | **Not live anywhere** | ❌ appears on no page, no buy link and in no edge function. See the reversal note. |
| Beta cap / spots taken | cap 100, sold 2 | ⚠️ the row still exists, but the `spots_left <= 0` gate was **removed on 2026-07-26** — the cap no longer stops a sale. `display_spots_left` equals the real 98, so the scarcity display is honest. |
| Subscription | None. One-time purchase. | ✅ verified — Stripe `mode: 'payment'`, not `subscription` |
| Updates | Lifetime | ✅ product promise, no expiry in licence issuance |
| Trial | 14 days, no card | ✅ verified — `diaz-trial-init` |
| Price direction | "Introductory price — rises at v0.5" | ✅ every tier on the homepage carries this line |

~~**Action:** pick €997 or €1,000 and make both surfaces agree.~~ ~~**Done
2026-07-21.** €997 it is; the pv-string-sizer README was corrected to match.~~

> ⚠️ **Overtaken 2026-08-12.** Aligning the two surfaces on €997 was correct on
> 2026-07-21 and obsolete five days later: the 2026-07-26 single-price decision
> moved the checkout to €197 and nobody swept the surfaces afterwards. Measured
> today, the pv-string-sizer README still read *"€99 lifetime founding, then
> €997 once"* — two prices, neither of them the one a buyer is charged. It is a
> public repo README, so that was live and readable by anyone comparing.
>
> **Fixed the same day**, once the price was confirmed:
> `bongartzdiaz/pv-string-sizer` PR #3, merged. Both mentions now read €197.
> Only the twice-verified figure went in; the €99 seat-tier label stayed out
> because what that Payment Link charges is still unverified.

The risk this was meant to close never closed: four surfaces carry prices and
nothing enforces that they agree. It has now failed twice. When the number next
changes, sweep all four and re-read each one afterwards — do not stop at the
surface you set out to fix.

**First, the thing that makes every price claim here checkable: there are two
Supabase projects.**

| project | ref | what it is |
| --- | --- | --- |
| `diaz-editor` | `vbozelswveaxsyccvaac` | **production.** 22 tables, 25 views, 39 edge functions, 6 licences, 155 update events, 63 downloads. Functions deploy from `bongartzdiaz/diaz-editor` via GitHub Actions, so the repo is canonical. |
| `juandiazllc` | `wbgiouuifqhasedncysw` | this site's own project. Also contains an **abandoned copy** of `diaz_editor` from May: 10 tables, 2 licences, everything else empty, functions hand-deployed and never updated since. |

The installed desktop apps call the first one. That is fixed in
`apps/editor/lib/supabase-config.ts` as `SUPABASE_PROJECT_REF`, mirrored in
`electron/config.js`. Before writing "production does X" about Diaz Editor,
check which ref you measured.

**Why this matters for prices, 2026-08-11.** A sweep found "€99 (i.p.v.
€1.000)" in `diaz-trial-init` and "Free Pro license (€1.000 value)" plus a
"Pro · €1.000" commission table in `diaz-affiliate-activate`. Both were
corrected and redeployed — **in the `juandiazllc` copy, which serves nobody.**

Production was already clean. Measured against the repo that deploys it: the
live `diaz-trial-init` and `diaz-affiliate-activate` contain no price at all;
the partner email states the commission percentage and nothing else. No
customer or partner ever saw €1.000 from these functions.

So the €1.000 leak was real but confined to a dead duplicate. Recorded because
the *shape* of the mistake is the point: two projects, one name, and a
measurement taken in the wrong one reads exactly like a measurement taken in
the right one.

**The full surface list, for the next price change:** this file, the pricing
page, the checkout, the landing pages (`landing/index.html` + de/es), the
pv-string-sizer README, and the edge functions **of project
`vbozelswveaxsyccvaac`** — which means a PR to `bongartzdiaz/diaz-editor`, not
a manual deploy, because CI overwrites hand-deploys on the next run.

**The invented commission ladder — same story, same dead copy.** The partner
email in the `juandiazllc` copy of `diaz-affiliate-activate` printed a
five-step ladder: Solo €500, Pro €997, Team €2.500, Enterprise €5.000, Agency
€10.000. Only Pro was covered by this file. "Solo" and "Team" are not tiers at
all — the licence tiers are basic/pro/lifetime/educational/enterprise/agency —
and €2.500, €5.000 and €10.000 appear on no other surface. It was rewritten to
print only verified prices, but again: in the copy nobody calls.

**Production never had that ladder.** The live `diaz-affiliate-activate`
mentions no price; it shows the partner's percentage and stops. Whoever wrote
the ladder wrote it into the duplicate only. Keep it that way — a
partner-facing email that names a percentage cannot go stale when a price
changes.

**Enterprise and agency are sold on quote. Confirmed 2026-08-11 by Juan.** So
those two tiers have no list price by design, not by omission — do not add one
to this table, and do not let a later sweep "fill the gap". What a partner
earns on them is the same percentage of whatever the deal closes at.

Checked against a fourth surface while fixing this: the Diaz Editor landing
pages carry four live Stripe Payment Links, and none of them is €2.500, €5.000
or €10.000. That confirms the ladder was invented rather than copied from
somewhere I had not looked.

> ⚠️ **Corrected 2026-08-12.** This paragraph originally added "and advertise
> exactly two prices — €99 and €500". That was wrong: the four links are €99,
> €197, €247 and €500. The check had looked for the two prices it expected and
> reported their presence as completeness. Counting the links and reading only
> some of their labels is how a sweep passes while missing half the ladder.
> See "The €197 reversal" below.

**Two rules this leaves behind.**

1. A partner- or customer-facing email is a price list. Every number in one has
   to trace back to this file, or be phrased as a percentage or a quote. The
   production emails already do the percentage thing — that is why they did not
   rot.
2. Name the project ref in any claim about Diaz Editor production. "The edge
   function says X" is not a fact until you say *which* project's edge function.
   Two projects carry a `diaz_editor` schema and functions with identical
   slugs; only `vbozelswveaxsyccvaac` is reachable from an installed app.

## The €197 reversal — 2026-08-12

**What this file said yesterday was the opposite of what production does.**

The 2026-08-11 entry read: "€197 is dropped. Decided by Juan. It was never
implemented anywhere — not in this repo, not in the diaz-editor checkout, not
in `diaz-beta-checkout`, which still charges `unit_amount: 9900`. The prices in
the table above stand: €99 Founding Beta, €997 after."

Every factual half of that is wrong. Measured 2026-08-12:

| what was claimed | what production does |
| --- | --- |
| `diaz-beta-checkout` charges `unit_amount: 9900` | the live v28 in `vbozelswveaxsyccvaac` charges **19700**, `tier: 'pro'`, and writes `amount_eur: 197` to `checkout_session` |
| "€197 was never implemented" | `diazatlas.com` carries €197 **96 times**, `/beta` **56 times**, and `public_beta_status.price_cents_eur` is **19700** |
| "the landing pages advertise exactly two prices, €99 and €500" | four tiers with four live Payment Links: €99, €197, €247, €500 |
| "€997 after" | €997 appears on no live page, no buy link, no edge function |

**Where the 9900 came from.** It was read out of `wbgiouuifqhasedncysw` — the
abandoned copy, which still held the pre-July version of the function. Same
failure as the €1,000 leak recorded above, one section earlier, in the same
week: a measurement in the dead project reads exactly like a measurement in the
live one. The live function even carries the decision in its own comments —
*"2026-07-26: de `spots_left <= 0`-gate is verwijderd. Er is één prijs (€197)"*
and *"deze functie verkoopt alleen de €197-tier (unit_amount 19700, tier
'pro'). €99 en €247 lopen via Payment Links."*

This reopened the decision, because the original one was taken on a false
premise: Juan agreed to drop €197 on the stated grounds that it existed only in
stale notes. It does not — it is the only price the checkout charges.

**Retaken and confirmed 2026-08-12 by Juan: the price is right as it stands.**

- [x] The live four-tier ladder (€99 / €197 / €247 / €500, by seat count) is
      the intended product, not drift.
- [x] **€197 is the standard licence price.** Verified twice against
      `vbozelswveaxsyccvaac` and confirmed by Juan. Quote this.
- [ ] **€997 has no live surface and no stated future role.** Nothing was said
      about reviving it, so treat it as dead until someone says otherwise — but
      this is inference, not instruction. Do not quote it.
- [ ] **The €99, €247 and €500 Payment Link amounts are still unverified.**
      Stripe renders the amount client-side, so the served page cannot be read
      — 540 kB of JS with no figure and no occurrence of "Diaz". Only the
      dashboard settles it. Until then, the button labels are labels, not
      confirmed prices.

The second box is a measurement no one has taken, not a decision anyone is
waiting on. It stays open because "the price is good" confirms the ladder, not
that every link bills correctly.

**And the rule this earns.** A price is verified when it is read from the thing
that takes the money — the live edge function, the live DB row, or the Stripe
dashboard — with the project ref named. A price read from a repo file, a draft,
or a function in the wrong project is a lead, not a fact.

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

## juandiazllc.com — /pricing (DEUS)

Registered 2026-08-15, after a sweep found this page publishes eight price
figures and **not one of them appeared in this file**. Rule 1 says a number
appears here or it does not get published. The whole ladder had been live in
four languages for months.

**Our own figures.** Source: `_drafts/pricing/pricing-tiers.csv` →
`npm run regen:pricing` → `app/[locale]/pricing/page.tsx`.

| Tier | Monthly, per seat | Annual, per seat | Min seats |
| --- | --- | --- | --- |
| Starter | €40 | €32 | 3 |
| Professional | €69 | €55 | 5 |
| Business | €99 | €79 | 10 |
| Enterprise | on quote | on quote | 15 |

⚠️ **These are list prices, not verified prices.** By the standard this file
sets in the €197 reversal — a price is verified when it is read from the thing
that takes the money — none of them qualify, because **nothing takes money for
DEUS.** No checkout, no Stripe product, no Payment Link; every CTA on the page
goes to `/contact`. That is honest while the page keeps saying so, but these
cannot be quoted the way €197 can be quoted for Diaz Editor.

**The competitor claim.** Checked against HubSpot's own pricing pages on
2026-08-15:

| Product | Was in copy | Actual | Source |
| --- | --- | --- | --- |
| HubSpot Starter | `€20` per seat/month | **$20** per seat/month list, $7 promo at time of check | hubspot.com/pricing/crm |
| "their Marketing Hub" | `€1,000/month` | **$800/month** Professional (3 seats); Enterprise **$3,600/month** | hubspot.com/pricing/marketing |

Same failure as the Autodesk and SketchUp figures one section up, and the same
root cause: a US vendor's price re-denominated into euros. €1,000 corresponds
to nothing HubSpot publishes. Corrected in all four locales on 2026-08-15; the
answer now names the tier, the currency and the check date, so the claim dates
itself in front of the reader.

**€997 does not belong on this page.** A prompt drafted 2026-08-15 asked to
"make /pricing honest about €997". Two things are wrong with that. €997 is a
Diaz Editor figure and this page sells DEUS, so publishing it here would invent
a price for the wrong product. And this file already rules on it: €997 has no
live surface and no stated future role, do not quote it. Not done, on purpose.

### Open, not decided

- The feature table promises **SSO, IP allowlist, 99.5% / 99.95% uptime SLA,
  dedicated server, white-label, custom domain**. Those are product promises
  for a product with no paying customer. Rule 3 forbids implying traction; it
  says nothing about promising features. Check each row against DEUS-SHARED
  before a real prospect reads it.
- The migration offer promises **five business days, two training sessions, 30
  days priority support**. No migration has ever been delivered. That is an
  offer rather than a track record, but it is still a commitment.

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
