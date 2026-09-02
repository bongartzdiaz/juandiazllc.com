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
| Founding tier — 1 seat | €99, one-time | ✅ **verified 2026-08-15** — `diaz_editor.checkout_session` holds a session with `amount_eur = 99.00`, written by `captureCheckoutSession` from the Stripe session object |
| Pro tier — 10 devices | €247, one-time | ✅ **verified 2026-08-15** — same table, `amount_eur = 247.00` |
| Educational tier — 25 seats | €500, one-time | ✅ **verified 2026-08-15** — same table, `amount_eur = 500.00` |
| VAT treatment | **All four tiers are VAT-inclusive** — the displayed price is what the customer pays | ⚠️ verified in Stripe **2026-07-27**, not re-measured since: `price_1TxsUS…` €99, `price_1TxXHn…` €197, `price_1TxsVk…` €247, each `tax_behavior: inclusive`. Educational was the one exception until that date — priced VAT-*exclusive*, so a school reading €500 would have paid €605 at the till. Fixed with a new price, because `tax_behavior` is immutable in Stripe. **Recovered 2026-08-19 from the deleted branch `claims/single-tier-197` (`e7f779b`); this fact existed nowhere else in the repo.** |
| Enterprise, agency | On quote, no list price | ✅ confirmed 2026-08-11 by Juan — by design, not omission |
| "Regular price after beta €997" | **Not live anywhere** | ❌ appears on no page, no buy link and in no edge function. See the reversal note. |
| Beta cap / spots taken | cap 100, sold 2 | ⚠️ the row still exists, but the `spots_left <= 0` gate was **removed on 2026-07-26** — the cap no longer stops a sale. `display_spots_left` equals the real 98, so the scarcity display is honest. |
| Subscription | None. One-time purchase. | ✅ verified — Stripe `mode: 'payment'`, not `subscription` |
| Updates | Lifetime | ✅ product promise, no expiry in licence issuance |
| Trial | 14 days, no card | ✅ verified — `diaz-trial-init` |
| Price direction | "Introductory price — rises at v0.5" | ✅ every tier on the homepage carries this line |

> **How the three Payment Link amounts got closed, 2026-08-15.** The note above
> said only the Stripe dashboard could settle them, because Stripe renders the
> amount client-side. That turned out to be one route, not the only one. On
> 2026-08-11 the webhook began writing `diaz_editor.checkout_session` rows, and
> `captureCheckoutSession` copies `amount_eur` straight off the Stripe session
> object. Four sessions from that day carry 99.00, 197.00, 247.00 and 500.00.
> That is the till talking, not the label.
>
> The general form: when a surface refuses to be read, look for the record the
> transaction leaves behind. It is usually closer to the money than the page is.
>
> ⚠️ **One caveat on those same rows.** `checkout_session.tier_requested` has a
> CHECK constraint accepting only `light|pro|agency|enterprise`, and
> `mapTierForCompletedSale` flattens the four real tier names onto it. Licence
> (€197) and Pro (€247) both land on `'pro'`. The amount distinguishes them; the
> tier column does not. Do not use `tier_requested` to count sales per product.

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
| `juandiazllc` | `wbgiouuifqhasedncysw` | this site's own project. Also carried an **abandoned copy** of `diaz_editor` from May: 10 tables, 2 licences, everything else empty, functions hand-deployed and never updated since. **The schema is gone** — dropped 2026-08-12, which took PostgREST down project-wide for hours because it was still listed in `pgrst.db_schemas`. **Ten `diaz-*` edge functions are still deployed here**, ACTIVE and unauthenticated, running May code against the schema that no longer exists. Removal is a dashboard action; see MANUAL_TASKS.md. |

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
      > ⚠️ **"No edge function" was wrong — corrected 2026-08-15.** The row
      > above and the checklist both said €997 appears in no edge function.
      > `diaz-affiliate-activate` in `wbgiouuifqhasedncysw` carries it three
      > times inside a partner welcome email: a heading *"Free Pro license (€997
      > value)"*, a commission line computed as `Math.round(997 *
      > commission_rate)`, and a table row *"Educational · €500"*. The function
      > is `ACTIVE` and unauthenticated. It cannot currently send anything —
      > its queue query hits schema `diaz_editor`, dropped from that project on
      > 2026-08-12, and returns 500 first — so this is a surface that is dead
      > rather than absent. Two different things, and the register said the
      > wrong one. **Whether the live copy in `vbozelswveaxsyccvaac` carries the
      > same text is not yet checked**; if it does, that is a reachable €997
      > going out to partners and a real correction, not a cleanup. Removal of
      > the dead copy is tracked in MANUAL_TASKS.
      >
      > How it was missed: the original sweep searched the repo and the live
      > pages. Deployed edge-function source lives in neither — it is only
      > readable through the platform API, one function at a time. A claim
      > register that only greps the repo cannot see the code that is actually
      > running.
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

## Diaz Editor — seats, traction and affiliate (measured 2026-08-19)

This section was written on a branch (`claims/single-tier-197`, 26–28 July)
that never became a pull request and sat unreviewed for three weeks. Its
pricing table has been dropped: the section above supersedes it, and does so
with better evidence. What follows is the part that never appeared anywhere
else, re-measured against project `vbozelswveaxsyccvaac` before porting.

**Everything below was checked on 2026-08-19 unless the row says otherwise.**

| Claim | Value | Status |
| --- | --- | --- |
| Seats per tier | `basic` 1 · `pro` 3 · `lifetime` 10 · `educational` 25 · `enterprise` 100 · `agency` 999 | ✅ read from `SEATS_BY_TIER` in the deployed `license-issue`. **These are not marketing numbers.** Changing a seat count on a page without changing that constant makes the page lie about what the buyer receives |
| Internal vs customer tier names | **They do not match. Read this before renaming.** | ⚠️ customer-facing "Licentie" (€197) is internal `pro` (3 seats); customer-facing "Pro" (€247) is internal `lifetime` (10). Aligning them touches `license-issue`, `SEATS_BY_TIER`, `mapTierForCompletedSale`, the `checkout_session.tier_requested` CHECK constraint and the licence-key codec — where the tier is a *byte* (`pro=0x02`, `lifetime=0x03`). That is a migration, not a rename |
| Affiliate commission | **20% flat** | ✅ `diaz_editor.affiliate_partners.commission_rate` has default `0.20`. One partner row exists |
| Traction | **Nothing may be claimed** | ❌ `beta_purchases` = **0**, `licenses` = **6**, `activations` = **1**. No external purchase has ever completed. Watch the dry form as well as the rhetorical one: *"2 kopers onboarded"* sat on four live pillars until 2026-07-27 while an audit rule reported zero, because it only searched for phrases like "trusted by" |
| Sales switch | `diaz_editor.sales_state` — manual, currently **open** | ✅ columns `is_open` / `closed_reason`; replaced the 100-cap that would otherwise have shut the shop at sale 100 |

### The repo is not the database — three cases, re-measured

Found in a single afternoon on 2026-07-26. Each is a place where the
repository asserts something production does not do. **Two still hold; the
third has since been fixed, which is exactly why this needed re-measuring
rather than merging.**

| Repo says | Production, 2026-08-19 |
| --- | --- |
| `20260704_founding_cap_enforcement.sql` — a trigger caps paid seats at 100 | **Still absent.** No trigger matching `%founding_cap%` exists |
| `20260512_security_invoker_views.sql` — `security_invoker=on` on `public_beta_status` | **Still not applied, and must stay that way.** The view runs with definer rights. `anon` has no policy on `beta_purchases`/`licenses`, so invoker rights would return 0 rows → `sold=0` → *"100 spots free"*. Applying this audit fix would recreate the dishonest counter that was removed |
| `diaz-founding-spots` publishes `paid: 4` | ✅ **resolved 2026-07-28.** Deployed v10 is a tombstone: it returns HTTP 410 `gone` with no numbers at all. The diagnosis behind the old bug is still worth keeping — 4 of the 6 licences carry no `granted_by` key in `metadata` (verified: 2 with, 4 without), and the old code read "not granted" as "paid" |

That third row is the lesson in miniature. A claim written on 26 July was
already false by 28 July, and merging the branch unread would have published
it as current on 19 August.

### Decided, but not verifiable from here

These are commercial decisions and Stripe-side configuration. The Supabase MCP
cannot see Stripe, so they are recorded as **decisions with an open
verification**, not as measurements. Do not quote them as verified.

| Claim | Recorded | What would settle it |
| --- | --- | --- |
| **14-day money-back guarantee**, all tiers | decided 2026-07-26 | It is a *commercial* guarantee, not the statutory withdrawal right. The art. 16(m) waivers in `diaz-beta-checkout` stay as they are and the 14 days sit on top, voluntarily. Copy must never present the two as a trade. Confirm the site still says this |
| **Zero coupons and zero promotion codes** in the Stripe account | two deleted 2026-07-27 — `1U25nPGG` (€901 off, no expiry, no limit) and `dOsfCD5A` "FOUNDER20" (20% forever) | Stripe dashboard. **A discount that exists in Stripe but not in this file is a liability**: it survives every copy sweep, because a sweep reads text and a coupon is configuration |
| **No badge, credit or roadmap vote may be promised** | three were live on 2026-07-27 — a founder badge, a "Built with" credit, monthly roadmap voting; one value stack priced them at €600/yr and €100/yr | The diaz-editor repo. Status rewards are cheap to write and expensive to build — check the code before publishing one |

Two more from the July sweep, kept because they are rules rather than readings:

1. **Never reinstate a struck-through "was €997".** A prior price that was
   never charged breaches the Omnibus rule that it must be the lowest price of
   the previous 30 days. The same holds for €1,000, which was never a tier.
2. **A sweep that only replaces amounts breaks the relations they sit in.**
   The affiliate table once read "Solo €197 → €100 commission" and
   "Enterprise €5,000 → €197": prices updated, commissions not. A price is
   rarely a loose number — it hangs off a commission, a percentage or a saving.
   Fix the generator before the output; `_inject-value-stack.py` and two
   siblings wrote an invented "+€600" back over hand-corrected pages.

## Diaz Atlas — de trechter, de installer en de betaalketen (gemeten 2026-09-02)

Aanleiding was een externe analyse die drie plekken aanwees waar vertrouwen
weglekt — de onondertekende installer, de Delaware-entiteit, de merkvermenging
— en één aanbeveling droeg: koop een EV-certificaat. Alle drie de premissen
zijn nagemeten. Twee houden geen stand zoals ze geformuleerd waren, en de
zwaarste rij op deze lijst stond in die analyse niet.

**Wat hier niet gemeten kon worden.** Het Supabase-datavlak van beide
projecten antwoordt met 402 `exceed_storage_size_quota` — opnieuw bevestigd
2026-09-02 — en er is van hieruit geen Stripe-toegang. Elke rij over
licenties, betalingen en downloads draagt daarom **de datum van zijn eigen
oorspronkelijke meting**, niet die van vandaag. Lees ze als de laatst bekende
stand.

| Claim | Waarde | Status |
| --- | --- | --- |
| De Windows-installer is ondertekend | **nee** | ✅ gemeten 2026-09-02 — geen van `CSC_LINK`, `CSC_KEY_PASSWORD`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` staat in de repo-secrets van `bongartzdiaz/diaz-editor`. `electron-builder.yml` draagt `verifyUpdateCodeSignature: false`, met de reden erbij: een onondertekende bundle heeft `SignerCertificate: null` en de updater weigerde daarop zijn eigen update |
| Ondertekening moet nog gebouwd worden | **het staat al** | ✅ `build-and-release.yml` heeft een detectiestap met drie paden — Azure Trusted Signing, dan PFX, dan onondertekend mét een waarschuwing in het log — en `cert-expiry-watch.yml` opent dagelijks een issue op 30/14/7/1 dagen voor het verlopen. `signtoolOptions.publisherName` is ingevuld. Wat ontbreekt is **één secret**, geen pijplijn |
| EV is de aan te schaffen soort | **de repo zegt zelf van niet** | ⚠️ `electron-builder.yml` noteert, met bronvermelding Microsoft Learn: sinds 2024 geeft EV geen SmartScreen-voordeel meer; kies een goedkoop OV-certificaat of Azure Trusted Signing (~$10/mnd). **Dit is een becommentarieerde bewering en geen meting.** Hij noemt zijn bron en is in minuten na te trekken; dat is niet gedaan |
| SmartScreen verklaart de nul verkopen | **nee — de trechtervolgorde sluit dat uit** | ✅ `landing/index.html` verkoopt in vier talen trial-first ("Eerst 14 dagen gratis proberen" / "Try free for 14 days first"). SmartScreen staat dus vóór de proefperiode, niet vóór de kassa. Wie een checkout bereikte was er al langs |
| Checkout-sessies | **25, nul betaald ooit** | ⚠️ gemeten 2026-08-25 op `vbozelswveaxsyccvaac`: 19 verlopen, 6 open, alle 25 `unpaid`. Vandaag niet hermeetbaar |
| De keten `checkout.session.completed` → licentie → mail | **heeft in productie nooit gedraaid** | ❌ gemeten 2026-08-01. Dit is de zwaarste rij hier en hij ontbrak in de analyse. Alle zes de licenties zijn met de hand uitgegeven — zie de tractierij hierboven |
| Downloads | **~84** — 44 `Diaz-Editor-Setup.exe`, 40 AppImage | ⚠️ gemeten 2026-07-28. Bijna de helft is Linux, en die helft ziet SmartScreen nooit |
| Wie downloadde is te achterhalen | **nee** | ❌ alle 135 rijen in `update_events` dragen `device_fp='unknown'`, `cad_events` is leeg, en de in-app telemetrie is op 2026-07-28 verwijderd — `diaz-cad-telemetry` is sindsdien een 410-grafsteen |
| Een campagne is per tier te meten | **nee** | ❌ de CHECK-constraint op `checkout_session.tier_requested` accepteert alleen `light`, `pro`, `agency` en `enterprise`. Licentie (€197) en Pro (€247) landen daardoor allebei op `'pro'`: de database kan niet zeggen welk product iemand wilde. **Niet gerepareerd** |
| Delaware staat in de kopij | **op twee plekken** | ✅ in de JSON-LD (`addressCountry: "US"`, `addressRegion: "Delaware"`) en in de EULA, waar het forum de rechtbank van Delaware is. Dat tweede is een contractclausule en is te wijzigen zonder de entiteit aan te raken |
| De merken zijn gescheiden | **ja, al volledig** | ✅ `lib/ventures.ts` op juandiazllc.com noemt vier ventures en Diaz Atlas is er geen van. De enige vermelding van diazatlas.com op de holdingsite staat in de cookie- en privacykopij, over de gedeelde GA-tag |

