# SEO playbook — juandiazllc.com

Last updated 2026-04-19. Covers geo targeting, backlinks, content cadence,
and LinkedIn + Instagram distribution. Written to be executed, not admired.

---

## 1. Geo targeting — four locales, one domain

Current setup (post-Phase 2): every public URL exists at
`/{en|nl|de|es}/<path>`, each page emits its own `canonical` +
`hreflang` languages map + `x-default` pointing at `/en`. The sitemap
emits four entries per route with the same alternates block. Middleware
detects locale by cookie > `Accept-Language` > default, and redirects
unprefixed paths.

### Google Search Console setup

1. Verify the property at `https://juandiazllc.com` (DNS TXT).
2. Submit the single sitemap: `https://juandiazllc.com/sitemap.xml`.
   Google reads the hreflang block per URL — no per-locale sitemap needed.
3. In Search Console → Settings → International Targeting: leave the
   country as "Unlisted" (we're a holding, not country-specific).
4. Watch the Coverage report weekly for the first month. Expect
   ~4× URL count after first index (48 surfaces now, will grow).

### Local signals to tune

The Organization schema in `app/[locale]/layout.tsx` currently declares
`addressCountry: "US", addressRegion: "Delaware"` (the LLC registration).
That's correct for the entity but **weak for NL/DE/ES search intent**.
Add a second location block once the Amsterdam HQ is formalized:

```ts
address: [
  { "@type": "PostalAddress", addressCountry: "US", addressRegion: "Delaware" },
  { "@type": "PostalAddress", addressCountry: "NL", addressLocality: "Amsterdam" },
],
```

For each target market, localize the `<Countdown>` context on the
Dutch home page (salderingsregeling), run a separate DE-facing page
angle (e.g. Solarpaket I), and keep the ES angle tied to the EU
Green-Deal-funded solar boom in Andalusia / Aragón.

### Keyword clusters (per locale)

Pick 2-3 per locale and own them with 5+ pieces of content each. Thin
coverage across 20 keywords is worse than deep coverage on 3.

**EN (global / US):**
- "operator CRM" (Philly angle)
- "revenue operations for field teams"
- "buy vs build commodity SaaS"

**NL:**
- "salderingsregeling 2027" (already cluster-worthy)
- "CRM voor installateurs"
- "thuisbatterij ROI"

**DE:**
- "Solarpaket I" (2024 EEG reform; similar moment to NL 2027)
- "Betreiber-Software Energie"
- "Vermietungsverwaltung Dashboard"

**ES:**
- "autoconsumo solar empresas"
- "software operadores energía"
- "CRM para instaladores"

---

## 2. Content cadence + publishing strategy

**Rule: 1 piece/week in 1 language beats 1 piece/month translated 4×.**
Google rewards freshness on a topic cluster. Translation is a multiplier
that compounds *after* you have a defensible cluster in one language.

### Recommended hybrid

- **Flagship posts (3–5/year)** — full 4-language translation. These
  are the pieces that could rank for years: "Why operator dashboards
  lie", "Build vs buy for operators", "The five phases", the
  salderingsregeling-2027 playbook.
- **Locale-native posts** — NL-only on Dutch energy policy,
  DE-only on Solarpaket I, ES-only on EU autoconsumo rules. These
  don't need EN equivalents — they win on specificity.
- **Signals (short) vs Insights (long)** — keep signals short,
  locale-native, high-cadence (weekly). Insights are fewer, longer,
  translated.

### Signals page upgrades (pending)

1. Add `Article` JSON-LD to `/signals/[slug]` (insights has it,
   signals doesn't).
2. Add `/signals/tag/[tag]` pages mirroring the insights tag
   archives — gives each topic cluster its own SEO surface.
3. Add `/rss.xml` + `/feed.json` for both insights AND signals.
   AI crawlers (ChatGPT, Perplexity) weight RSS discovery heavily.
4. Mark each post `inLanguage: "en" | "nl" | "de" | "es"` in data.

### Author schema (shipped 2026-04-19)

Every `/insights/[slug]` now ships a richer `Person` author block
with `jobTitle`, `image` (portrait.jpg), `sameAs` (LinkedIn + IG).
This is bait for the Google Knowledge Panel. Keep the LinkedIn +
IG profiles updated with the same name, photo, and bio so Google
can cluster the signals.

---

## 3. Backlinks — the only thing that actually moves rankings

Three tiers, in priority order.

### Tier 1 — guest posts on domain-authority sites

One piece on a real energy/real-estate publication beats 20 on your
own domain. Target for 2026:

- **Solar Magazine NL** (solarmagazine.nl) — pitch a piece on the
  salderingsregeling-2027 operator playbook. DA ~55.
- **PV Magazine DE** (pv-magazine.de) — Solarpaket I operator angle.
  DA ~65.
- **Tweakers.net** — one op-ed on AI + energy-tech. DA ~80.
- **El Confidencial (tech section)** — autoconsumo for ES operators.

**Pitch template** lives at `/docs/pitch-template.md` (TODO — not
yet written). Angle: "I'm the operator, here's what I learned
building X — data from N installations." Not a pitch deck, a
field report.

### Tier 2 — directory + profile links

Low effort, low per-unit value, but compounds. Owner-founder profiles:

- Crunchbase (Juan Diaz LLC + founder profile)
- LinkedIn company page (link from every venture back to the LLC)
- GitHub org page → pin public repos, link to juandiazllc.com
- Product Hunt — launch Voltafy and Help Mij Besparen separately,
  each with a `/work/[slug]` as the "learn more" link.
- ZoomInfo, Clutch.co, G2 (for Philly CRM when it's public)

### Tier 3 — ecosystem link exchange

Not pay-for-links (Google penalizes these). Real ones:

- Every venture site (`voltafy.com`, `helpmijbesparen.nl`,
  `salderingsregeling2027.nl`, Philly CRM marketing) links back to
  `/about` or `/work/[slug]` on the holding site.
- Every podcast / interview you do → ask for a `juandiazllc.com`
  link in the show notes. Non-negotiable.

---

## 4. LinkedIn strategy — the primary distribution channel

Audience: operator founders, 20–200 headcount, energy / real-estate /
hospitality. This is where your actual buyers live. Treat LinkedIn
as the top of funnel, the site as the conversion surface.

### Profile optimization

- **Headline:** "Builder of revenue engines for operators ·
  Juan Diaz LLC · Voltafy · Philly CRM" — keyword-stuffed but
  honest. LinkedIn search is keyword-literal.
- **About section:** open with the one-sentence positioning,
  then 3 bullets of what you ship, then 1 line of where you've
  shipped it. Link to juandiazllc.com in the first paragraph
  (LinkedIn only makes the first URL clickable in bio).
- **Featured section:** pin 3 things — `/story`, the latest
  flagship insight, and the blueprint-call booking link.
- **Experience:** Juan Diaz LLC at the top, then each venture
  as a sub-role, then construction management. Recruiter-bait,
  but operators read these too.
- **Photo:** use `/me/portrait.jpg` (same file driving the
  site OG + JSON-LD). Google clusters identity by image hash.

### Content cadence — 3 posts/week

Mix ratio (proven for B2B operator audience):

- **Monday — short build log** (~150 words). "This week I shipped
  X for [venture]. Here's what broke." Screenshots welcome.
- **Wednesday — contrarian take** (~300 words). One pattern
  you're seeing in operator-land that the consensus gets wrong.
  These are the ones that get shared.
- **Friday — long-form** (~600-800 words). A condensed version
  of the week's flagship insight post, with a link back to the
  full piece on `/insights/[slug]`. LinkedIn throttles external
  links, so the post must be readable without clicking — the
  link is for the 3% who want the long version.

### Engagement rules

- Reply to every comment in the first 60 minutes (LinkedIn's
  algorithm weights that heavily).
- Comment thoughtfully on 5 other operator founders' posts per
  day — builds the network that amplifies your next post.
- Never auto-post. Every post gets a 5-minute human edit for
  format, spacing, emoji discipline (minimal), and punch lines.

---

## 5. Instagram strategy — the visual signal

Audience: secondary — prosumers for Voltafy / Help Mij Besparen,
NL/DE energy-tech consumers. Not operator founders. Instagram
converts worse than LinkedIn for B2B, so treat it as brand +
retargeting, not lead gen.

### Profile: @diazelcazador

- **Bio:** "El cazador · Juan Diaz LLC · revenue engines for
  operators · Amsterdam ↔ Philly" with a link-in-bio to
  juandiazllc.com/now (so the visible page is always current).
- **Highlights:** create 4 story highlights — "Ventures", "On site",
  "Behind the build", "Press".
- **Profile photo:** same as LinkedIn + site. Consistency matters
  for Knowledge-Graph clustering.

### Content — 4 posts/week

- **2× feed posts/week** — high-contrast operator-site photos.
  The editorial shot (glass-building reflection) is perfect for
  these. Caption format: 1-line hook, 2-3 line context, 1
  question. Keep it under 50 words.
- **4-5× stories/day** (during active work weeks) — behind-the-scenes
  of the build, site visits, dashboard screenshots with selective
  blur. Stories keep the algorithm warm without needing polished
  assets.
- **1× Reel/week** — 15-30 seconds, no voice-over. Operator
  footage: walking a solar site, opening the CRM dashboard,
  on a call at a desk. Caption does the talking.

### Crosspost, don't duplicate

Reels post natively, NOT via cross-post from IG to FB (the cross-
post gets algorithmically suppressed on both). Every Reel also
goes to LinkedIn as a standalone video — different audiences,
same asset, 2× reach for free.

### Hashtag discipline

Pick 8-12, keep them stable across posts. In order of priority:

NL/EU-leaning: `#zonnepanelen #saldering2027 #energietransitie
#thuisbatterij #installateur`

EN/global: `#operatortools #revenueops #fieldteams #startupfounder
#amsterdam #philly`

Don't chase #solarpanels (too broad). Chase long-tail Dutch/German
terms where the audience actually searches.

---

## 6. Measurement — what to check weekly

Set a Monday 9am recurring block. 15 min.

- **Search Console** — impressions per locale, top 10 queries per
  locale. Watch for NL/DE/ES impressions climbing after Phase 3
  ships. Expect the first NL uplift within 14 days.
- **Plausible / your analytics** — bounce rate per locale. If NL
  bounce > 70%, the translation has a gap.
- **LinkedIn analytics** — post reach + follower growth rate.
  Target: +50 operator-founder followers / week by week 8.
- **Instagram insights** — story completion rate >60% = healthy,
  <40% = your content is too long / too polished.
- **Backlinks** — `ahrefs` or `linkody` free tier. Target: +2
  quality backlinks / month for the first 6 months.

---

## 7. 30-day execution plan

### Week 1
- [ ] Submit sitemap to Search Console (5 min)
- [ ] Write the LinkedIn profile rewrite (1 hr)
- [ ] Publish the first Monday build-log post
- [ ] Record 1 Instagram Reel from the current build

### Week 2
- [ ] Pitch Solar Magazine NL with the salderingsregeling angle
- [ ] Ship signals tag archives + Article JSON-LD
- [ ] Publish 2 flagship insights (EN + NL translation)

### Week 3
- [ ] Pitch PV Magazine DE with Solarpaket I angle
- [ ] Launch `/rss.xml` + `/feed.json`
- [ ] First LinkedIn contrarian take — ship it Wednesday

### Week 4
- [ ] First monthly review — Search Console + backlinks check
- [ ] Schedule the first podcast appearance (leverage network)
- [ ] Decide: ES content push in May or defer to Q3?

---

## Appendix A — file references

- Locale routing: `proxy.ts`, `app/[locale]/layout.tsx`
- Metadata helpers: `lib/i18n/metadata.ts`
- Sitemap: `app/sitemap.ts` (emits 4× locale with hreflang)
- Dictionaries: `lib/i18n/dict.ts`
- JSON-LD Person + Organization: `app/[locale]/layout.tsx`
- JSON-LD Article: `app/[locale]/insights/[slug]/page.tsx`
- Portrait placeholder: `/public/me/portrait.jpg` (to be dropped in)

## Appendix B — what's intentionally NOT on this list

- **PPC / Google Ads.** Waste of money before you have a cluster
  that can absorb the intent. Revisit in 2027.
- **Medium / Substack.** Every word belongs on your own domain.
  Syndicate AFTER indexing, never before.
- **SEO tools that crawl and "audit" your site** (SEMrush,
  Moz Pro automation). Use them for keyword research and backlink
  monitoring only — ignore their automated "issues" reports.
- **Translating user-generated content** (leads, lead messages).
  Keep those English in the DB; translate in the UI only.
