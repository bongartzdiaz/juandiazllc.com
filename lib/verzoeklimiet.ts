/* Eén emmer voor alle publieke routes.
   ─────────────────────────────────────────────────────────────
   Tot 2026-08-21 droegen app/api/log-error en app/api/vitals elk hun
   eigen kopie van dit token-bucket-algoritme, met eigen constanten en
   een eigen `allow()`. Twee kopieën van één contract is precies hoe ze
   uit elkaar groeien: de ene kreeg een capaciteit van 20 en 0,5/s, de
   andere 60 en 2/s, en geen van beide wist van de ander. csp-report en
   newsletter/confirm hadden helemaal niets.

   Twee dingen die de losse kopieën fout deden en hier zijn opgelost:

   1. DE MAP LEKTE. Elk nieuw IP kreeg een entry en er werd er nooit een
      opgeruimd. Op een lambda die lang blijft leven groeit dat door.
      `opruimen()` gooit emmers weg die weer helemaal vol zijn — die
      dragen per definitie geen informatie meer, want een onbekende
      sleutel begint ook vol.

   2. DE BODY WAS ONBEGRENSD. `req.text()` leest wat er komt. Vercel kapt
      rond 4,5 MB af, maar dat is hun grens en niet de onze, en lokaal of
      op een andere host geldt hij niet. `leesBegrensd()` zet er een eigen
      plafond op.

   GRENS, eerlijk opgeschreven: `maxSleutels` begrenst het geheugen, niet
   de handhaving. Duwt iemand de map vol met sleutels die allemaal op nul
   tokens staan, dan is er geen "minst gestrafte" meer aan te wijzen en valt
   er alsnog iemand af — mogelijk degene die de straf had. Bruikbaar is dat
   niet: de sleutel komt uit x-forwarded-for en die zet Vercel zelf, dus je
   hebt net zoveel échte bron-IP's nodig als sleutels. Tegen een botnet was
   een limiet per IP nooit de verdediging. Er staat een test op die dit
   gedrag vastlegt in plaats van het te verzwijgen.

   Bewust in het geheugen en niet in Redis: dit telt per lambda-instantie.
   Bij horizontaal schalen telt elke instantie apart, dus de effectieve
   limiet is capaciteit × instanties. Voor een sink die alleen tegen een
   op hol geslagen client hoeft te beschermen is dat genoeg. Zodra er een
   echte aanvaller is in plaats van een kapotte pagina, hoort dit naar een
   gedeelde teller. */

export type Emmer = { tokens: number; laatst: number }

export interface Limiet {
  /** True als dit verzoek door mag. Verbruikt dan één token. */
  toestaan(sleutel: string): boolean
  /** Aantal emmers dat nu wordt bijgehouden — alleen voor tests. */
  omvang(): number
}

export interface LimietOpties {
  /** Hoeveel verzoeken in een burst. */
  capaciteit: number
  /** Hoe snel de emmer weer vult. */
  perSeconde: number
  /** Boven dit aantal emmers wordt er opgeruimd. */
  maxSleutels?: number
  /** Injecteerbaar zodat een test niet hoeft te wachten. */
  nu?: () => number
}

const STANDAARD_MAX_SLEUTELS = 10_000

export function maakLimiet(opties: LimietOpties): Limiet {
  const { capaciteit, perSeconde } = opties
  const maxSleutels = opties.maxSleutels ?? STANDAARD_MAX_SLEUTELS
  const nu = opties.nu ?? (() => Date.now())
  const emmers = new Map<string, Emmer>()

  function opruimen(): void {
    const t = nu()
    for (const [sleutel, e] of emmers) {
      const verstreken = (t - e.laatst) / 1000
      if (Math.min(capaciteit, e.tokens + verstreken * perSeconde) >= capaciteit) {
        emmers.delete(sleutel)
      }
    }
    // Nog steeds te vol: dan is alles actief en moet er alsnog iets weg.
    // NIET de oudste — dat was de eerste versie hiervan, en die was fout.
    // De oudste emmer is juist degene die het langst geweigerd wordt, dus
    // wie een straf had kon die wegspoelen door genoeg nieuwe sleutels te
    // verzinnen. We gooien nu weg wat het dichtst bij vol zit: die dragen
    // de minste informatie, want een onbekende sleutel begint ook vol.
    if (emmers.size > maxSleutels) {
      const teveel = emmers.size - maxSleutels
      const opVoorraad = [...emmers.entries()]
        .map(([sleutel, e]) => {
          const verstreken = (t - e.laatst) / 1000
          return [sleutel, Math.min(capaciteit, e.tokens + verstreken * perSeconde)] as const
        })
        .sort((a, b) => b[1] - a[1])
      for (let i = 0; i < teveel; i++) emmers.delete(opVoorraad[i][0])
    }
  }

  return {
    toestaan(sleutel: string): boolean {
      const t = nu()
      const e = emmers.get(sleutel) ?? { tokens: capaciteit, laatst: t }
      const verstreken = (t - e.laatst) / 1000
      e.tokens = Math.min(capaciteit, e.tokens + verstreken * perSeconde)
      e.laatst = t
      if (e.tokens < 1) {
        emmers.set(sleutel, e)
        return false
      }
      e.tokens -= 1
      emmers.set(sleutel, e)
      if (emmers.size > maxSleutels) opruimen()
      return true
    },
    omvang: () => emmers.size,
  }
}

/** Het IP waar we op tellen. Achter Vercel is x-forwarded-for gezet; de
    eerste waarde is de client. Ontbreekt hij, dan vallen alle verzoeken op
    één sleutel — strenger, niet losser, en dat is de goede kant om te falen. */
export function sleutelUitVerzoek(req: { headers: { get(n: string): string | null } }): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'onbekend'
}

export class TeGroot extends Error {
  constructor(public readonly bytes: number) {
    super(`body groter dan ${bytes} bytes`)
    this.name = 'TeGroot'
  }
}

/** Leest de body maar stopt bij maxBytes. Gooit TeGroot als het plafond
    wordt geraakt, zodat de aanroeper 413 kan geven in plaats van de rest
    van de pijplijn met een enorme string op te zadelen. */
export async function leesBegrensd(req: Request, maxBytes: number): Promise<string> {
  const lengte = req.headers.get('content-length')
  if (lengte && Number(lengte) > maxBytes) throw new TeGroot(maxBytes)

  const stroom = req.body
  if (!stroom) return ''

  const lezer = stroom.getReader()
  const stukken: Uint8Array[] = []
  let totaal = 0
  try {
    for (;;) {
      const { done, value } = await lezer.read()
      if (done) break
      if (!value) continue
      totaal += value.byteLength
      if (totaal > maxBytes) throw new TeGroot(maxBytes)
      stukken.push(value)
    }
  } finally {
    lezer.releaseLock()
  }

  const alles = new Uint8Array(totaal)
  let pos = 0
  for (const s of stukken) {
    alles.set(s, pos)
    pos += s.byteLength
  }
  return new TextDecoder().decode(alles)
}