### Twee dingen die als opgelost golden en dat niet zijn

*"De achterkant staat als een huis."* Dat geldt voor de entiteit en voor
Stripe als configuratie. Het geldt niet voor de keten die ná een betaling moet
lopen, want die is nooit gelopen — er is geen enkele aankoop geweest waarvan
een sleutel in een inbox is beland.

*"Er rest nog één technische drempel."* De installer is inderdaad
onondertekend, maar wat ontbreekt is een secret in een pijplijn die al staat.
En omdat de proefperiode vóór de kassa zit, kan die drempel de nul betalingen
niet verklaren: iedereen die een checkout bereikte, was SmartScreen al gepasseerd.

De uitvoerbare volgorde staat in `docs/diaz-atlas-volgorde.md`. Die is niet op
impact gesorteerd maar op afhankelijkheid.

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
| Four operator outcomes (`ResultsStrip`) | ✅ confirmed real by Juan, 2026-08-19 — see the table below |
| Revenue figures, testimonials, named customers, customer counts | ❌ none exist; do not imply any |

### The four operator outcomes

Published on the homepage between `Stats` and `Signals`, in all four locales.
Anonymized in the copy by design — sector and window, no names.

| Metric | Context as published | Sector | Window |
| --- | --- | --- | --- |
| `+38%` | lead-to-call conversion after replacing a 4-tool stack with one CRM + WhatsApp flow | Dutch solar installer | 90 days |
| `3.2x` | pipeline velocity once field team and office shared deal state in real time | NL/BE energy broker | 6 months |
| `−61%` | time-to-quote after automating intake → survey → proposal | Residential battery installer | Q1 rollout |
| `€0` | additional SaaS spend; retired tools funded the rebuild | Multi-location operator | Year one |

**Status: confirmed by Juan on 2026-08-19.** What is not yet recorded here is
the per-engagement detail — which client, which period, and where each number
was measured. Anonymized in the copy is fine and intended; unrecorded in this
file is what rule 1 exists to prevent. If one of these is ever challenged, that
detail is what answers it, so it belongs here even though it never reaches a
page. **Open item, low effort, no deadline.**

#### How they went four months undocumented

The row above used to read "Client results, revenue figures, testimonials —
none exist; do not imply any", while the homepage published these four in four
languages. Two documents in one repo, one of them wrong — and this file was the
one that was wrong.

