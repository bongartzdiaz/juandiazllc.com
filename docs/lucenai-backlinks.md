# Backlinks naar lucenai.eu — wat er eerst moet

**Gemeten op 2026-08-20.** Alles hieronder komt uit losse HTTP- en
DNS-verzoeken tegen publieke adressen; niets is uit het geheugen of uit een
eerdere sessie overgenomen. Waar een cijfer staat, staat erbij hoe het gemeten
is.

---

## 0. Eerst: twee adressen, één merknaam

De vraag ging over "de lucenai site". Er zijn er twee, en ze verschillen
volledig.

| adres | wat het is |
|---|---|
| `lucen.ai` | geparkeerd. `https://` antwoordt niet (geen certificaat), `http://` geeft 302 naar `www.lucen.ai`, en dat is een CNAME naar `parkingpage.namecheap.com`. Er staat een MX, dus post kán aankomen. |
| `lucenai.eu` | de echte site. 200 over TLS, `www` 301 naar de apex, WordPress 7.0.2 op LiteSpeed, Yoast, Google Workspace-mail, en er staat al een `google-site-verification`-TXT. |

Dit is geen detail: **deze repo kent alleen de eerste.** Tot #196 stonden er
drie CTA's op `/pricing` die naar een mailadres op dat geparkeerde domein
wezen. Wie "de lucenai site" zegt en `lucen.ai` bedoelt, verwijst naar een
parkeerpagina.

---

## 1. Waarom backlinks nu nog niet de eerste zet zijn

De sitemap van `lucenai.eu` telt **16 URL's**. Uitgesplitst:

