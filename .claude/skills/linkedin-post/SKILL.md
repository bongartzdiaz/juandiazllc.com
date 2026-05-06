---
name: linkedin-post
description: Juan's persoonlijke LinkedIn post — thought leadership over energie/saldering/builden HMB. Andere stem dan HMB company posts (persoonlijker, founder-perspectief). Optimized voor LI engagement (hook, 3-act, CTA-light).
trigger: /linkedin-post
---

# /linkedin-post

Persoonlijke LinkedIn van Juan. Niet HMB company page.

## Stem-verschil

| HMB company page | Juan persoonlijk |
|---|---|
| Educatief, professioneel | Authentiek, founder-stijl |
| Brand-spread message | Eigen mening / ervaring |
| 3-stappen funnel CTA | Soft CTA of gewoon discussie |
| Evergreen content | Reactie op actualiteit |
| Visual-zwaar | Tekst-eerst |

## Usage

```
/linkedin-post <topic-of-event>
# vb: /linkedin-post "saldering wet aangenomen wat ik leerde"
# vb: /linkedin-post "fout die ik maakte met DM Champ implementatie"
# vb: /linkedin-post "waarom ik geloof in thuisbatterij ondanks kosten"
```

## Post types die werken op LI

### A. Lessons learned (founder)
Persoonlijke fout / inzicht uit HMB build.
"Ik dacht X, blijkt Y. Hier is wat ik leerde:"

### B. Hot take op nieuws
Reactie binnen 24u op energie-actualiteit.
Eigen mening + onderbouwing + open vraag.

### C. Behind the scenes
Iets wat anderen niet zien — agent setup, lead-flow, NEXUS BOS architectuur.
Show don't tell.

### D. Contrarian
Stelling die afwijkt van mainstream HMB-wereld.
"Iedereen zegt X. Ik denk Y." + reasoning.

### E. Carousel (10 slides)
Educational maar persoonlijk frame.
Visual via /design-stat-card achtige cards.

## Structuur LinkedIn post

```
[HOOK — eerste 2-3 regels, voor "see more"]
Punchy stelling of cijfer of vraag.

[CONTEXT — 2-3 zinnen]
Waarom ik dit zeg / wat de aanleiding is.

[KERNPUNT — body]
3-5 punten met witregels ertussen.
Korte zinnen.
Geen vage abstracties.

[INSIGHT / TAKEAWAY]
Wat moet lezer onthouden.

[VRAAG / CTA]
Open vraag aan netwerk OF
"Volg voor meer over [topic]"
NIET: "Plan een gesprek" (te HMB-y voor persoonlijk)

[PS optioneel]
Klein detail, easter egg, of crosslink.
```

## Format regels

- Length: 1200-1600 chars (sweet spot voor LI algoritme)
- Witregels: ALTIJD na elke 1-2 zinnen
- Geen emojis (CLAUDE.md verbod)
- Geen "🔥🔥" caps lock
- Hashtags: 3-5, einde post
- Geen externe links in body (in 1e comment indien nodig)

## Hashtag set

Vast voor Juan persoonlijk:
#energietransitie #ondernemen #builden #SaaS #klimaat

Topic-specific (1-2):
#thuisbatterij #saldering #zonnepanelen

## Authenticity checks

Voor publish:
- [ ] Klinkt dit als Juan? (niet als brand)
- [ ] Bevat dit iets specifiek (cijfer, anekdote, naam)?
- [ ] Zou ik dit ook zeggen bij borrel?
- [ ] Geen "thought leadership cliché" (no "in today's fast-paced world")
- [ ] Niet teveel HMB-pluggen (max 1× per maand directe HMB-mention)

## Compliance

- [ ] Geen prijzen HMB
- [ ] Geen concurrent-naam (mag hint zonder benoemen)
- [ ] Geen klant-data zonder permission
- [ ] Geen team-naam zonder permission
- [ ] Eigen mening duidelijk gemarkeerd ("ik denk", "in mijn ervaring")

## Engagement boost

- Reageer in eerste 30 min op alle comments (algoritme boost)
- Stel vraag in body voor reacties
- Tag specifieke persoon (max 1) als relevant
- Cross-post in 1-2 nichegroepen na 4u

## Visual (optioneel)

Als visual: roep `/design-quote-card` of `/design-stat-card` aan.
Voor carousel: eigen template — 10 slides met max 4 zinnen elk.

## Output format

```
═══ LINKEDIN POST — <topic> ═══

TYPE: <A-E>

POST (volledig)
[Hook]
[Context]
[Body]
[Insight]
[CTA/vraag]

#hashtag #hashtag #hashtag

CHARACTER COUNT: <N>
PREVIEW (eerste 200 chars zichtbaar):
[exact die preview]

VISUAL (optioneel):
[suggestie voor /design-* call]

ENGAGEMENT PLAN
- T+0: post live <tijd>
- T+30min: actief reageren op comments
- T+4u: crosspost in <groep>
- T+24u: check engagement, optimize next

AUTHENTICITY
[ ] x5 ✓

COMPLIANCE
[ ] x5 ✓

MEMORY
Sterk inzicht? → schrijf naar reference_juan_takes.md
```

## Hard rules
- Persoonlijke stem, niet brand-voice
- Geen emojis
- Witregels overal
- Hook in eerste 2 regels (LI cuts at "see more")
- Bronnen in body bij data
- Engage post-publish

## Memory check
Lees: user_juan, recente logboek_*, recente project_* voor lessons learned material