The section's own subheading promised the reader that *every metric comes from
a live engagement and anything we cannot attribute does not go here*
(`results.sub`). It turns out to have been true. But nobody could tell from
outside the claim, which is the same position as a claim that is false. The
component file carried the same rule in its header from the commit that
introduced it (`26b352b`, 2026-04-18: "Never invent a number… delete the card
rather than fudge it") — and that commit recorded no source either.

Two written rules, four months, nobody caught it. A rule that lives only in a
comment is not a rule. So the check moved into the suite:
`components/sections/ResultsStrip.test.ts` fails if the section is mounted
while any published metric is missing from this section of this file, and fails
separately if this file still denies that client results exist. Both locks were
verified by breaking them.

**Consequence for future edits.** Adding a card, or changing a number, means
adding the row here first. That is the whole point.

### Wat de diagnosesprint oplevert — beslist 2026-08-22

Tot deze datum beschreef de site de sprint van dertig dagen alleen als een
*toestand*: "beide kanten beperken het risico voordat er gebouwd wordt". Dat
staat in vier talen op `/services` en in twaalf FAQ-antwoorden. Het is waar,
maar niemand kan het vasthouden. Stap 1 van de ladder noemde wél een tastbaar
ding (een diagnose van één pagina) en stap 3 ook (een offerte, daarna een
retainer). Stap 2 was het gat.

**Beslist door Juan op 2026-08-22**, op drie punten:

| | beslissing |
| --- | --- |
| deliverable | het bouwplan **plus het eerste onderdeel dat al draait** |
| eigendom | volledig van de klant, ook als een ander het uitvoert |
| verrekening | de sprintprijs gaat er **volledig** vanaf als de bouw volgt |

Het bouwplan is geen nieuwe belofte. `process.2.body` beschrijft fase 2 van de
methode al in vier talen als *"een bouwplan dat een aannemer kan lezen"* waarin
*"elke fase een getal heeft"*, en `services.how.s1.note` zegt al dat het gratis
gesprek diezelfde fase in het klein is. De sprint is die fase op ware grootte.
Wat ontbrak was de verbinding, niet de inhoud.

**Wat hier bewust niet staat: een bedrag.** De vaste prijs van de sprint is nog
onbeslist — zie `docs/aanbod.md` §5.1. "Vaste prijs" mag in kopij omdat het een
vorm beschrijft en geen getal; een bedrag mag pas nadat het hier staat.

**De vaste prijs is beslist op 2026-08-22.**

| | waarde | status |
| --- | --- | --- |
| vaste prijs sprint | **€2.500** | ✅ beslist 2026-08-22 door Juan |
| btw-behandeling | **exclusief btw** | ✅ beslist 2026-08-22 door Juan |

Dat bedrag is de enige bron. `lib/seo/faqs.belofte.test.ts` leest het hier uit
en eist dat elke plek in kopij die een bedrag bij de sprint noemt, precies dit
bedrag noemt — in de opmaak van zijn eigen taal. Wijzig je de prijs, wijzig hem
dan híer; de poort maakt het verschil hoorbaar in plaats van stil.

**Opmaak per taal**, gelijk aan wat `pricing.migration.title` al deed:
`€2,500` (en) · `€2.500` (nl) · `2.500 €` (de) · `2.500 €` (es). Het Duitse en
Spaanse teken staat achter het getal, want dat is daar de conventie.

**De btw-behandeling is exclusief, en staat overal waar het bedrag staat.**
Beslist op 2026-08-22. Elke plek die €2.500 noemt draagt de grondslag ernaast,
in de vorm die in die taal gangbaar is: `excl. VAT` (en) · `excl. btw` (nl) ·
`zzgl. MwSt.` (de) · `más IVA` (es). Het Duits gebruikt bewust niet "excl.",
want dat is geen Duits; `zzgl.` is de zakelijke standaardafkorting.

**Dit is de eerste prijs op deze site met een grondslag ernaast.** Gemeten
2026-08-22 over `pricing.*` in vier talen droeg geen enkele andere prijs zo'n
vermelding. Dat is een open punt voor de DEUS-prijspagina, geen reden om het
hier ook weg te laten — het verschil is 21%: €2.500 tegen €3.025.

Dit is niet theoretisch. De Educational-tier van Diaz Editor stond als €500 op
de pagina terwijl Stripe hem exclusief afrekende, dus een school betaalde €605
aan de kassa (zie "Diaz Editor — pricing" hierboven). Dat is met een nieuwe
prijs hersteld, omdat `tax_behavior` bij Stripe onveranderlijk is.


**Wat het werkende onderdeel is, wisselt per traject**, en mag daarom nergens
in kopij benoemd worden. De belofte is dat er na dertig dagen iets draait, niet
wat er draait. Een pagina die het invult, belooft een scope die niet is
afgesproken.

### Garantie en capaciteit — beslist 2026-08-22

De laatste twee open punten uit `docs/aanbod.md` §5.

| | beslissing | status |
| --- | --- | --- |
| garantie op de **uitkomst** | **geen** | ✅ beslist 2026-08-22 door Juan |
| trajecten tegelijk | **drie** | ✅ beslist 2026-08-22 door Juan |

**Geen uitkomstgarantie is hier een registratie, geen reparatie.** Gemeten op
2026-08-22 over `lib/i18n/dict.ts` en `lib/seo/faqs.ts` in vier talen: nul
treffers op garantie-, terugbetaal- of resultaattaal in de sprintkopij. Er stond
dus niets dat teruggedraaid moest worden. Wat het wél doet is de regel
vastleggen: **geen enkele plek in kopij mag een resultaat beloven** — geen
percentage, geen bedrag dat de klant zou besparen, geen "anders geld terug".

De risico-omkering die er wél staat blijft, en raakt de **levering** in plaats
van de uitkomst: het bouwplan blijft van de klant ook als een ander het
uitvoert, en de sprintprijs gaat volledig van de bouw af. Zie "Wat de
diagnosesprint oplevert" hierboven. Dat is een andere belofte dan een
resultaat, en dat onderscheid is de hele reden dat dit apart is beslist.

**De enige terugbetaal-belofte op deze site gaat niet over de sprint.**
`pricing.faq.a3` noemt in vier talen een venster van 30 dagen op een
DEUS-jaarcontract. Dat is een ander product, een andere toezegging, en hij staat
hier alleen zodat een volgende sessie hem niet als tegenstrijdigheid leest.

**Drie trajecten tegelijk maakt een schaarste-zin toelaatbaar, niet verplicht.**
Het getal is een echte capaciteitsgrens en dus controleerbaar. Twee grenzen
horen erbij:

1. **Een aftellend getal mag alleen met een onderhouden bron.** Dat is geen
   verbod maar een voorwaarde, en er is al een voorbeeld dat eraan voldoet —
   zie de correctie hieronder. Een getal zonder onderhouden bron is verzonnen,
   ook als het toevallig klopt.
2. **De grens knelt vandaag niet.** Gemeten 2026-08-22 op Supabase-project
   `wbgiouuifqhasedncysw`: `marketing.leads` nul rijen, `marketing.subscribers`
   nul rijen — beide ooit. Een capaciteitszin is dan positionering: hij zegt
   wat voor soort traject dit is, niet dat je moet opschieten. Als urgentie
   geframed zou hij druk suggereren die er niet is, en dat is precies de vorm
   die vertrouwen kost.

#### Correctie 2026-08-22 — er stond al een capaciteitssignaal, en het is goed gebouwd

Toen dit blok werd geschreven stond er dat een levende telling "nergens in deze
repo bestaat". **Dat was onwaar.** `components/Capacity.tsx` staat sinds april
2026 op `/contact` en toont vier blueprint-plekken per kwartaal met het aantal
dat nog vrij is. Het draagt precies wat zo'n getal nodig heeft:

| | |
| --- | --- |
| bron | `SLOTS_REMAINING` / `TOTAL_SLOTS`, met de hand tegen de agenda gehouden |
| houdbaarheid | `LAST_VERIFIED` + `MAX_AGE_DAYS = 30` |
| poort | `components/capacity.test.ts` wordt rood zodra de datum veroudert |
| stand 2026-08-22 | 3 dagen oud, ruim binnen de termijn |

De regel is daarmee niet "geen aftellend getal" maar **"geen aftellend getal
zonder onderhouden bron"**. Dat is strenger waar het moet en toelaatbaar waar
het kan.

#### Gelijkgetrokken 2026-08-23 — één getal, één eenheid, één bron

De twee getallen stonden in verschillende eenheden: `/contact` telde vier gratis
blueprint-gesprekken per kwartaal, `/services` drie lopende betaalde trajecten.
Ze spraken elkaar niet tegen, maar het waren twee getallen over hetzelfde
onderwerp op naburige pagina's. Juan heeft ze op 2026-08-23 gelijkgetrokken.

Het totaal staat al in de beslissingstabel bovenaan deze sectie en wordt hier
bewust **niet** herhaald: twee rijen die hetzelfde getal dragen zijn precies
de bugklasse die deze gelijktrekking wegneemt, en de parser in
`lib/capaciteit.test.ts` leest met `.match()` de eerste treffer — een tweede
rij met een ander getal zou stil worden overgeslagen. Er is één nieuw getal:

| | waarde | bron |
| --- | --- | --- |
| van die trajecten nu vrij | **drie** | Juan, tegen de agenda gehouden 2026-08-23 |

`/contact` en `/services` lezen sindsdien hetzelfde feit. De keten loopt van
`docs/claims.md` naar `TOTAL_SLOTS` naar `fomo.capacity.note`, en van
`docs/claims.md` naar `services.how.capaciteit`. `lib/capaciteit.test.ts` en
`components/capacity.test.ts` sluiten hem aan beide kanten: verzet je het getal
op één plek, dan valt er een poort om.

**De oude verificatie is mét de eenheid vervallen.** `SLOTS_REMAINING` stond op
2 van 4 en was op 2026-08-19 tegen de agenda gehouden — maar die 2 telde
geboekte blueprint-gesprekken, niet lopende trajecten. Een verificatie geldt
voor de grootheid die je gemeten hebt, niet voor het vakje waar het getal
toevallig in staat. Vandaar een nieuw getal én een nieuwe datum, allebei van
Juan.

Wat mag: een statische zin die de werkwijze beschrijft, en een teller met een
onderhouden bron plus een houdbaarheidsdatum. Wat niet mag: een aftelklok, of
een zin die suggereert dat er nú bijna geen plek is.

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

### Measured against DEUS-SHARED — 2026-08-15

Method: `git grep` against the fetched `origin/main` of `bongartzdiaz/DEUS-SHARED`
(`59e4c71`, pushed 2026-08-13). The local clone at `C:/business/DEUS-SHARED` was
**331 commits behind**; measuring against a checkout that stale would have
measured code nobody runs. Nothing in that working tree was touched — `git grep
<tree>` reads the commit directly.

**The page and the code publish two different price lists.**

| | `/pricing` (marketing) | `lib/philly/billing/plans.ts` (checkout path) |
| --- | --- | --- |
| Tiers | Starter, Professional, Business, Enterprise (4) | operator, team, business (3) |
| Model | per seat, per month | flat per month, per org |
| Prices | €40 / €69 / €99 / on quote | €49 / €199 / €599 |
| Seats | **minimum** 3 / 5 / 10 / 15 | **maximum** 3 / 10 / unlimited |
| Contacts | 5 000 / 50 000 / unlimited / unlimited | 2 000 / 25 000 / unlimited |

`plans.ts` is not a draft: `app/api/billing/checkout/route.ts` reads it through
`stripePriceIdForPlan()` to build the Stripe Checkout session. By this file's own
standard it sits closer to the till than the marketing page does. Neither list is
*verified* — no payment has ever been taken for DEUS — but they cannot both be
quoted, and today the page quotes the one further from the money.

**The seat number means the opposite thing on each side.** Marketing sells a
floor: Starter bills at least three seats. The code enforces a ceiling:
`app/api/users/route.ts` returns 403 `Seat limit reached` on the 4th user of an
`operator` plan. A Starter customer with four colleagues reads "minimum 3" as an
invitation to add the fourth and gets refused by the product.

**Enterprise has no counterpart in code.** `PlanSlug` is
`'operator' | 'team' | 'business'`. Every row sold only under Enterprise —
white-label, custom domain, dedicated server, country-of-choice residency, custom
DPA, custom integrations, phone support, 99.95% SLA — maps to nothing.

**Seven of the fourteen `PlanFeature` values are declared and never read.**
`ip_allowlist`, `scim_groups`, `api_access`, `advanced_filter`,
`session_idle_timeout`, `signed_dpa`, `dedicated_cs` appear in `PLANS` and in no
other non-test file. `PLAN_FEATURE_MAP` only wires seven `FEATURES` keys, and
`hasPlanFeature()` is called from exactly one route. The plan-map's own comment
says "the SCIM group endpoints have their own `hasPlanFeature` gate" — those
endpoints exist and gate on `scimGate` (token auth) plus a rate limit, not on
plan tier.

**Row-by-row, for the promises flagged when this section was opened:**

| Promise on `/pricing` | In DEUS-SHARED `origin/main` |
| --- | --- |
| SSO (SAML 2.0) | **No implementation.** No SAML/OIDC package in `package.json` — auth deps are `bcryptjs` alone. What exists is SCIM 2.0 user provisioning, which is not sign-in. One comment in the SCIM users route says "SAML/OIDC is the auth path", describing a path that is not in this repo. |
| IP allowlist | Declared as a `PlanFeature` on `business`, consulted nowhere. |
| Uptime SLA 99.5% / 99.95% | Not a code claim; no monitoring or credit mechanism found. Unbacked commitment. |
| Dedicated server | Nothing in `deploy/` or `docker/` distinguishes a per-org deployment. |
| White-label (no DEUS branding) | Only match for "white label" is a CSS comment in `Button.tsx` about ink on an accent fill. Unrelated. |
| Custom domain | Zero matches for `customDomain` / `custom_domain`. |
| AI deal summaries, AI task suggestions | Zero matches. `FEATURES` has enrichment, web enrichment, lead discovery, deal scoring — not these two. |
| Audit-log retention 30 days / 1 year / unlimited | One global window: `AUDIT_RETENTION_DAYS`, default 365. Not per tier. |
| Storage 5 / 50 / 500 GB · API requests 10k / 100k per month | No quota code of any kind. `PlanLimits` carries two numbers only: `maxUsers`, `maxContacts` — and `maxContacts` is never checked either. |
| Custom SMTP (send via your domain) | **Backed.** `app/api/email/accounts/route.ts` stores per-org host/port with the password encrypted at rest. |
| Outbound webhooks · REST API access | **Backed and gated.** `WEBHOOKS` resolves through the plan map to the `webhooks` PlanFeature on team and above. |

**One stale pointer, worth fixing wherever it is decided.** The `plans.ts` header
calls itself the single source of truth "matching `pricing.tier.<slug>.*` in
`/lib/i18n/dict.ts` on the marketing side". That namespace does not exist: the
marketing keys are `pricing.cta.{starter,pro,business,enterprise}` and
`pricing.feat.*`. The file that claims to be canonical points at a naming scheme
the other side never used.

**Not concluded above.** The measurement does not say the page is wrong and the
code right. It says the two disagree on tier count, price model, price, seat
direction and contact caps, and that most of the differentiating rows are
enforced by nothing.

### Decided 2026-08-15 — per seat, and the page only claims what exists

Juan's call, on the measurement above:

1. **Per seat wins.** €40 / €69 / €99 per seat per month stands. DEUS-SHARED
   follows: rename the slugs, tie Stripe `quantity` to the seat count, turn
   `maxUsers` from a ceiling into a floor. Reason: the whole comparative
   argument on the page is per seat — including the corrected HubSpot figure —
   and flat billing would make that argument incoherent.
2. **Enterprise stays, minus what does not exist.** It never reaches checkout
   (`monthlyPrice: null`, `mailto:`), so it needs no `PlanSlug`.
3. **Unenforced rows come off the page until they are built.**

> ⚠️ **Four of the calls below were wrong and were corrected the same day —
> see "The sweep measured names, not capabilities" further down.** Email
> templates and the IP allowlist exist and came back; the two calendar-sync rows
> do not exist and came off.

**Removed from `_drafts/pricing/pricing-tiers.csv` — 18 of 51 rows**, each one
measured absent in `origin/main`: custom fields · real-time push sync · meeting
links · email templates · AI deal summaries · AI task suggestions · IP allowlist
· SSO (SAML 2.0) · country-of-choice residency · custom colours and theme ·
white-label · custom domain · uptime SLA · contacts cap · deals cap · storage ·
API requests per month · dedicated server. Two rows corrected rather than
dropped: audit-log retention is one global window (`AUDIT_RETENTION_DAYS`,
default 365), so it reads `1 year` on every tier; saved views exist without a
per-tier cap, so it reads ✓ on every tier. 76 orphaned `pricing.feat.*` /
`pricing.sec.*` keys removed across four locales. Three of four tier taglines
advertised removed features and were rewritten. FAQ 5 promised "a notification
at 80% of any limit" — no such notification and no such limits; rewritten to
say the bill follows the seat count and nothing else.

**The consequence, stated plainly.** With the unbuilt rows gone, **Business
differs from Professional by one thing: a private Slack channel** — €99 against
€69 per seat. The ladder was carried by features that do not exist. Closing that
gap means building them (SSO and IP allowlist are the obvious two) or repricing.
Not decided here.

### A third price list, found while measuring

`docs/pricing/pricing-tiers-en.csv` in DEUS-SHARED is a fourth artifact nobody
named. It is **per seat** — which independently supports the decision above —
but with its own numbers: Operator €40 (min 1) · Team €70 (min 3) · Business
€110 (min 10) · Enterprise (min 25), across four commitment terms (monthly,
quarterly −10%, semi-annual −18%, annual −30%) with Stripe price IDs already
named (`price_team_annual` and so on). A companion `seat-calculator-en.csv`
works the scenarios. Its ICP is explicitly real estate — "solo agent",
"brokerage", "MLS subscription" — where the marketing page is generic. All four
DEUS pricing artifacts carry one commit date (2026-06-05, `d597816`, a bulk
sync), so that date records when they were copied in, not when each was written.
**Not reconciled.** The page's numbers stand by the decision above; whether the
commitment ladder and the min-1 solo tier should come across is open.

### The sweep measured names, not capabilities — corrected 2026-08-15

The sweep above searched for the identifier each feature *ought* to be called.
Four of those guesses were wrong, three of them shipped, and they were corrected
the same afternoon. Recorded because the failure mode is reusable, not because
the rows matter much on their own.

| Row | First call | Actual | Why the first pass missed it |
| --- | --- | --- | --- |
| IP allowlist | removed | **exists and is enforced** — `Organization.ipAllowlist` (CIDR list), checked inside `requireScope` at `lib/philly/auth-helpers.ts:286` via `lib/philly/ip-allowlist.ts`, with an admin API and a settings page | The grep was for the `PlanFeature` string `'ip_allowlist'`. That string really is read nowhere — but that means the *plan gate* is missing, not the feature. Absence of a gate was mistaken for absence of a capability. |
| Email templates | removed | **exists** — `model Template` plus `/api/templates`, `/api/templates/[id]`, `/api/templates/preview` | Searched for `EmailTemplate`. The model is called `Template`. |
| Google Calendar sync | kept | **does not exist** — no call to any provider calendar API anywhere in the repo; `CalendarEvent` has no external-id or provider field; there is an `email-sync` cron and no calendar equivalent | The Google connector requests `auth/calendar` scope, and the scope was read as the feature. A requested permission is not an implementation. |
| Microsoft 365 Calendar sync | kept | **does not exist** — same; `Calendars.ReadWrite` is requested and never used | Same. |

Also reworded: "Tasks and reminders" → **Kanban boards with due dates**. There is
no `Task` model and no tasks endpoint; what exists is `KanbanCard` with `title`,
`dueDate` and `assigneeId`, plus `/api/kanban` and a user-doc page. The two
calendar rows were replaced by one honest row, **Calendar and events**, for the
in-app calendar that does exist (`model CalendarEvent`, `/api/calendar`).

**The method that would have caught all four:** start from the artifacts the
product maintains about itself — the Prisma models, the route tree under
`app/api/**/route.ts`, and `docs/user/en/features/*.md` — and ask which pricing
row each one supports. Searching outward from a guessed identifier tests your
vocabulary; searching outward from the schema tests the product.

### What the page still does not mention

Counted while correcting the above: **201 API routes** in `origin/main` and
**34 user-doc pages**, against 34 rows on the pricing page — and the overlap is
thin. Absent from the page entirely: SCIM 2.0 provisioning (Users, Groups,
ServiceProviderConfig, ResourceTypes), a **tamper-evident audit log** with a
hash chain and a verification endpoint that returns 409 when the chain breaks
(`/api/admin/audit/verify`, `lib/philly/audit-verify.ts`), **ROPA export** for a
regulator (`/api/admin/gdpr/ropa`, GDPR Art. 30), admin-initiated erasure and
data-subject export, per-org **session idle timeout** and forced logout
(`tokensInvalidAfter`), API keys with rotation, webhook delivery retry,
automations, drip campaigns, lead routing and scoring, an AI command bar and
assistant, e-signatures, SMS, dialer, kanban, pipelines, reports, a client
portal — and three vertical modules the page never hints at: **real estate**
(properties, valuations, MLS feeds, showings, open houses, offers, transactions,
commissions, CMA), **hospitality** (reservations, rooms, housekeeping) and
**philanthropy** (grants, volunteers, donor scores, impact).

This is the answer to "Business does not earn its price step". It does not need
features built or a price cut first — the page describes a fraction of the
product. Which of these become pricing rows, and at which tier, is not decided.

- Still open: the migration offer promises **five business days, two training
  sessions, 30 days priority support**. No migration has ever been delivered.
  That is an offer rather than a track record, but it is still a commitment.
- Still open: FAQ 6 says data sits with "Supabase (database and authentication),
  Vercel (application hosting)". DEUS-SHARED carries both a self-hosted
  `deploy/Caddyfile` and a `vercel.json`, and still imports Supabase in
  `lib/onboarding/create-org.ts`. Where DEUS actually runs cannot be settled
  from the repo, and this is a compliance claim, so it was left untouched rather
  than guessed at. Same for "EU-only data residency".

### De beslissing van 15 augustus is niet geland — gemeten 2026-08-20

De beslissing hierboven zegt: per zitplaats wint, en **DEUS-SHARED volgt** —
slugs hernoemen, Stripe-`quantity` aan het aantal zitplaatsen koppelen,
`maxUsers` van plafond naar ondergrens. Vijf dagen later is daar niets van
gebeurd.

Gemeten tegen `origin/main` van DEUS-SHARED (`5f95d90`, 2026-08-19). **Meet niet
tegen de lokale werkkopie**: die stond op `efdf7da` van 18 mei, 333 commits
achter, en gaf 165 routes waar `origin/main` er 201 heeft.

| | `/pricing` op deze site | `lib/philly/billing/plans.ts` in DEUS-SHARED |
|---|---|---|
| niveaus | starter · pro · business · enterprise (4) | operator · team · business (3) |
| model | per zitplaats per maand | vast bedrag per maand |
| bedrag | €40 / €69 / €99 | €49 / €199 / €599 |
| gebruikers | **minimum** 3 / 5 / 10 / 15 | **maximum** 3 / 10 / onbeperkt |
| contacten | geen limiet genoemd | 2.000 / 25.000 / onbeperkt |
| Stripe | geen koopweg in deze repo | `quantity: 1` — `app/api/billing/checkout/route.ts:116` |

Minimum en maximum zijn elkaars tegendeel, en dat is niet cosmetisch. Op de
pagina kost Starter €40 × 3 = **€120 per maand** als vloer; in de code kost
`operator` **€49** met een plafond van drie gebruikers. Business op de pagina:
€99 × 10 = **€990** als vloer; in de code €599 vast, onbeperkt. Beide kunnen
niet waar zijn.

**De code denkt van wel.** De kop van `plans.ts` zegt: "matching
`pricing.tier.<slug>.*` in `/lib/i18n/dict.ts` on the marketing side". Die
sleutelruimte bestaat hier niet — het is `pricing.t.{starter,pro,business,
enterprise}.*`. Niet de naamruimte klopt en niet de slugs. Dat commentaar legt
een voornemen vast, geen toestand, en leest als het tegendeel.

Zolang er aan geen van beide kanten geld binnenkomt is dit latent. Het is
dezelfde waarneming als punt 2 hierboven, van de andere kant bekeken: een prijs
is pas geverifieerd als je hem afleest van het ding dat het geld aanneemt, en
hier staan twee dingen klaar om verschillende bedragen aan te nemen.

### Welke mogelijkheden prijsrijen worden — voorstel, gemeten 2026-08-20

`origin/main`, geteld als bestanden `app/api/**/route.ts` per map. "Poort" is de
`PlanFeature` uit `PLANS` in `plans.ts` die de mogelijkheid afschermt; leeg
betekent dat er geen niveau-poort omheen zit.

| mogelijkheid | bewijs in `origin/main` | poort | DEUS-niveau |
|---|---|---|---|
| SCIM 2.0 gebruikers | `app/api/scim/v2/**`, 6 routes | `scim_users` | team |
| SCIM 2.0 groepen | eigen `hasPlanFeature`-poort op de groep-endpoints | `scim_groups` | business |
| Sessie-timeout per organisatie | `sessionIdleTimeoutMinutes`, gelezen in `lib/philly/auth-helpers.ts:283` | `session_idle_timeout` | business |
| Manipulatiebestendig auditlog | `/api/admin/audit/verify` + `lib/philly/audit-verify.ts` | — | — |
| ROPA-export (AVG art. 30) | `/api/admin/gdpr/ropa` | — | — |
| API-sleutels met rotatie | `app/api/api-keys`, 3 routes | `api_access` | team |
| Webhooks met herlevering | `app/api/webhooks`, 5 routes | `webhooks` | team |
| Drip-campagnes | `app/api/drip-campaigns`, 3 routes | `drip` | team |
| AI-opdrachtbalk en assistent | `app/api/assistant`, 4 routes | `ai_command_bar` | team |
| Automatiseringen | `app/api/automations`, 3 routes | — | — |
| Leadroutering | `app/api/lead-routing`, 1 route | — | — |
| E-handtekeningen | `app/api/e-signatures`, 2 routes | — | — |
| Sms | `app/api/sms`, 2 routes | — | — |
| Rapportages | `app/api/reports`, 1 route | — | — |
| Klantportaal | `app/api/client-portal`, 2 routes | — | — |
| Bellijsten met uitkomstregistratie | `app/api/dialer-lists` + `app/api/calls` | — | — |

**Eén rij is met opzet anders geformuleerd dan hij in de vorige telling stond.**
Daar heette hij *dialer*, en dat woord belooft een systeem dat nummers draait.
Er is geen telefonieprovider in de repo — geen Twilio, geen enkele
`app/api/{voice,twilio,telephony}`. Wat er staat is een bellijst met
klik-om-te-bellen en registratie van uitkomst en notitie; de eigen
gebruikersdocumentatie zegt het zelf woordelijk — `docs/user/en/features/dialer.md`
opent met "Call list management". Een rij "Dialer" op een prijspagina zou
dezelfde fout zijn als de twee agenda-synchronisatierijen die er in augustus
afgingen: een naam aanzien voor een mogelijkheid.

**Wat hieruit volgt voor het prijsniveau.** Voor acht van de zestien staat het
niveau in DEUS' eigen code. Die acht vallen in twee groepen, en die groepen zijn
precies de twee open vragen van de pagina:

- **Team-poort** (SCIM-gebruikers, API-sleutels, webhooks, drip, AI-opdrachtbalk,
  leadscoring, geavanceerd filteren) — het middenniveau.
- **Business-poort** (SCIM-groepen, sessie-timeout, ondertekende
  verwerkersovereenkomst, toegewezen contactpersoon, IP-allowlist) — het
  bovenste niveau.

Die tweede groep is het antwoord op "Business verdient zijn prijsstap niet".
Niet bouwen, niet verlagen: opschrijven wat er al is.

**Eén ding spreekt elkaar nu al tegen.** De IP-allowlist staat op de pagina met
een vinkje op **alle vier** de niveaus, terwijl DEUS hem in `PLANS` uitsluitend
aan `business` geeft. Wie op Starter tekent koopt volgens de pagina iets dat het
product aan Starter niet geeft. Dat is geen rij die erbij moet — dat is een rij
die nu fout staat, en het is niet aan mij welke kant meegeeft.

**Wat ik níet voorstel: de drie verticale modules.** Vastgoed (20 routes:
`properties` 7, `showings` 3, `transactions` 3, `offers` 2, `commissions` 2,
`open-houses` 2, `cma` 1), hospitality (8: `reservations` 3, `rooms` 3,
`housekeeping` 2) en filantropie (7: `grants` 3, `volunteers` 3, `impact` 1).
Ze bestaan en ze zijn substantieel. Maar de pagina is generiek geschreven en het
vierde prijslijstje in DEUS-SHARED is expliciet vastgoed-ICP — dat is een
positioneringsvraag die hierboven al open staat, en een module op een prijslijst
zetten beantwoordt hem stilzwijgend.

**Blijft aan Juan.** Welke van de zestien rijen worden, op welk niveau, en of de
IP-allowlist naar Business gaat of in `PLANS` naar alle niveaus. De poort in de
code geeft een volgorde, geen besluit: DEUS heeft drie niveaus en de pagina vier,
en welke van de vier het bovenste DEUS-niveau draagt bepaalt wat er bij €69 en
wat er bij €99 hoort.

### De knop beloofde een stap die er niet is — gerepareerd 2026-08-20

Drie knoppen op `/pricing` zeiden in vier talen dat ze een proefperiode starten:
`pricing.cta.starter`, `pricing.cta.pro` en `pricing.outro.cta` — "Start free
trial", "Start gratis proefperiode", "Kostenlos testen", "Empieza tu prueba
gratis". Alle drie gaan naar `/contact`. Er valt niets te starten; er staat een
formulier. De pagina schrijft dat zelf op, in een commentaar boven `TIERS`:
CTA's landen in de betafase op `/contact` omdat Juan klant 1 tot 5 met de hand
aanneemt.

Het aanbod was niet het probleem. De veertien dagen staan in
`_drafts/pricing/pricing-tiers.csv` en blijven staan. Het werkwoord was het
probleem. De drie knoppen vragen nu om de proefperiode in plaats van hem te
starten, en `pricing.outro.body` zegt er in vier talen bij dat het opzetten met
de hand gaat.

`lib/prijsknoppen.test.ts` bewaakt het, en **schakelt zichzelf uit zodra de
belofte waar wordt**: de regel geldt alleen voor een knop waarvan de `ctaHref`
naar `/contact` wijst. Wijst hij naar `/signup`, dan mag het label weer zeggen
dat het iets start. In drie richtingen gebroken: belofte terug bij een
formulierknop (rood), belofte terug bij een `/signup`-knop (groen — de regel
vervalt), en het veld `ctaHref` hernoemd (rood op de lege lijst, niet stil
groen).

**Drie antwoorden in de FAQ zijn niet aangeraakt**, en dat is een keuze. FAQ 2
belooft dat opwaarderen "onmiddellijk en naar rato" gaat, FAQ 3 een
terugbetaaltermijn van 30 dagen bij jaarbetaling, FAQ 5 een factuur die het
aantal zitplaatsen volgt. Geen van drieën wordt door enig systeem uitgevoerd —
er is geen factuur. Dit is dezelfde soort als de migratiebelofte hierboven: een
toezegging, geen beschrijving. Ze bijstellen verandert het aanbod, en dat is niet
aan mij.

---

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

## Regelgeving in kopij — EPBD IV, utiliteitsbouw NL (gemeten 2026-08-23)

Een wettelijke datum gedraagt zich als een prijs: hij staat in kopij, hij komt
uit een bron, en hij schuift. Vandaar dezelfde regel — hij staat hier of hij
gaat niet live. Aanleiding is `docs/bereik-plan.md` §2, waar EPBD IV de haak
werd onder het vastgoedcluster.

**De aanleiding om dit hier vast te leggen was een bijna-fout.** Een
zoekresultaat gaf "slechtste 16% per 2030, slechtste 26% per 2033". Die
percentages staan op **geen van beide** overheidsbronnen die het daadwerkelijk
uitvoeren. Ze zijn niet gepubliceerd.

| Claim | Waarde | Status |
| --- | --- | --- |
| Slechtst presterende utiliteitsgebouwen | **energielabel D uiterlijk 1 januari 2030** | ✅ [RVO, EPBD IV](https://www.rvo.nl/onderwerpen/wetten-en-regels-gebouwen/epbd-iv), gelezen 2026-08-23 |
| Eisen voor 2033 | **nog niet vastgesteld** door de rijksoverheid | ✅ zelfde bron — publiceer geen getal voor 2033 |
| Kantoren, vervroegde actie | label C uiterlijk december 2029 voldoet al aan wat vanaf 2033 gaat gelden | ✅ zelfde bron |
| Exacte verplichtingen in het Bbl | **uiterlijk in 2027** | ✅ [Rijksoverheid, 14-07-2025](https://www.rijksoverheid.nl/actueel/nieuws/2025/07/14/energiezuiniger-bouwen-en-nieuw-energielabel-door-implementatie-europese-richtlijn) — woordelijk: "De exacte verplichtingen worden uiterlijk in 2027 in het Besluit bouwwerken leefomgeving (Bbl) opgenomen." |
| Verbeterjaren, algemeen | "De gebouwen met de slechtste energieprestaties moeten uiterlijk in 2030 of 2033 worden verbeterd" | ✅ zelfde bron, woordelijk. Welke gebouwen in welk jaar staat er niet bij |
| Labelschaal vanaf 2030 | schaal loopt weer **A tot en met G**; de A-labels met plussen vervallen | ✅ beide bronnen |
| **Hoeveel plussen precies** | **de twee bronnen spreken elkaar tegen** — RVO schrijft "A+ tot en met A++++", Rijksoverheid "A+ tot en met A+++++" | ⚠️ **niet publiceren.** Schrijf "de A-labels met plussen vervallen" en tel niet |
| Bepalingsmethode | tegelijk met de nieuwe schaal komt een gemoderniseerde bepalingsmethode | ✅ Rijksoverheid, zelfde bericht |
| "slechtste 16%" / "slechtste 26%" | ❌ **staat op geen van beide bronnen** | ❌ **niet publiceren.** Kwam uit een samenvatting van derden, niet uit een uitvoerder |

**Waarom dit meer dan hygiëne is.** De Nederlandse uitvoering drukt de eis uit
in een **label** (D per 2030), niet in een percentage van het bestand. Dat
verschil is precies wat een pandeigenaar kan controleren: hij kan zijn eigen
label opzoeken, geen landelijke rangorde. Het percentage overschrijven zou de
claim tegelijk onjuist én onbruikbaar hebben gemaakt.

**Wat deze rijen niet dragen.** Geen uitspraak over kosten van verduurzaming,
geen terugverdientijd, geen aantal panden dat het raakt. Die getallen bestaan
hier niet, dus staan ze in geen artikel.

**Houdbaarheid.** De eisen liggen pas in 2027 in het Bbl vast. Elke rij
hierboven kan tot dat moment schuiven, en de Wkb — waar gevolgklasse 2 zonder
datum is uitgesteld — is het bewijs dat dat gebeurt. **Hercontroleer bij de
bron voordat je hier iets uit citeert dat ouder is dan een kwartaal.**

### ETS2 en gebouwgas — gemeten 2026-08-23

Het tweede spoor onder het vastgoedcluster. **Zwakker dan ik het eerst
opschreef**, en dat verschil staat hier zodat het niet opnieuw sterker wordt
gemaakt dan het is.

| Claim | Waarde | Status |
| --- | --- | --- |
| Brandstofleveranciers vallen onder ETS2 | vanaf **2027**, met jaarlijkse opgave van het emissiecijfer in het register | ✅ [NEa](https://www.emissieautoriteit.nl/regelgeving/eu-ets-2/ets-2-emissierechten), gelezen 2026-08-23 |
| Eerste veiling van rechten | januari 2027, **gepland** | ⚠️ zelfde bron. Schrijf altijd 'gepland' — het is een voornemen, geen vastgelegde datum |
| Eerste inlevering van rechten | **2029, over de emissies van 2028** | ✅ zelfde bron. Bijna twee jaar na de veilingstart |
| Wie is verplicht | de **brandstofleverancier**, niet de eindgebruiker | ✅ zelfde bron |
| Doorberekening naar de klant | leveranciers verwerken de kosten in hun tarief | ⚠️ **commercieel gedrag, geen wettelijke verplichting.** Wanneer en hoeveel is niet vastgelegd en niet voorspelbaar |
| Kosten per m³ of per kWh | **bestaat niet** | ❌ geen veilingprijs, geen doorberekeningsregel. Elke tabel met eurocijfers is een geextrapoleerde aanname |

**Wat dit corrigeert.** `docs/bereik-plan.md` §2 noemde ETS2 eerst een 'harde'
haak met januari 2027 als datum. Twee dingen kloppen daar niet aan: de veiling
is *gepland* en de eerste inlevering is 2029. De richting staat vast, het moment
waarop een eigenaar het voelt niet. §2 is bijgewerkt.

**Bruikbaar in kopij** is daarom alleen: de verplichting ligt bij de leverancier,
de kosten komen via het tarief binnen, de factuur splitst ze niet uit, en de
richting is omhoog. Alles daarbuiten is prognose.

### WPM — rapportage werkgebonden personenmobiliteit (gemeten 2026-08-23, aangevuld 2026-08-31)

De haak onder het logistiekcluster. **In werking**, anders dan EPBD en ETS2 —
dit is de enige van de drie die vandaag al geldt.

| Claim | Waarde | Status |
| --- | --- | --- |
| Grondslag | Besluit CO2-reductie werkgebonden personenmobiliteit | ✅ [RVO — WPM](https://www.rvo.nl/onderwerpen/rapportage-wpm/veelgestelde-vragen), gelezen 2026-08-23 |
| In werking sinds | **1 juli 2024** | ✅ zelfde bron |
| Wie | werkgevers met **100 of meer** werknemers | ⚠️ geldt vandaag, maar zie de rij hieronder |
| Peildatum voor de drempel | was 1 juli 2024; daarna **jaarlijks op 1 januari**. RVO woordelijk: "Vanaf 2025 kijken we jaarlijks op 1 januari naar het aantal werknemers dat u in dienst heeft." | ✅ zelfde bron, gelezen 2026-08-31 — je verplichting wordt dus elk jaar opnieuw getoetst, niet eenmalig vastgesteld |
| Waar | jaarlijks aan RVO, via een online formulier | ✅ zelfde bron |
| Toezicht | RVO woordelijk: "De omgevingsdienst controleert of er is gerapporteerd en of de gerapporteerde gegevens **geloofwaardig** zijn." | ✅ zelfde bron, gelezen 2026-08-31 — de scherpste rij, en de reden dat dit cluster bestaat. Let op bij het nameten: de [themapagina](https://www.rvo.nl/onderwerpen/rapportage-wpm) noemt alleen de inzendhelft; de FAQ en de [Engelse pagina](https://english.rvo.nl/topics/wpm, "the environment agency also checks the quality of your data") dragen allebei de tweede helft |
| Drempel naar 250 | ontwerp-wijzigingsbesluit van 24-04-2026 zondert het mkb uit; **het moment van inwerkingtreding is niet bekend** | ⚠️ [Rijksoverheid](https://www.rijksoverheid.nl/documenten/kamerstukken/2026/04/24/ontwerpwijzigingsbesluituitzonderenmkbvanrapportageverplichtingzakelijkenwoonwerkverkeer) — schrijf nooit dat de drempel al 250 is, en nooit een datum |
| Indieningsdeadline per jaar | **uiterlijk 30 juni**, over het voorgaande kalenderjaar. RVO woordelijk: "Dan rapporteert u uiterlijk 30 juni van het jaar over het voorgaande jaar." | ✅ nagetrokken 2026-08-31 op twee RVO-oppervlakken: de FAQ hierboven en de [Engelse pagina](https://english.rvo.nl/topics/wpm), die voor 2025 "no later than Tuesday, June 30, 2026" zegt. **Deze rij stond tot vandaag op "niet nagetrokken"**; de kopij die dat overschreef is meegewijzigd |
| Rapportagejaren in 2026 | RVO woordelijk: "In 2026 kunt u rapporteren over 2025 en 2024." | ✅ zelfde bron, gelezen 2026-08-31 — dit is wat een tweede ronde mogelijk maakt: twee eigen cijfers naast elkaar |
| Verweer bij twijfel | RVO woordelijk: "Als u de uitleg in de handreiking volgt, kunt u verklaren hoe u aan uw gegevens bent gekomen. Normaal gesproken gaat de omgevingsdienst dan akkoord. Maar een garantie kunnen we niet geven." | ✅ zelfde bron, gelezen 2026-08-31 — de toets is verklaarbaarheid, en RVO weigert er expliciet een garantie op te geven. **Publiceer die weigering mee**, anders leest de handreiking als een vrijbrief |
| Boetes of sancties | **niet nagetrokken** | ❌ niets over handhavingsgevolgen beweren |

**Waarom deze haak anders is dan de twee andere.** EPBD en ETS2 leggen een
toekomstige eis op. WPM geldt nu, en het toezicht kijkt of de cijfers
geloofwaardig zijn. Dat maakt hem bruikbaar zonder een toekomstvoorspelling:
wie vandaag niet kan laten zien waar zijn kilometercijfer vandaan komt, heeft
vandaag al een probleem.

**Wat er niet in kopij mag.** Geen sanctie, geen aantal getroffen bedrijven,
niet de suggestie dat de drempel al is verhoogd, en geen enkele uitspraak over
**wat de eerste landelijke rapportageronde heeft opgeleverd** — dat cijfer is
nergens nagetrokken en bestaat in dit bestand niet. De indieningsdatum mag
sinds 2026-08-31 wel, want hij staat hierboven.

**Wat er wel in kopij mag en er tot vandaag niet stond.** Het woord dat de
uitvoerder zelf gebruikt is *geloofwaardig*, niet *juist*. Dat is een
aannemelijkheidstoets en geen correctheidstoets, en het verschil is de hele
haak onder het tweede artikel.

### Salderingsregeling — het einde per 2027 (gemeten 2026-08-31)

De haak onder het NL-energiecluster. **Vijf artikelen leunen erop en tot vandaag
stond er geen enkele rij over in dit bestand** — terwijl EPBD, ETS2 en WPM, alle
drie jónger, hier wel staan. Dat gat is de reden dat in de oudste van die vijf
"de afbouw van de salderingsregeling" stond: precies het woord dat de uitvoerder
tegenspreekt.

| Claim | Waarde | Status |
| --- | --- | --- |
| Grondslag | Wet beëindiging salderingsregeling (36.611) | ✅ [Eerste Kamer](https://www.eerstekamer.nl/wetsvoorstel/36611_wet_beeindiging), gelezen 2026-08-31 |
| Aangenomen door de Eerste Kamer | **17 december 2024**, bij zitten en opstaan | ✅ zelfde bron |
| Gepubliceerd in het Staatsblad | **29 januari 2025, nr. 17** | ✅ zelfde bron |
| Salderen stopt | **1 januari 2027** | ✅ [Rijksoverheid](https://www.rijksoverheid.nl/themas/klimaat-milieu-en-natuur/energie-thuis/salderingsregeling) én [ACM ConsuWijzer](https://consument.acm.nl/elektriciteit-en-gas/duurzame-energie/wat-is-salderen), allebei gelezen 2026-08-31 |
| Afbouwpad | **bestaat niet** | ✅ Rijksoverheid, woordelijk: "Eerder was het plan om deze vanaf 2025 af te bouwen. Maar het kabinet heeft besloten om de regeling in 2027 helemaal te stoppen en niet eerder af te bouwen." ⚠️ **Schrijf nooit dat de regeling wordt afgebouwd** — de wet heet beëindiging, en het afbouwvoorstel (35.594) is een ánder traject |
| Terugleververgoeding | **tot 1 januari 2030 minstens 50%** van het kale leveringstarief — de prijs zonder energiebelasting en btw | ✅ beide bronnen. ACM woordelijk: "Tot 1 januari 2030 is dit minstens 50% van de prijs die u betaalt voor elektriciteit zonder energiebelasting en btw" |
| Hoogte bóven dat minimum | **bepaalt de leverancier**; de ACM houdt toezicht op de redelijkheid | ✅ beide bronnen |
| Wat er ná 1 januari 2030 geldt | **niet vastgelegd** | ✅ het minimum is expliciet tot die datum — publiceer geen percentage voor daarna |
| Terugleverkosten | **blijven bestaan**, en leveranciers moeten ze vanaf 2027 bij zonnepaneeleigenaren in rekening brengen | ✅ ACM, woordelijk — inclusief de waarschuwing dat ze "soms hoger uitvallen dan de vergoeding voor de teruggeleverde elektriciteit" |
| Bedrag van die terugleverkosten | **bestaat niet als landelijk getal** | ❌ per leverancier en per contract — geen euro publiceren |
| Terugverdientijd van een thuisbatterij | **geen getal** | ❌ hangt af van drie onbekenden hierboven; de vijf artikelen noemen daarom nergens een jaartal |

**Waarom de 50% de belangrijkste rij is.** Drie van de vijf artikelen vragen de
lezer een som te maken, en tot vandaag gaf geen van drieën hem de ondergrens.
Wie zonder die bodem rekent, komt te laag uit — en een installateur die te laag
rekent, verkoopt een batterij op een argument dat de klant later zelf kan
weerleggen. Het getal is bovendien kénbaar: het staat in de wet, niet in een
prognose.

**Wat deze rijen niet dragen.** Geen bedrag per kWh, geen terugverdientijd, geen
uitspraak over hoeveel huishoudens het raakt, en geen voorspelling over de
hoogte die leveranciers werkelijk gaan betalen. Die getallen bestaan hier niet,
dus staan ze in geen artikel.

**Houdbaarheid.** De stopdatum ligt vast in een gepubliceerde wet en schuift
niet zomaar. De 50%-bodem loopt af op 1 januari 2030 en wat daarna geldt is
onbeslist; de terugleverkosten zijn commercieel en bewegen doorlopend.
**Hercontroleer de laatste drie rijen bij ACM en Rijksoverheid voordat je er
iets uit citeert dat ouder is dan een kwartaal.** `lib/saldering.test.ts` houdt
de kopij aan deze tabel vast, maar een poort kan niet zien dat een bron
verandert.

### Solarpflicht — bondsrecht bovenop landesrecht (gemeten 2026-08-31)

De haak onder het DE-energiecluster. Tot vandaag stond er geen rij over in dit
bestand, terwijl kalenderrij J4 het onderwerp beschreef als een **puur
landesrechtelijk** lappendeken. Dat klopt sinds eind juli 2026 niet meer: er
ligt sindsdien een bondslaag overheen. De rij is daarop bijgesteld.

**Bron.** BGBl. 2026 I Nr. 226, uitgegeven 28 juli 2026 (ausgefertigt 23 juli
2026) — het `Gebäudemodernisierungsgesetz` (GModG). Lokaal uit het PDF
geëxtraheerd omdat de tekstlagen ObjStm-gecomprimeerd zijn: een fetch die de
ruwe bytes leest ziet niets en meldt "niet vast te stellen", en dat leest
hetzelfde als "staat er niet".

**Let op bij het nameten.** `gesetze-im-internet.de` toonde op 2026-08-31 nog
de óude Teil 8-kop, zonder het woord Solarenergie. Dat is
consolidatie-achterstand van dat portaal en geen afwezigheid van de bepaling.
Lees het Bundesgesetzblatt, niet de gemakskopie.

| Claim | Waarde | Status |
| --- | --- | --- |
| Grondslag | `§ 106 Solarenergie in Gebäuden`, ingevoegd door Artikel 2 Nr. 43 GModG; Artikel 2 Nr. 42 zet het woord Solarenergie in de kop van Teil 8 | ✅ BGBl. 2026 I Nr. 226 |
| GEG heet voortaan GModG | Artikel 1 Nr. 1; in werking **29. Juli 2026**, de dag na verkondiging (Art. 9 Abs. 1) | ✅ zelfde bron |
| § 106 in werking | **1. Januar 2027** — Artikel 2 valt onder Art. 9 Abs. 2 | ✅ zelfde bron |
| Trap 1 | **1. Januar 2027** — nieuw openbaar Nichtwohngebäude, en nieuw Nichtwohngebäude met meer dan 250 m² Nutzfläche | ✅ § 106 Abs. 2 |
| Trap 2 | **1. Januar 2028** — bestaand openbaar Nichtwohngebäude boven 2 000 m², en bestaand Nichtwohngebäude boven 500 m² wanneer een Änderung nach § 36 wordt uitgevoerd én voor het hele gebouw nach § 38 wordt gerekend | ✅ zelfde lid |
| Trap 3 | **1. Januar 2029** — bestaand openbaar Nichtwohngebäude boven 750 m² | ✅ zelfde lid |
| Trap 4 | **1. Januar 2030** — nieuw Wohngebäude, en nieuwe overdekte parkeerplaats die fysiek aan een gebouw grenst | ✅ zelfde lid |
| Trap 5 | **1. Januar 2031** — bestaand openbaar Nichtwohngebäude boven 250 m² | ✅ zelfde lid |
| Ontwerpplicht | een te bouwen gebouw zo concipiëren dat het potentieel voor solar-opwekking op de standplaats geoptimaliseerd wordt | ✅ § 106 Abs. 1 — dit richt zich op het ontwerp en niet op de montage |
| Uitzonderingen | technisch onmogelijk, functioneel niet realiseerbaar, economisch onredelijk, of in strijd met andere openbaar-rechtelijke voorschriften | ✅ § 106 Abs. 2 Satz 2 |
| Samenloop met § 40 | Abs. 1 en 2 gelden niet wanneer voor het gebouw maatregelen nach § 40 Abs. 1 te nemen zijn — de renovatie-eisen aan bestaande Nichtwohngebäude, die vanaf 2030 en 2033 grijpen | ✅ § 106 Abs. 3, en § 40 zelf |
| Landesrecht blijft gelden | woordelijk: "Die Länder können durch Landesrecht **weitergehende** Anforderungen an die Errichtung von Solarenergieanlagen stellen." | ✅ § 106 Abs. 4 — de bondsstaffel is een bodem en geen plafond. Dit is de scherpste rij, en de reden dat dit cluster bestaat |
| Defensiegebouwen | uitgezonderd | ✅ § 106 Abs. 5 |
| Land nagetrokken | **alleen Baden-Württemberg**, § 23 KlimaG BW, geconcretiseerd in de Photovoltaik-Pflicht-Verordnung | ✅ Umweltministerium Baden-Württemberg |
| Land nagetrokken op | **31. August 2026** | ✅ dezelfde raadpleging |
| BW — nieuw Nichtwohngebäude | sinds **1. Januar 2022** | ✅ zelfde bron |
| BW — nieuw Wohngebäude | sinds **1. Mai 2022** | ✅ zelfde bron |
| BW — open parkeerplaats vanaf 35 plaatsen | sinds **1. Januar 2022** | ✅ zelfde bron |
| BW — grundlegende Dachsanierung | sinds **1. Januar 2023** | ✅ zelfde bron — **een auslöser die het bondsrecht niet kent.** Maatgevend moment is hier de Baubeginn; bij de andere gevallen de datum van de Bauantrag |
| De overige vijftien Länder | **niet nagetrokken** | ❌ publiceer geen tabel over alle zestien |
| Bußgeld bij overtreding van § 106 | **niet nagetrokken** | ❌ niets over handhavingsgevolgen beweren |
| Voorgeschreven anlagengrootte in kWp | **niet nagetrokken** | ❌ geen vermogen noemen |

**Wat er niet in kopij mag.** Geen overzicht van alle zestien Länder, geen
Bußgeld, geen anlagengrootte, en niet de suggestie dat het bondsrecht het
landesrecht vervangt — Abs. 4 zegt het omgekeerde. Wie de landelijke kant wil
publiceren, trekt eerst dát Land bij zijn eigen uitvoerder na en zet de rij
hier neer.

**Waarom deze haak anders is dan saldering.** Saldering kent één datum voor
iedereen. Hier hangt de datum af van gebouwsoort, oppervlakte, eigendom én
Bundesland, en de twee lagen kunnen elkaar met jaren ontlopen: in
Baden-Württemberg geldt de plicht bij nieuwbouw van woningen sinds mei 2022,
terwijl de bondstrap daarvoor pas in 2030 valt. Een artikel dat alleen de
bondsstaffel noemt, vertelt een Betreiber daar dus het verkeerde.

### Einspeisevergütung en § 51 EEG — de negatieve-prijzen-regel (gemeten 2026-09-01)

De haak onder het DE-Heimspeicher-cluster. Tot vandaag stond er over dit
onderwerp **geen enkele rij** in dit bestand, terwijl drie Duitse artikelen
sinds 20 juli 2026 met een vergoeding en een degressie rekenen. Eén cijfer
daarin was verouderd, één marktcijfer is bij de uitvoerder niet na te trekken,
en er ontbrak een wetsartikel dat de hele rekensom van het cluster raakt.

**Bron.** Bundesnetzagentur voor de vergoedingssätze en het degressieritme;
`gesetze-im-internet.de` voor de wettekst van het EEG (§ 51, § 100) en het
EnWG (§ 14a, § 41a).

**Let op bij het nameten.** Een samenvatting over de Duitse
detailhandelsprijs voor huishoudelijke stroom levert cijfers uit
verschillende jaren door elkaar. De Bundesnetzagentur publiceert zelf **geen**
kopcijfer voor de eindprijs — haar consumentenpagina verwijst naar
vergelijkingsportalen en SMARD. Publiceer dus geen Cent-bereik voor de
eindprijs; laat de lezer zijn eigen Arbeitspreis gebruiken, die op zijn
rekening staat.

| Claim | Waarde | Status |
| --- | --- | --- |
| Teileinspeisung, anlagen tot 10 kW op gebouwen | **7,70 ct/kWh** | ✅ Bundesnetzagentur |
| Volleinspeisung, zelfde klasse | **12,22 ct/kWh** | ✅ zelfde bron |
| Geldigheidsduur van die twee sätze | **1. August 2026** tot en met **31. Januar 2027** | ✅ zelfde bron |
| Degressieritme | **halfjaarlijks sinds 2024**, met een vast percentage per stap | ✅ zelfde bron — de eerstvolgende stap valt dus op **1. Februar 2027** |
| Hoogte van die volgende stap | **niet vastgesteld** | ❌ noem geen bedrag voor februari 2027 |
| Solarpaket I, +1,5 ct/kWh | **nog niet in de sätze verwerkt**, wacht op EU-staatssteungoedkeuring, en geldt vanaf 40 kW | ✅ zelfde bron — raakt de huishoudklasse tot 10 kW dus niet |
| § 51 Abs. 1 EEG | woordelijk: "Für Zeiträume, in denen der Spotmarktpreis negativ ist, verringert sich der anzulegende Wert auf null." | ✅ gesetze-im-internet.de — **de scherpste rij, en de reden dat deze sectie bestaat** |
| Minimumduur voor die nulstelling | **bestaat niet** — "aufeinanderfolgende Stunden" komt in § 51 niet voor; nul vanaf het eerste uur | ✅ zelfde bron |
| Uitzondering onder 100 kW | geldt alleen "für Zeiträume vor dem Ablauf des Kalenderjahres, in dem die Anlage mit einem intelligenten Messsystem ausgestattet wird" | ✅ § 51 Abs. 2 — het slimme meetsysteem is dus zelf de trigger |
| Uitzondering onder 2 kW | tot de Festlegung nach § 85 Abs. 2 Nr. 12 | ✅ zelfde lid |
| Overgangsrecht | anlagen in bedrijf genomen **1. Januar 2023** tot en met **24. Februar 2025** houden de op 24. Februar 2025 geldende versie | ✅ § 100 Abs. 46 — daarmee is **25. Februar 2025** een echte grens |
| § 41a EnWG — dynamische tarieven | woordelijk: "Die Verpflichtung nach Satz 1 gilt ab dem 1. Januar 2025 für alle Stromlieferanten." | ✅ gesetze-im-internet.de — de claim in het tarief-artikel houdt stand |
| § 14a EnWG — steuerbare Verbrauchseinrichtungen | Wärmepumpen, niet-openbaar toegankelijke laadpunten, anlagen voor koude-opwekking of elektriciteitsopslag, Nachtstromspeicherheizungen | ✅ zelfde bron — **de opsomming noemt geen kW-drempel**, dus noem er ook geen |
| § 100 Abs. 45 — uur- versus kwartierprijzen | **niet volledig nagetrokken** | ❌ geen uitspraak over de prijsresolutie |
| Verlenging van de 20-jarige Zahlungszeitraum voor nul-uren | **niet vastgesteld** | ❌ beweer noch dat hij wél, noch dat hij níét verlengd wordt |
| Detailhandelsprijs huishoudens ("rund 30 bis 35 Cent") | **bij de uitvoerder niet na te trekken** | ❌ noem geen Cent-bereik; verwijs naar de eigen Arbeitspreis |
| Nagetrokken op | **1. September 2026** | ✅ dezelfde raadpleging |

**Wat er niet in kopij mag.** Geen Cent-bereik voor de detailhandelsprijs, geen
bedrag voor de stap van februari 2027, geen uitspraak over de verlenging van de
Zahlungszeitraum, geen kW-drempel bij § 14a, en niet de suggestie dat de
nulstelling pas na een aantal aaneengesloten uren begint.

**Waarom § 51 de rekensom van het cluster verandert.** In een uur met een
negatieve spotprijs levert een ingevoede kilowattuur nul op. Wie zijn
opgeslagen kilowattuur dán zelf gebruikt, bespaart niet het verschil tussen
7,70 cent en zijn Arbeitspreis maar zijn volledige Arbeitspreis. Het weglaten
van dit artikel maakte de batterijcase in het Heimspeicher-stuk dus **zwakker
dan hij is** — in een tekst die de lezer juist vraagt eerlijk te rekenen. In
het tarief-stuk bijt het harder: dat noemt negatieve middagprijzen én het
slimme meetsysteem, zonder te zeggen dat precies dát meetsysteem de
nulvergoeding aanzet, met ingang van 1 januari van het jaar daarna.

### Autoconsumo en compensación de excedentes — RD 244/2019 (gemeten 2026-09-01)

De haak onder het ES-autoconsumo-cluster. Tot vandaag stond er over dit
onderwerp **geen enkele rij** in dit bestand, terwijl drie Spaanse artikelen
sinds 20 juli 2026 met een compensatieplafond en met twee €/kWh-bereiken
rekenen. Eén kernclaim van het cluster blijkt bij de wettekst onjuist, twee
marktcijfers zijn bij de uitvoerder niet na te trekken, en de
plafondformulering is grover dan de wet.

**Bron.** De geconsolideerde tekst van het Real Decreto 244/2019 op `boe.es`,
plus de CNMC voor de vraag of er een gepubliceerd compensatietarief bestaat.

**Let op bij het nameten, twee vallen.** De geconsolideerde BOE-tekst wordt
bijgewerkt zonder dat de pagina dat in de tekst zelf zegt; lees de gedateerde
variant (`&p=<jjjjmmdd>&tn=1#a<artikel>`) mee, anders krijg je een oudere
doorsnede terug die er identiek uitziet. Eén raadpleging in deze ronde gaf
aantoonbaar de versie van vóór 2026 terug — zie de rij over art. 3.g.iii.
En de tweede: **selecteer op lidnummer, niet op onderwerp.** Twee raadplegingen
gaven verschillende tekst onder de noemer "art. 13.4"; pas een volledige dump
van art. 13 wees uit welke klopte.

| Claim | Waarde | Status |
| --- | --- | --- |
| Verkopen van overschot is mogelijk | art. 13.4, woordelijk: "El productor acogido a la modalidad de autoconsumo con excedentes no acogida a compensación, percibirá por la energía horaria excedentaria vertida las contraprestaciones económicas correspondientes, de acuerdo a la normativa en vigor." | ✅ boe.es — **de scherpste rij, en de reden dat deze sectie bestaat** |
| Die modaliteit is een vrijwillige keuze | art. 4.2.b, woordelijk: "…que no cumplan con alguno de los requisitos para pertenecer a la modalidad con excedentes acogida a compensación **o que voluntariamente opten por no acogerse a dicha modalidad**." | ✅ zelfde bron — het is dus geen restcategorie voor wie niet kwalificeert |
| Voorwaarden om wél in compensatie te vallen | vijf, cumulatief: hernieuwbare primaire bron; totaal gekoppeld opwekvermogen **≤ 100 kW**; één leveringscontract met dezelfde comercializadora waar hulpdiensten er een vergen; een getekend compensatiecontract volgens art. 14; en geen aanvullend of specifiek vergoedingsregime | ✅ art. 4.2.a, i tot en met v |
| Het plafond, woordelijk | "En ningún caso, el valor económico de la energía horaria excedentaria podrá ser superior al valor económico de la energía horaria consumida de la red en el periodo de facturación, el cual no podrá ser superior a un mes." | ✅ art. 14.3 — het plafond is de **waarde van de van het net afgenomen energie**, over een **factureringsperiode van hooguit een maand**; niet per definitie een kalendermaand |
| Waardering op de vrije markt | woordelijk: "La energía horaria excedentaria, será valorada al precio horario acordado entre las partes." | ✅ art. 14.3.i — een prijs tussen partijen, dus per contract verschillend |
| Waardering onder PVPC | "…valorada al precio medio horario, Pmh; obtenido a partir de los resultados del mercado diario e intradiario en la hora h, menos el coste de los desvíos CDSVh" | ✅ art. 14.3.ii — een formule, geen gepubliceerd tarief |
| Gepubliceerd €/kWh-compensatietarief bij de CNMC | **bestaat niet** — de CNMC beschrijft het mechanisme, niet een tarief | ❌ noem geen €/kWh-bereik voor de compensatie |
| Detailhandelsprijs huishoudens ("0,20-0,25 €/kWh") | **bij de uitvoerder niet na te trekken** | ❌ noem geen €/kWh-bereik; verwijs naar het término de energía op de eigen rekening |
| Doorschuiven naar de volgende periode | er is **geen bepaling** die het toestaat, en art. 14.3 begrenst per factureringsperiode | ✅ als afleiding — publiceer het als gevolg van het plafond, niet als eigen artikel |
| Overschot zonder geldig leveringscontract | wordt afgestaan "sin ningún tipo de contraprestación económica vinculada a dicha cesión" | ✅ art. 13.6 — geldt bij terugval op de comercializador de referencia |
| Wisselen van modaliteit | mag, met drie beperkingen in art. 4.5, waaronder: "…con la única excepción de un autoconsumo individual sin excedentes combinado con un autoconsumo mediante instalaciones próximas y asociadas a través de la red." | ✅ art. 4.5, geconsolideerde versie in werking 22/03/2026 |
| Is RD 244/2019 sinds 20 juli 2026 gewijzigd? | **ja** — laatste wijziging in werking **22/03/2026**, via Real Decreto-ley 7/2026, disposición final decimocuarta (df 14.1 raakt art. 3.g.iii, df 14.2 raakt art. 4.5). Ley 9/2025 disposición final decimoséptima raakte art. 4.5 eerder, per 03/12/2025 | ✅ BOE-metadata plus de gewijzigde tekst van art. 4.5 zelf |
| Raakt die wijziging de claims van dit cluster? | **nee** — het cluster steunt op art. 4.2 (modaliteiten), art. 13.4 en art. 14.3 (plafond en waardering), en geen van die leden is aangeraakt | ✅ zelfde raadpleging — dat is zelf de publiceerbare bevinding |
| Afstandsgrens voor collectief autoconsumo (art. 3.g.iii) | **niet nagetrokken bij de brontekst** | ❌ noem geen afstand in km of meters |
| Huidige tekst van art. 3.g.iii | **niet betrouwbaar verkregen** — de enige raadpleging die hem gaf, leverde aantoonbaar de versie van vóór 2026 | ❌ citeer dit lid niet |
| Nagetrokken op | **1 september 2026** | ✅ dezelfde raadpleging |

**Wat er niet in kopij mag.** Geen €/kWh-bereik voor de detailhandelsprijs en
geen voor de compensatie, geen afstandsgrens voor collectief autoconsumo, geen
citaat uit art. 3.g.iii, en niet de bewering dat je je overschot in Spanje niet
kunt verkopen.

**Waarom art. 13.4 de rekensom van het cluster verandert.** Het cluster draagt
als kernzin dat je je overschot in Spanje niet verkoopt maar tot een plafond
compenseert. De eerste helft daarvan is onjuist: er bestaat een tweede
modaliteit waarin het overschot wél economisch vergoed wordt, en art. 4.2.b
zegt met zoveel woorden dat je daar **vrijwillig** voor mag kiezen. Precies de
lezer die het cluster aanspreekt — degene die te horen krijgt dat hij niet moet
overdimensioneren — heeft daarmee een optie die het cluster wegliet. Wat wél
klopt is het plafond, en dat blijft de kern: binnen de compensatiemodaliteit
levert een kilowattuur boven je afname niets op.

## Reactietijd op leads — de 78% is folklore (gemeten 2026-08-23)

Aanleiding: een voorstel om in kopij en outreach te schrijven dat **"78% van
de klanten koopt bij het bedrijf dat als eerste reageert"**. Nagetrokken, en
het antwoord is nee.

**De 78% heeft geen traceerbare bron.** Elke vindplaats verwijst naar een
"Lead Connect"-onderzoek waarvan geen rapport, geen methode en geen steekproef
bestaat; de citaties wijzen naar elkaar. Hetzelfde geldt voor de begeleidende
"35-50% van de verkopen gaat naar de eerste aanbieder". **Niet publiceren, in
geen enkele vorm** — niet op de site, niet in een e-mail, niet in een
LinkedIn-bericht.

Er is wél echt onderzoek naar hetzelfde onderwerp, en het is sterker dan de
folklore die het verdrong.

| Claim | Waarde | Status |
| --- | --- | --- |
| Reageren binnen een uur | **bijna 7× meer kans om de lead te kwalificeren** dan een uur later; **ruim 60×** meer dan bij 24 uur of langer | ⚠️ Oldroyd, McElheran & Elkington, *The Short Life of Online Sales Leads*, **Harvard Business Review** 89(3), p. 28, 2011. Citatie geverifieerd bij de bron ([BYU ScholarsArchive](https://scholarsarchive.byu.edu/facpub/9711/)); de cijfers zijn door twee onafhankelijke secundaire bronnen bevestigd, **de volledige tekst is niet gelezen** (betaalmuur) |
| Steekproef van datzelfde onderzoek | audit van **2.241 Amerikaanse bedrijven** met testaanvragen | ⚠️ zelfde niveau van verificatie |
| Reageren binnen vijf minuten | **8× hogere conversie** dan vanaf zes minuten | ⚠️ XANT (voorheen InsideSales.com), *Lead Response Management* 2021 — 5,7 mln leads, 400+ bedrijven, 2018-2020. Leverancieronderzoek met gepubliceerde methode |
| Contact leggen binnen vijf minuten | **100× hogere kans op contact**, **21× hogere kans op kwalificatie** dan bij dertig minuten | ⚠️ Oldroyd / InsideSales.com, *Lead Response Management Study* 2007 — 15.000+ leads, 6 bedrijven. Oud, en van een leverancier met een belang |
| "78% koopt bij wie het eerst reageert" | ❌ **geen traceerbare primaire bron** | ❌ **niet publiceren** |
| "35-50% gaat naar de eerste aanbieder" | ❌ idem | ❌ **niet publiceren** |
| "elke minuut vertraging halveert de kans" | ❌ bestaat nergens | ❌ **niet publiceren** |
| "boven de 15 minuten verlies je 78%" | ❌ plakt twee dingen aan elkaar die niets met elkaar te maken hebben — de 78% gaat (zelfs in de folklore) over *eerst zijn*, niet over een kwartier | ❌ **niet publiceren** |

**Waarom alle rijen een ⚠️ dragen en geen ✅.** De vier bevestigde
klantuitkomsten in dit bestand zijn van Juan zelf, gemeten in zijn eigen
opdrachten. Deze rijen zijn dat niet: het is extern onderzoek dat ik niet in
de volledige tekst heb kunnen lezen. Dat is een ander soort zekerheid en het
hoort ook anders te heten.

**Drie beperkingen die mee moeten als deze cijfers ergens staan.**

1. **Amerikaans, en 2011 respectievelijk 2021.** Het is geen Nederlandse
   benchmark. Wie schrijft "in de Nederlandse makelaardij blijft een lead
   gemiddeld X uur liggen" heeft dat zelf gemeten of hij verzint het.
2. **Het gaat over *kwalificeren*, niet over *winnen*.** "7× meer kans om de
   lead te kwalificeren" is niet hetzelfde als "7× meer omzet". Dat verschil
   wegschrijven is precies hoe de 78% is ontstaan.
3. **Twee van de drie bronnen zijn van een leverancier** die software voor
   sneller opvolgen verkoopt. De HBR-publicatie is de enige met externe
   redactie, en dat is de reden dat hij bovenaan staat.

**Wat er dus wél mag.** Eén zin met bron en jaartal erbij, als context naast
een getal dat de lezer zelf heeft gemeten. Niet als belofte, niet als
Nederlands gemiddelde, en niet zonder de bron erbij.

**Wat er niet mag.** Een drempel verzinnen. "Langer dan 15 minuten",
"meer dan 5 uur per week", "langer dan 48 uur" — geen van deze drie heeft een
bron, en een drempel is precies het soort getal dat een lezer overneemt.
De enige tijdsgrens in dit blok met een bron erachter is **één uur**, en die
komt uit de HBR-publicatie.

## Where copy lives

| Surface | Source of copy |
| --- | --- |
| juandiazllc.com | `lib/i18n/dict.ts` (en/nl/de/es) + `components/sections/*` |
| diazatlas.com | `diaz-editor` repo, HTML with `data-nl` / `data-de` / `data-es` attributes |
| Social posts | `diaz-content-vault` manifest + `CAPTIONS-30-POSTS-EN-ES` in `diaz-editor` |
| pv-string-sizer | its own README |

A price change touches all four. That is the point of this file.
