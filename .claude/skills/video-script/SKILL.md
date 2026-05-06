---
name: video-script
description: Video script voor YouTube short (60s) of long form (3-10 min) of Reels/TikTok — hook, structuur, B-roll suggesties, thumbnail brief, end-screen CTA. Schrijver-voor-camera friendly format.
trigger: /video-script
---

# /video-script

Video script + production brief.

## Usage

```
/video-script <format> <onderwerp>
# vb: /video-script short "Wat verandert er met saldering"
# vb: /video-script long "Thuisbatterij kiezen in 5 stappen"
# vb: /video-script reels "Energierekening hack"
```

## Formats

### A. Short (≤60s) — YouTube Shorts / Reels / TikTok
- Hook in eerste 3 sec (anders scroll)
- 1 boodschap maximum
- Tekst-overlay altijd (mensen kijken zonder geluid)
- Ratio 9:16 vertical

### B. Long form (3-10 min) — YouTube
- Hook (15s) → context (30s) → kernpunt 1 → 2 → 3 → recap → CTA
- Engagement boost om de 2 min
- Ratio 16:9

### C. Reels (30-60s) — Instagram
- Vergelijkbaar met short, dynamischer cuts
- Music/audio matched aan beat

## Structuur per format

### SHORT (60s)

```
[0-3s] HOOK
   Visual: persoon close-up, expression "verbazing"
   Voice: "[scherpe stelling of vraag]"
   Tekst-overlay: "[hook in 4-6 woorden]"

[3-15s] PROBLEEM
   Voice: [waarom dit relevant is]
   B-roll: [situatie tonen]

[15-45s] OPLOSSING / INZICHT
   Voice: [kernpunt 1, 2, 3 — kort]
   Tekst-overlays: per punt
   B-roll: [grafieken / situatie]

[45-55s] PROOF / EXAMPLE
   Voice: [concreet cijfer of voorbeeld]
   Bron-citaat klein onderin

[55-60s] CTA
   Voice: "[volgende stap]"
   Tekst: "Link in bio" / "Volg voor meer"
```

### LONG (5 min voorbeeld)

```
[0:00-0:15] HOOK
   "[stelling die zegt: dit ga je weten]"
   Trailer-snippets van wat komt

[0:15-0:45] CONTEXT
   Wie ben ik / waarom dit / wat ga ik delen

[0:45-1:30] KERNPUNT 1
   Setup → uitleg → voorbeeld → recap

[1:30-2:30] KERNPUNT 2
   Idem

[2:30-3:30] KERNPUNT 3
   Idem

[3:30-4:00] BIG INSIGHT
   Combineer punten naar 1 conclusie

[4:00-4:30] CASE / DATA
   Concreet voorbeeld + bron

[4:30-5:00] CTA + END-SCREEN
   - Subscribe
   - Link in beschrijving (gids / calc)
   - Volgende video preview
```

## Per-script onderdelen

### Hook (kritisch)
3-second window. Test:
- Pattern interrupt (visueel)
- Belofte ("Binnen 60s weet jij...")
- Vraag met spanning ("Wist je dat...")
- Cijfer ("Dit kost 70% meer in 2027")
- Tegen-intuïtieve stelling

### Voice (script)
- Schrijf zoals je praat (niet zoals je schrijft)
- Korte zinnen
- Pauzes (cue: "...")
- B1, geen jargon

### Tekst-overlays
- Max 5 woorden per overlay
- Contrast hoog (witte tekst op donker, of zachtgroen kader)
- Ondertitels onderin VERPLICHT (volledig spoken voice)

### B-roll suggesties
Per scene wat te tonen:
- Situatie (zonnepanelen / batterij meterkast)
- Stock-footage NL woning
- Schermrecording (calculator gebruik)
- Grafieken / data visualization
- Whiteboard tekening

### Thumbnail brief
Roep `/design-thumbnail` aan met:
- Style: face / product / text-driven
- Headline (max 4 wrd)
- Emotie / focus

### End-screen / Card
- 1 dominant volgende-stap
- Subscribe + 1 specifieke link
- 5-10 sec aan einde

## Compliance per script

- [ ] Geen prijsgarantie
- [ ] Geen concurrent benoemd / zichtbaar
- [ ] Bron bij data-claim (in beeld + beschrijving)
- [ ] Disclaimer waar nodig ("indicatief")
- [ ] B1 leesbaar / hoorbaar
- [ ] Geen misleidende thumbnail (matched content)
- [ ] CTA leidt naar funnel-stap conform CLAUDE.md §5

## Output format

```
═══ VIDEO SCRIPT — <format> ═══

TITLE (YouTube): <SEO + curiosity, <60 chars>
TITEL (intern): <slug>
DURATION: <Xs / X:XX>

═ SCRIPT ═
[volledige script met timecodes en regie-aanwijzingen]

═ B-ROLL LIST ═
1. [scene + suggestie + tijdstip in script]
...

═ TEKST-OVERLAYS ═
1. [text + tijdstip]
...

═ THUMBNAIL BRIEF ═
[roep /design-thumbnail aan met deze input]

═ DESCRIPTION (YouTube) ═
[150-200 wrd met keywords + tijdstempels long form + bronnen + CTA]

═ TAGS / KEYWORDS ═
[15-20 voor SEO]

═ END-SCREEN CTA ═
[wat volgt]

═ COMPLIANCE ═
[ ] x7 ✓

═ POST-PUBLISH ═
[ ] Add to playlist <X>
[ ] Pin comment met CTA + link
[ ] Schema VideoObject op site indien embedded
[ ] Memory: project_video_<slug>.md
```

## Hard rules
- Hook < 3 sec
- Ondertitels altijd
- 1 dominant CTA
- B-roll specs duidelijk
- Compliance ≥ aesthetics
- Bronnen in beschrijving + on-screen

## Memory check
Lees: reference_hmb_brand. Verwijst naar /design-thumbnail.
