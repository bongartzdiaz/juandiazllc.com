---
name: design-quote-card
description: Pull-quote social card (1080×1080) met expert-attributie en functie-titel. Gebruik voor authority-building op LinkedIn — citaten van energieadviseurs, klanten met permission, branche-experts.
trigger: /design-quote-card
---

# /design-quote-card

Quote card met E-E-A-T signaal (autoriteit van geciteerde persoon).

## Usage

```
/design-quote-card "<quote tekst>" --by "<naam>" --role "<functie>" [--photo <url>]
```

## Quote rules
- Max 25 woorden (langer = onleesbaar op klein scherm)
- Eindigt met punt
- Geen sales-pitch ("koop nu de beste batterij")
- Insightful of contrarian, niet generiek
- ALTIJD attributie — anonieme quotes tellen niet als E-E-A-T

## Bron-vereisten
- Geciteerd persoon moet bestaan
- Permission om naam te gebruiken (ook bij klanten)
- Functie/titel verifieerbaar (LinkedIn check)
- Originele bron noteren (interview / podcast / artikel met datum)

## HTML/CSS template

```html
<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Source+Sans+3:ital,wght@1,400&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 1080px; height: 1080px;
  background: #FAF7F2;
  padding: 100px 80px;
  font-family: 'Inter', system-ui;
  display: flex; flex-direction: column; justify-content: space-between;
  position: relative;
}
.quote-mark {
  font: 800 200px/1 'Inter';
  color: #2E7D5F33;
  position: absolute;
  top: 60px; left: 60px;
}
.quote {
  font: 400 italic 38px/1.4 'Source Sans 3';
  color: #1A1F1B;
  max-width: 880px;
  margin-top: 80px;
  z-index: 1;
}
.attribution {
  display: flex; align-items: center; gap: 24px;
  border-top: 1px solid #E5E1D8;
  padding-top: 32px;
}
.photo {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: #E5E1D8;
  background-size: cover; background-position: center;
}
.who { display: flex; flex-direction: column; gap: 4px; }
.name {
  font: 700 22px/1 'Inter';
  color: #1A1F1B;
}
.role {
  font: 500 16px/1.3 'Inter';
  color: #5A615C;
}
.brand {
  position: absolute; bottom: 40px; right: 60px;
  font: 700 14px/1 'Inter';
  color: #2E7D5F;
}
</style></head>
<body>
  <div class="quote-mark">"</div>
  <div class="quote">{QUOTE}</div>
  <div class="attribution">
    <div class="photo" style="background-image: url('{PHOTO_URL}');"></div>
    <div class="who">
      <div class="name">{NAME}</div>
      <div class="role">{ROLE}</div>
    </div>
  </div>
  <div class="brand">helpmijbesparen.nl</div>
</body></html>
```

## Compliance check
- [ ] Permission van geciteerd persoon (schriftelijk aanwezig?)
- [ ] Quote letterlijk (geen paraphrase als citaat)
- [ ] Functie verifieerbaar
- [ ] Datum van originele uitspraak achterhouden
- [ ] Geen prijsgaranties
- [ ] Geen concurrent-bashing in quote

## Type quotes (sterke kandidaten)
- Energieadviseurs / installateurs (eigen team)
- Onderzoekers TNO / PBL (publiek)
- Politici over saldering (publiek statement)
- Klant-cases (alleen met expliciete permission)

## Vermijden
- Anonieme "tevreden klant"
- Quote uit boek zonder licentie
- Quote uit gesloten Facebook-groep
- Klant-quote zonder permission, ook al positief

## Hard rules
- Permission > pretty design
- Bron-traceerbaar (logboek note: wie zei dit, wanneer, waarom)
- Foto persoon optioneel — placeholder als geen permission op foto
- File: PNG 1080×1080

## Memory check
Lees: reference_hmb_brand. Bewaar permission in vault `Mr Diaz/Resources/permissions/<naam>.md`.
