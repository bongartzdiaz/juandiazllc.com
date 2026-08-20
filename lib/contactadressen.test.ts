import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/* Poort: elk e-mailadres dat de bezoeker bereikt staat op juandiazllc.com.
 *
 * Op 2026-08-20 wezen drie CTA's op /pricing naar `mailto:hello@lucen.ai` — de
 * Enterprise-tier, de migratiedienst en de "praat met sales"-knop naast de
 * proefperiode. Ze stonden live in alle vier de talen, op een pagina die in de
 * topnav staat en in de sitemap op prioriteit 0,9.
 *
 * Wat er mis mee was, gemeten en niet vermoed:
 *
 *   1. `lucen.ai` is een geparkeerd domein. `https://` geeft een SSL connect
 *      error; `http://` geeft 302 met header `X-Served-By: Namecheap URL
 *      Forward` naar `www.lucen.ai`, en dat is een parking-lander. Er staat een
 *      MX (Namecheap-forwarding), dus post kán aankomen, maar het merk dat de
 *      bezoeker ziet als hij het domein intikt is een te-koop-pagina.
 *   2. Een `mailto:` slaat de leadketen over. Geen rij in `marketing.leads`,
 *      dus geen trigger `leads_notify_new`, dus geen Telegram en geen
 *      ontvangstbevestiging. Het spoor houdt op bij de Plausible-klik. Dat trof
 *      uitgerekend de duurste lead op de site: Enterprise begint bij vijftien
 *      zitplaatsen.
 *   3. Het waren de enige drie afwijkende adressen in de hele repo. Alle
 *      zevenentwintig andere zijn `juan@juandiazllc.com`.
 *
 * DE TWEEDE TEST IS DE STRENGE. Een `mailto:` is per definitie iets waar een
 * bezoeker op klikt, dus die mag nooit buiten het domein wijzen en kent geen
 * uitzonderingen. De eerste test is ruimer — hij ziet ook adressen in comments
 * en placeholders — en heeft daarom wel een uitzonderingenlijst.
 *
 * WAAROM DE UITZONDERINGEN EEN AANTAL DRAGEN. Zonder telling zou de
 * uitzondering voor `hello@lucen.ai` (die alleen nog in de toelichting hierboven
 * bedoeld is) een tweede, échte vermelding in datzelfde bestand stil toelaten.
 * Verandert het aantal, dan valt de poort — ook naar beneden, want dan is de
 * uitzondering zelf achterhaald en hoort hij weg. */

const WORTEL = join(__dirname, "..");
const MAPPEN = ["app", "components", "lib", "scripts"];
const EIGEN_DOMEIN = "juandiazllc.com";

const ADRES = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MAILTO = /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/** Adressen buiten het eigen domein die mogen blijven, met reden en aantal.
 *  Sleutel is `<pad>:<adres>`. Leeg is niet het doel — een placeholder hoort
 *  hier gewoon in te staan. */
const UITZONDERINGEN: Record<string, { aantal: number; reden: string }> = {
  "app/[locale]/pricing/page.tsx:hello@lucen.ai": {
    aantal: 1,
    reden:
      "Staat alleen in de toelichting boven TIERS die uitlegt waarom hij weg is. " +
      "Geen href, geen zichtbare tekst.",
  },
  "components/ContactForm.tsx:you@domain.com": {
    aantal: 1,
    reden: "Placeholder in het e-mailveld, geen bestaand adres.",
  },
  "components/NewsletterForm.tsx:you@domain.com": {
    aantal: 1,
    reden: "Placeholder in het e-mailveld, geen bestaand adres.",
  },
};

function bestanden(map: string): string[] {
  const uit: string[] = [];
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) {
      if (naam === "node_modules" || naam === ".next") continue;
      uit.push(...bestanden(pad));
    } else if (/\.(tsx?|mjs)$/.test(naam) && !/\.test\.tsx?$/.test(naam)) {
      uit.push(pad);
    }
  }
  return uit;
}

type Vondst = { pad: string; adres: string; regel: number };

function verzamel(patroon: RegExp, groep: 0 | 1): Vondst[] {
  const uit: Vondst[] = [];
  for (const map of MAPPEN) {
    for (const pad of bestanden(join(WORTEL, map))) {
      const relatief = relative(WORTEL, pad).split(sep).join("/");
      const regels = readFileSync(pad, "utf8").split("\n");
      regels.forEach((regel, i) => {
        for (const m of regel.matchAll(new RegExp(patroon.source, "g"))) {
          uit.push({ pad: relatief, adres: m[groep], regel: i + 1 });
        }
      });
    }
  }
  return uit;
}

const domeinVan = (adres: string) => adres.split("@")[1].toLowerCase();

describe("contactadressen in geleverde code", () => {
  it("de scan vindt het eigen adres — anders meet hij niets", () => {
    // Zonder deze controle zou een kapotte regex alle tests groen maken.
    const eigen = verzamel(ADRES, 0).filter((v) => domeinVan(v.adres) === EIGEN_DOMEIN);
    expect(eigen.length).toBeGreaterThan(20);
  });

  it("geen mailto: wijst buiten juandiazllc.com", () => {
    const buiten = verzamel(MAILTO, 1)
      .filter((v) => domeinVan(v.adres) !== EIGEN_DOMEIN)
      .map((v) => `${v.pad}:${v.regel} → ${v.adres}`);

    expect(
      buiten,
      "Een mailto is een link die de bezoeker aanklikt. Hij slaat bovendien de " +
        "leadketen over: geen rij in marketing.leads, geen Telegram, geen " +
        "bevestiging. Wijs naar /contact?interest=<slug> in plaats hiervan.",
    ).toEqual([]);
  });

  it("elk vreemd adres heeft een uitzondering met reden en klopt in aantal", () => {
    const geteld = new Map<string, number>();
    for (const v of verzamel(ADRES, 0)) {
      if (domeinVan(v.adres) === EIGEN_DOMEIN) continue;
      const sleutel = `${v.pad}:${v.adres}`;
      geteld.set(sleutel, (geteld.get(sleutel) ?? 0) + 1);
    }

    const onbekend = [...geteld.keys()].filter((s) => !(s in UITZONDERINGEN));
    expect(onbekend, "Adres buiten juandiazllc.com zonder uitzondering").toEqual([]);

    for (const [sleutel, { aantal }] of Object.entries(UITZONDERINGEN)) {
      expect(geteld.get(sleutel) ?? 0, `aantal voor ${sleutel}`).toBe(aantal);
    }
  });

  it("elke uitzondering wijst naar een bestand dat bestaat", () => {
    // Anders blijft een uitzondering rondslingeren nadat het bestand weg is, en
    // dekt hij later stil iets anders af.
    const weg = Object.keys(UITZONDERINGEN)
      .map((s) => s.slice(0, s.lastIndexOf(":")))
      .filter((pad) => !existsSync(join(WORTEL, pad)));
    expect(weg).toEqual([]);
  });
});
