---
name: banner-prompt
description: Genereer Imagen 3 / Gemini prompts voor visuals volgens NEXUS BOS spec (afmeting, stijl, kleurpalet, geen tekst-in-image). Gebruik wanneer Juan banners, hero images, social posts of featured images nodig heeft.
trigger: /banner-prompt
---

# /banner-prompt

Imagen 3 prompts volgens CLAUDE.md §8.

## Usage

```
/banner-prompt <type> <onderwerp>
```

`<type>`:
- `featured` — 1200×630 (blog header, social share)
- `hero` — 1920×600 (website hero)
- `square` — 1080×1080 (Instagram, Facebook)
- `leaderboard` — 728×90 (display ads)

## Prompt template

```
Photorealistic [scene description], [Dutch residential context],
warm natural lighting, no text, no logos, no watermarks,
color palette: warm white #F8F5F0, soft green #7BAE7F, blue accent #2E5C8A,
[aspect ratio for type], professional photography, high detail,
[time of day], [weather], [emotion/atmosphere]
NEGATIVE: text, watermark, logo, low quality, cartoon, illustration, americana
```

## Onderwerp library (NEXUS BOS context)

| Onderwerp | Scene |
|---|---|
| Zonnepanelen | Dutch row house with rooftop solar panels, residential street |
| Thuisbatterij | Modern home meterkast with wall-mounted battery unit, clean utility room |
| Energierekening | Family at kitchen table reviewing energy bill on tablet |
| Saldering | Smart meter close-up with energy data display |
| Energieadvies | Professional advisor pointing at solar panel diagram |
| Voltafy product | Clean product shot of battery unit, neutral background |

## Hard rules
- Geen tekst in de image (overlay via CSS/HTML)
- Geen Amerikaanse stijl woningen — altijd NL context
- Geen emojis, geen cartoony stijl
- Realistisch, geen overdreven HDR

## Output
1. Final prompt (kopieerbaar voor Imagen 3 / Gemini)
2. Suggested CSS overlay tekst (3 varianten met `{KEYWORD}` en `{CTA}` placeholders)
3. Alt-text suggestie voor SEO
