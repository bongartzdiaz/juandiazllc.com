/* ─────────────────────────────────────────────────────────────
   De toegangspoort van de lead-functies, als pure functie.

   WAAROM APART. `index.ts` opent met `Deno.serve(...)` op moduleniveau en
   leest env-vars, dus tsc (die `supabase/functions` uitsluit) en vitest kunnen
   hem niet aanraken. Dit bestand kent geen enkele Deno-global en leest geen
   env: de waarde wordt aan de rand gelezen en hier binnengegeven. Daardoor is
   de beslissing wél te importeren, te typechecken en écht uit te voeren in een
   test — dezelfde naad als `initSentry(injected?)` in lib/sentry.ts.

   TWEE BYTE-IDENTIEKE KOPIEEN, EEN PER FUNCTIEMAP. `lead-notify/auth.ts` is
   byte voor byte dit bestand. Dat is geen slordigheid maar de goedkoopste
   vorm die aantoonbaar uitrolt: een edge function wordt per map gebundeld,
   en de enige uitrolweg die hier bewezen werkt (`deploy_edge_function` met
   een expliciete bestandslijst) is die van `lead-acknowledge`, dat
   `./auth.ts` uit zijn eigen map importeert. Een `../_shared/auth.ts` is de
   officiele Supabase-vorm en waarschijnlijk prima, maar dat is hier niet te
   meten zolang het datavlak 402 geeft, en bron in de repo bewijst niets over
   gedeployde code.

   Twee bestanden die een feit dragen lopen uit elkaar. Daarom eist
   `lib/lead-notify-auth.test.ts` byte-gelijkheid, precies zoals de
   `docs-sync`-job dat doet voor CLAUDE.md en AGENTS.md.

   FAIL-CLOSED. Zonder bruikbare gedeelde sleutel gaat er niets door. Tot
   2026-08-25 stond hier het omgekeerde: een ontbrekende sleutel logde een
   waarschuwing en liet de aanroep dóór. Gemeten op productie kwam een POST
   zonder auth tot `400 invalid-json` — dus voorbij de poort, tegen een functie
   die met de service-role-sleutel draait.

   DRIE UITKOMSTEN, en dat is opzet, niet twee:

     sleutel onbruikbaar                 -> 503 not-configured
     sleutel goed, header fout/afwezig   -> 401 unauthorized
     beide goed                          -> door

   Eén blanco 401 op de eerste twee is goedkoper om te schrijven en duurder om
   te diagnosticeren: dan is "de functie staat niet ingesteld" niet te
   onderscheiden van "jij stuurde de verkeerde sleutel", terwijl juist dat
   onderscheid met een onschadelijke probe te meten moet zijn. Het huis doet
   dit al zo — `/api/cal` antwoordt 503 `not-configured`, `diaz-appsumo-redeem`
   503 `service-unavailable`.

   "Altijd 200" uit de kop van index.ts blijft gelden voor het zakelijke pad ná
   de poort. Voor de poort zelf gold het al niet: die gaf 405 en 401.
   ───────────────────────────────────────────────────────────── */

/** Ondergrens voor de gedeelde sleutel.

    Niet cosmetisch. De oude controle was `auth.includes(SECRET)` achter een
    truthy-check, dus met een sleutel van één teken kwam elke header die dat
    teken toevallig bevatte erdoor. Dat is set-but-unusable — dezelfde klasse
    als een SENTRY_DSN die op de letterlijke tekst `optional` staat.

    Gemeten op 2026-08-25 is de sleutel in de vault van
    `wbgiouuifqhasedncysw` 44 tekens (base64url, 32 bytes), dus deze drempel
    kan niet omvallen op de echte waarde. Bewust ruim daaronder: een te strenge
    controle zet de keten uit op het moment dat hij aan hoort te gaan, en dat
    is een ergere fout dan de fout die hier gerepareerd wordt. */
export const MIN_SLEUTELLENGTE = 16

export type AuthOordeel =
  | { ok: true }
  | { ok: false; status: 503; error: 'not-configured' }
  | { ok: false; status: 401; error: 'unauthorized' }

/** Is dit een sleutel waarmee überhaupt iets af te schermen valt? */
export function sleutelIsBruikbaar(sleutel: string | null | undefined): boolean {
  if (typeof sleutel !== 'string') return false
  return sleutel.trim().length >= MIN_SLEUTELLENGTE
}

/** De token uit een `Authorization`-header, of null als die er niet in zit.

    Exacte vorm in plaats van de oude substring-match: `includes` liet élke
    header door die de sleutel ergens bevatte, ook als er van alles omheen
    stond. */
export function bearerToken(header: string | null | undefined): string | null {
  if (typeof header !== 'string') return null
  const m = /^Bearer[ \t]+(\S.*)$/i.exec(header.trim())
  return m ? m[1].trim() : null
}

/** Vergelijking zonder vroege uitstap op het eerste verschillende teken.

    De lengte lekt wel — dat doet `crypto.timingSafeEqual` ook, die gooit bij
    ongelijke lengte. Datzelfde patroon staat al in `handtekeningKlopt` voor
    /api/cal. */
export function gelijkInConstanteTijd(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  if (ea.length !== eb.length) return false
  let verschil = 0
  for (let i = 0; i < ea.length; i++) verschil |= ea[i] ^ eb[i]
  return verschil === 0
}

/** Mag dit verzoek door? Zie de kopnotitie voor waarom er drie uitkomsten zijn. */
export function beoordeelAuth(
  sleutel: string | null | undefined,
  header: string | null | undefined,
): AuthOordeel {
  if (!sleutelIsBruikbaar(sleutel)) return { ok: false, status: 503, error: 'not-configured' }

  const token = bearerToken(header)
  if (token === null) return { ok: false, status: 401, error: 'unauthorized' }

  return gelijkInConstanteTijd(token, (sleutel as string).trim())
    ? { ok: true }
    : { ok: false, status: 401, error: 'unauthorized' }
}
