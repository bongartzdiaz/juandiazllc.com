---
name: supabase-publish
description: Promote artikel van pending_review naar published in Supabase met confirm prompt + status check. Gebruik wanneer Juan een artikel goedkeurt, live wil zetten, of de queue wil afhandelen.
trigger: /supabase-publish
---

# /supabase-publish

Goedkeuren en live zetten van pending_review artikelen volgens CLAUDE.md §11 + §14.

## Usage

```
/supabase-publish <id>             # specifiek artikel
/supabase-publish --all-pending    # ALLES live (vraagt extra confirm)
/supabase-publish --queue          # toon eerst queue, kies dan
```

## Flow

### 1. Pre-publish check
```sql
SELECT id, title_tag, h1, hero_text, status, created_at
FROM articles
WHERE id = <id>;
```
Toon Juan ter bevestiging:
- title_tag (≤60 check)
- h1
- hero_text
- woordenaantal body
- status moet `pending_review` zijn

### 2. Final SEO checklist (één laatste keer)
- title_tag ≤60? meta desc ≤155?
- 5+ interne links aanwezig in body?
- Schema JSON-LD aanwezig?
- Geen prijsgaranties in body?

### 3. Confirm prompt
"Klaar om live te zetten? [j/n]"

### 4. Update query
```sql
UPDATE articles
SET status = 'published',
    published_at = now()
WHERE id = <id>;
```

### 5. Post-publish
- Trigger sitemap regenerate (indien aanwezig)
- Slack notificatie: "✅ Live: [title_tag] — [URL]"
- Optioneel: trigger social post via Designer agent

## --all-pending flow
EXTRA confirmation: "Dit zet N artikelen live. Doorgaan? Type EXACT 'JA ALLES'"

```sql
UPDATE articles
SET status = 'published', published_at = now()
WHERE status = 'pending_review';
```

## Hard rules
- NOOIT zonder explicit confirm publiceren
- NOOIT title_tag rewriten in deze flow — alleen status update
- Bij failed SEO check: STOP en stuur terug naar Schrijver agent
- Status veld waarden: alleen `pending_review` → `published` toegestaan in deze skill (niet draft → published)