| soort | aantal | wat het is |
|---|---|---|
| echte pagina's | 3 | `/`, `/about/`, `/contact/` |
| demo-artikelen | 9 | `/blog-post-title-1/` t/m `-9/`, alle negen met de titel "Blog Post Title", auteur "Hash Varsani", datum 15 september 2025, met als tekst letterlijk `Blog post excerpt [1-2 lines]` |
| thema-restanten | 2 | `/?page_id=2` (WordPress' "Sample Page") en `/global-styles/` |
| archieven van de demo's | 2 | `/category/blog/` en `/author/hashadmin/` |

**Elf van de zestien indexeerbare URL's zijn demo-inhoud.** Alle negen
artikelen dragen dezelfde titel, en die titel eindigt op een losse `%` —
"Blog Post Title - Lucen AI %", een kapot Yoast-titelsjabloon. `robots.txt`
staat alles toe en de sitemap draagt ze allemaal.

Een backlink is een stem voor een adres. Naar een site waar tweederde van de
inhoud placeholder is, is dat een stem die je niet terugkrijgt. Opruimen kost
een uur; links verdienen kost maanden.

**Drie andere dingen die eerst dicht horen, alle drie gemeten:**

1. **De homepage noemt een ander bedrijf.** In het blok "AI Automation Built
   for Real Estate and Hospitality" staat: *"Philanthropy AI fits naturally
   into your existing workflow…"*. Eén keer in de zichtbare tekst, tegen vier
   keer "Lucen AI". Dat is achtergebleven kopij van een ander product.
2. **Er is geen `<meta name="description">` op de homepage.** Wel een
   `og:description`, en die bevat de volledige paginatekst — enkele duizenden
   tekens in plaats van één zin. Google schrijft dan zelf een omschrijving, en
   sociale voorvertoningen worden onleesbaar.
3. **Er staat een cijfer zonder bron:** *"Research shows 78% of customers buy
   from the first responder."* Dezelfde regel die in deze repo geldt
   (`docs/claims.md`: een cijfer heeft een bron of het wordt niet
   gepubliceerd) hoort daar ook te gelden, juist op een pagina die
   geloofwaardigheid moet opbouwen.

---

## 2. Wat er in deze repo wél is gedaan

De twee sites kenden elkaar niet. `juandiazllc.com` noemde Lucen AI nergens,
en `lucenai.eu/about` noemt **"Juan Stefan Bongartz Diaz — Co-Founder | CTO"**
voluit zonder terug te linken. Dat is een ontbrekende rand tussen twee knopen
die over dezelfde persoon gaan, en precies het soort signaal waar het
entiteitsspel uit `docs/seo-geo-plan.md` §2 op draait.

Deze PR legt de rand van deze kant:

- **`affiliation` in het `Person`-schema op `/about`** — naam en adres uit
  `AFFILIATIE_NAAM` / `AFFILIATIE_URL` in `lib/seo/branding.ts`.
- **Een zichtbare link**, één zin, in vier talen. Schema alleen is een
  bewering; een echte link is een verwijzing.
- **Bereikbaarheidscontrole** in `lib/seo/venture-adressen.ts`
  (`controleerEntiteitsAdressen`), die in de dagelijkse productie-audit
  draait. Reden: een `sameAs`- of `affiliation`-adres dat 404 geeft is geen
  ontbrekend signaal maar een mislukte controle — dezelfde reden waarom de
  dode X-handle uit `ORG_SAME_AS` is gehaald en waarom `philly.juandiazllc.com`
  in #188 sneuvelde.

**Niet in `sameAs`.** Dat veld zegt "dit adres beschrijft dezelfde entiteit".
`lucenai.eu` beschrijft een bedrijf met drie oprichters, niet deze persoon.
Verkeerd signaal is erger dan minder signaal.

Wat dit waard is, eerlijk: **één link vanaf een domein zonder autoriteit.** De
SEO-waarde is bijna nul. De entiteitswaarde is echt maar bescheiden — het
maakt een verband expliciet dat een crawler anders moet raden.

---

## 3. De volgorde

| | wat | wie |
|---|---|---|
| 1 | De negen demo-artikelen, de Sample Page en `/global-styles/` verwijderen (of op `noindex` + uit de sitemap) | operator, WordPress |
| 2 | "Philanthropy AI" op de homepage vervangen door "Lucen AI" | operator |
| 3 | Meta-description schrijven voor `/`, `/about/`, `/contact/`; het Yoast-titelsjabloon repareren (de losse `%`) | operator |
| 4 | Terugkoppelen: op `lucenai.eu/about` de naam van Juan linken naar `https://juandiazllc.com/en/about` | operator |
| 5 | `lucenai.eu` in Search Console zetten en de sitemap indienen | operator |
| 6 | `lucen.ai` doorsturen naar `lucenai.eu` (301, met werkende https), of laten vallen | beslissing |
| 7 | Pas hierna: profielen en vermeldingen buiten de site | operator |

Stap 4 is de belangrijkste van de zeven en kost één minuut. Die pagina noemt
de volledige naamvorm al; een link maakt er een bevestigde vermelding van in
plaats van een toevallige overeenkomst.

---

## 4. Wat ik niet doe

- **Geen geautomatiseerde outreach.** Geen LinkedIn-verzoeken of -DM's, geen
  koude WhatsApp, geen koude e-mail naar Duitsland. Dat zijn vaste grenzen,
  geen voorkeuren.
- **Geen gekochte of geruilde links.** Die werken op korte termijn en kosten
  op lange termijn het domein.
- **Geen belofte over posities of termijnen.** `lucenai.eu` staat niet in
  Search Console, dus er is geen nulpunt. Zonder nulpunt is elke termijn
  verzonnen — zelfde reden als in `docs/seo-geo-plan.md` §0.

---

## 5. De vraag die hierdoor open komt te liggen

`lucenai.eu` richt zich op **vastgoed en horeca** met de belofte dat er omzet
weglekt door trage opvolging. `juandiazllc.com` heeft sectorpagina's én
artikelclusters voor exact diezelfde twee sectoren, met exact dezelfde
diagnose. Twee sites, dezelfde persoon, dezelfde twee markten, dezelfde
belofte.

Een link tussen die twee helpt de entiteit. Hij beantwoordt niet welke van de
twee moet ranken op "automatisering voor makelaars" — daar concurreren ze nu
met elkaar. Dat is een positioneringskeuze voor Juan, Hash en Peter, en geen
SEO-ingreep.
