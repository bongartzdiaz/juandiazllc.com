---
name: social-calendar
description: 2-4 week social content planner — Instagram + LinkedIn + X met content-mix (educational/social proof/CTA/news) per kanaal. Output is plannings-tabel + concept per post. Voorkomt last-minute scramble.
trigger: /social-calendar
---

# /social-calendar

Social media planning over meerdere weken. Output: planning + drafts.

## Usage

```
/social-calendar --weeks 2
/social-calendar --start 2026-05-04 --weeks 4
/social-calendar --channels ig,li,x
/social-calendar --theme "saldering 2027 countdown"
```

## Mix-formule (per week, per kanaal)

### Instagram (4-5 posts/week)
- 2× Educational (stat-card, quick-tip carrousel, FAQ)
- 1× Social proof (testimonial, case study, milestone)
- 1× Behind-the-scenes (team, installatie, proces)
- 1× CTA / aanbod (link in bio naar gids/calc)

### LinkedIn (2-3 posts/week)
- 1× Thought leadership (Juan persoonlijk — zie /linkedin-post)
- 1× Educational met data
- 1× Industry news + commentary

### X / Twitter (3-5 posts/week)
- 1× Hot take energy news
- 2× Quick tips / threads
- 1× Quote / engagement vraag
- 1× CTA (low-key)

### YouTube / Reels (1-2/week)
Apart bestand met video script (zie /video-script).

## Per-post checklist

### Caption regels
- IG: 100-200 woorden + 5-10 relevante hashtags
- LI: 1200-1600 chars optimal (max 3000 hard cap)
- X: <280 chars per post, threads OK

### Visuals
- IG: square 1080² of carrousel
- LI: 1200×627 of vertical 1080×1350
- X: 1600×900 (16:9) — laad sneller dan vertical
- Roep `/design-stat-card` of `/design-og-card` aan voor visuals

### Compliance per post
- [ ] Geen prijsgarantie
- [ ] Geen concurrent-naam
- [ ] Geen valse urgentie
- [ ] Bron bij data-claim
- [ ] Disclaimer waar nodig
- [ ] Brand voice (B1, geen jargon)

## Posting times (NL audience)

| Kanaal | Best uur | Best dag |
|---|---|---|
| Instagram | 11:00-13:00, 19:00-21:00 | Di, Wo, Do |
| LinkedIn | 08:00-10:00, 17:00-18:00 | Di, Wo, Do |
| X / Twitter | 07:00-09:00, 12:00-14:00 | Ma-Vr |
| Facebook | 13:00-15:00 | Do, Vr, Za |

Test eigen audience na 2 weken — adjust planning.

## Output format

### 1. Calendar tabel

```
WEEK 19 — 2026-05-04 t/m 2026-05-10

| Dag | Tijd | Kanaal | Type | Topic | Status |
| Ma 4 | 09:00 | LI | Thought leader | "Saldering urgentie" | DRAFT |
| Di 5 | 11:30 | IG | Stat card | "70% zelfverbruik" | DRAFT |
| Di 5 | 17:00 | LI | Educational | "Batterij types uitgelegd" | DRAFT |
| Wo 6 | 08:00 | X | Hot take | "Energiewet update" | DRAFT |
| Wo 6 | 19:00 | IG | Carrousel | "5 stappen besparing" | DRAFT |
| Do 7 | 12:00 | X | Tip thread | "Zonnepanelen onderhoud" | DRAFT |
| Do 7 | 18:00 | LI | News + commentary | "Sigenergy launch reactie" | DRAFT |
| Vr 8 | 11:00 | IG | Behind-the-scenes | "Installatie team" | DRAFT |
```

### 2. Per post: full draft
```markdown
## [WO 6 IG 19:00] Carrousel — "5 stappen besparing"

Visual: Carrousel 5 slides, brand kleuren, /design-stat-card stijl

Caption:
[volledige caption met hashtags]

Hashtags:
#thuisbatterij #energiebesparen #saldering2027 ...

CTA: Link in bio → helpmijbesparen.nl/gids

Compliance: [ ] x6 ✓
```

### 3. Asset queue
Lijst van benodigde visuals:
- 5 stat cards
- 1 carrousel (5 slides)
- 1 quote card
- 2 lifestyle photos

→ vraag aan ontwerper / call /design-* skills

### 4. Memory hook
`project_social_<jaar-week>.md` met planning + later: actuals (engagement, traffic).

## Hashtag strategie (IG/LI)

### Always-on (5)
#energiebesparen #zonnepanelen #thuisbatterij #saldering #duurzaamthuis

### Topic-specific (3-5 per post)
Match aan post-topic.

### Niche (2-3)
Voor reach buiten core: #energietransitie #klimaat #netcongestie

NIET:
- Generieke spam (#like4like #follow)
- Niet-relevant trending
- Concurrent-tags (#zonneplan etc)

## Recurring series ideeën

Bouw herkenbaarheid:
- #ZondagSalderingFeit (wekelijks weetje)
- #WoensdagWatVeranderter (regelgeving update)
- #VrijdagVanDeVragen (FAQ-format)

## Hard rules
- Compliance check per post (geen prijzen / concurrent)
- Bron bij elke data-claim
- Visuals via design-skills (consistent brand)
- Cadans planbaar (iedere week N posts per kanaal)
- Crosspost met aanpassing (X-tekst ≠ LI-tekst)
- Performance review na 4 weken — wat scoort, wat niet

## Memory check
Lees: reference_hmb_brand, recente project_social_*, CLAUDE.md §2
