---
name: lead-status
description: Lookup van een specifieke lead in GoHighLevel + Supabase + WhatsApp historie, met advies voor volgende actie. Gebruik wanneer Juan vraagt naar status van een lead, contact, of klant.
trigger: /lead-status
---

# /lead-status

Lead 360-view voor HMB pipeline volgens CLAUDE.md §5.

## Usage

```
/lead-status <telefoonnummer|email|naam|ghl-id>
/lead-status <id> --history    # toon volledig WhatsApp gesprek
```

## Lookup volgorde
1. GoHighLevel API → contact + pipeline status + tags
2. Supabase `leads` tabel → AI bot context, kwalificatie data
3. WhatsApp historie → laatste N berichten
4. Meta Ads → bron campagne (account 932039344875575)

## Output format

```
LEAD: [naam] | [telefoon] | [email]
GHL ID: [id]
Bron: [campagne / form / direct]
Eerste contact: [datum]
Laatste activiteit: [datum + actie]

═══ KWALIFICATIE ═══
Koopwoning: [ja/nee/onbekend]
Zonnepanelen: [ja/nee/onbekend]
Verbruik kWh/jaar: [N/onbekend]
Saldering bewustzijn: [hoog/middel/laag]

═══ PIPELINE STATUS ═══
GHL stage: [Gekwalificeerd / Afwijzing / Terugbellen / Buitendienst gepland]
Tags: [lijst]
Eigenaar (sales): [persoon]

═══ WHATSAPP ═══
Berichten verzonden: N
Replies ontvangen: N
Laatste 3 berichten: [snippet]
Bot fase: [opener / qualify / urgentie / cta-call / objection / nee-N]
Nee-teller: [0-3]

═══ ADVIES VOLGENDE ACTIE ═══
[Concrete aanbeveling]:
- Wat: [actie]
- Waarom: [redenering op basis van data]
- Wie: [bot / Juan / adviseur / buitendienst]
- Wanneer: [direct / N uur / N dagen]
```

## Hard rules
- Bij nee-teller = 3: ALTIJD adviseren "stop, niet meer benaderen"
- Bij `Buitendienst gepland`: NIET opnieuw bellen vanuit bot
- Bij geen reactie >7 dagen: terugbel-script aanbieden
