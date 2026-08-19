import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { LOCALES, type Locale } from "@/lib/i18n/dict";
import { TITLE_SUFFIX } from "@/lib/seo/branding";
import { getHomeFaq, getContactFaq, getServicesFaq } from "@/lib/seo/faqs";

/* ---------------------------------------------------------------
   Metadata per taal — de gate
   ---------------------------------------------------------------
   WAAROM DIT BESTAAT

   Op 2026-08-02 gemeten op productie: ongeveer 127 van de 136 niet-Engelse
   URL's serveerden een ENGELSE <title> en <meta description>. De zichtbare
   tekst was wél vertaald, dus van de voorkant viel er niets op — alleen Google
   en de AI-crawlers zagen een Engelse pagina op /nl, /de en /es.

   De bestaande i18n-gate (npm run i18n:check) ving dit niet: die vergelijkt
   sleutels in dict.ts, en metadata staat in generateMetadata.

   Deze test roept generateMetadata rechtstreeks aan — geen server, geen build.
   Draait daarmee in de bestaande test-job mee, zonder extra CI-tijd.
   --------------------------------------------------------------- */

const APP_DIR = join(process.cwd(), "app", "[locale]");

// Pagina's achter een login of zonder publiek doel. Die worden niet
// geïndexeerd, dus een Engelse titel doet daar geen kwaad. Bewust een expliciete
// lijst en geen patroon: zo moet iedere uitzondering een keer opgeschreven
// worden in plaats van er stilzwijgend in te glijden.
const GEEN_PUBLIEK_DOEL = new Set(["login", "dashboard", "app", "status"]);

/** Alle statische routes onder app/[locale] (dus zonder [param] in het pad). */
function statischeRoutes(): { route: string; bestand: string }[] {
  const uit: { route: string; bestand: string }[] = [];
  const loop = (dir: string) => {
    for (const naam of readdirSync(dir)) {
      const pad = join(dir, naam);
      if (statSync(pad).isDirectory()) {
        if (naam.startsWith("[")) continue; // dynamische routes: zie de test onderaan
        loop(pad);
      } else if (naam === "page.tsx") {
        const rel = relative(APP_DIR, dir).split(sep).filter(Boolean);
        if (rel.some((s) => GEEN_PUBLIEK_DOEL.has(s))) continue;
        uit.push({ route: "/" + rel.join("/"), bestand: pad });
      }
    }
  };
  loop(APP_DIR);
  return uit.sort((a, b) => a.route.localeCompare(b.route));
}

type Md = {
  title?: unknown;
  description?: unknown;
  openGraph?: { images?: unknown } & Record<string, unknown>;
};

type RouteModule = {
  generateMetadata?: (a: { params: Promise<{ locale: string }> }) => Promise<Md>;
};

/* De routemodules worden hieronder in drie describe-blokken gebruikt, samen
   twaalf keer per route. Werden ze per aanroep geïmporteerd, dan betaalde de
   eerste assertie die toevallig als eerste draaide de volledige transformkosten
   van dat paginamoduul — inclusief alles wat de pagina zelf binnenhaalt.

   Dat was geen theoretisch bezwaar. Met een koude vite-cache viel `/` om op
   `Test timed out in 5000ms` (gemeten 5207ms; in CI en warm liep dezelfde test
   in milliseconden). De homepage sleept de Globe met d3-geo en topojson mee,
   /contact het formulier. Twee zware modulegrafen tegen de standaarddrempel van
   vijf seconden, dus de suite was soms rood zonder dat er iets mis was.

   De drempel verhogen zou dat verbergen. Hier wordt de last verplaatst naar
   waar hij hoort: één keer inladen in de opzet, met een ruime hooktimeout. Elke
   test meet daarna alleen nog zijn eigen assertie. */
const modules = new Map<string, RouteModule>();

async function metadataVoor(bestand: string, locale: string): Promise<Md | null> {
  const mod = modules.get(bestand);
  if (!mod) throw new Error(`routemoduul niet ingeladen: ${bestand}`);
  if (typeof mod.generateMetadata !== "function") return null;
  return mod.generateMetadata({ params: Promise.resolve({ locale }) });
}

// Next.js accepteert de titel als string of als object met `absolute` /
// `default` / `template`. Zonder deze uitpakking wordt zo'n object
// "[object Object]" — dat is 15 tekens en glipt langs de lengtecontrole heen,
// en het is voor elke taal hetzelfde dus ook langs de vertaalcontrole.
const tekst = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    for (const sleutel of ["absolute", "default"] as const) {
      if (sleutel in v) return String((v as Record<string, unknown>)[sleutel]);
    }
  }
  return String(v ?? "");
};

const routes = statischeRoutes();
const anderTalen = LOCALES.filter((l) => l !== "en");

beforeAll(async () => {
  await Promise.all(
    routes.map(async ({ bestand }) => {
      modules.set(bestand, (await import(/* @vite-ignore */ bestand)) as RouteModule);
    }),
  );
}, 120_000);

describe("metadata is per taal geschreven", () => {
  it("vindt statische routes om te controleren", () => {
    expect(routes.length).toBeGreaterThan(5);
  });

  for (const { route, bestand } of routes) {
    it(`${route} — titel en beschrijving verschillen per taal`, async () => {
      const en = await metadataVoor(bestand, "en");
      if (!en) return; // geen generateMetadata: niets te controleren

      const enTitel = tekst(en.title);
      const enDesc = tekst(en.description);

      for (const l of anderTalen) {
        const md = await metadataVoor(bestand, l);
        expect(md, `${route} geeft geen metadata voor ${l}`).toBeTruthy();

        const t = tekst(md!.title);
        const d = tekst(md!.description);

        // Gelijk aan het Engels betekent: niet vertaald. Dat is precies het gat
        // dat op 2026-08-02 op 127 URL's zat.
        expect(t, `${route} heeft dezelfde titel in ${l} als in en`).not.toBe(enTitel);
        if (enDesc && enDesc !== "undefined") {
          expect(d, `${route} heeft dezelfde beschrijving in ${l} als in en`).not.toBe(enDesc);
        }
      }
    });
  }
});

/* ---------------------------------------------------------------
   FAQ per taal

   Gemeten op 2026-08-03: /en, /nl, /de en /es serveerden identieke Engelse
   FAQ-vragen, zowel zichtbaar als in de FAQPage-JSON-LD. Sector-FAQ's waren
   wél vertaald — de home- en contactset niet.

   Dit weegt zwaarder dan gewone paginatekst: het is precies wat AI-overzichten
   citeren, en het stond in structured data op pagina's die zichzelf `lang="nl"`
   noemen. Vandaar een eigen gate.
   --------------------------------------------------------------- */
describe("FAQ is per taal geschreven", () => {
  const sets: [string, (l: Locale) => { q: string; a: string }[]][] = [
    ["home", getHomeFaq],
    ["contact", getContactFaq],
    ["services", getServicesFaq],
  ];

  for (const [naam, haal] of sets) {
    it(`${naam} — vragen en antwoorden verschillen per taal`, () => {
      const en = haal("en");
      expect(en.length).toBeGreaterThan(2);

      for (const l of anderTalen) {
        const vertaald = haal(l);
        expect(vertaald.length, `${naam}-FAQ mist items in ${l}`).toBe(en.length);

        for (const [i, item] of vertaald.entries()) {
          expect(item.q, `${naam}-FAQ vraag ${i + 1} is in ${l} gelijk aan en`).not.toBe(en[i].q);
          expect(item.a, `${naam}-FAQ antwoord ${i + 1} is in ${l} gelijk aan en`).not.toBe(en[i].a);
          // De bron zegt: onder de 300 tekens, anders kapt de citatie
          // midden in een zin af. Duits en Spaans lopen daar het eerst tegenaan.
          expect(item.a.length, `${naam}-FAQ antwoord ${i + 1} [${l}] is te lang`).toBeLessThanOrEqual(360);
        }
      }
    });
  }
});

describe("titellengte", () => {
  for (const { route, bestand } of routes) {
    it(`${route} — titels blijven onder 60 tekens in elke taal`, async () => {
      for (const l of LOCALES) {
        const md = await metadataVoor(bestand, l);
        if (!md) continue;
        const t = tekst(md.title);
        if (!t || t === "undefined") continue;
        // Google kapt rond de 60 tekens. Het achtervoegsel komt uit de
        // layout-template en telt mee in wat de zoeker ziet, dus het wordt hier
        // uit dezelfde constante gelezen — anders meet de gate een ander
        // achtervoegsel dan er verstuurd wordt.
        //
        // Tot 2026-08-02 stond hier `t.includes("Juan Diaz") ? t : ...`. Dat is
        // een gok naar intentie in plaats van een meting van gedrag: in Next.js
        // bepaalt de VORM of de template wordt toegepast, niet de inhoud.
        // `title: "..."` en `title.default` krijgen het achtervoegsel, alleen
        // `title.absolute` ontsnapt eraan. Elke titel met de merknaam erin viel
        // daardoor buiten deze controle — juist de langste titels dus.
        const absoluut =
          !!md.title && typeof md.title === "object" && "absolute" in md.title;
        const volledig = absoluut ? t : `${t}${TITLE_SUFFIX}`;
        expect(volledig.length, `${route} [${l}]: "${volledig}"`).toBeLessThanOrEqual(60);
      }
    });
  }
});

describe("deelafbeelding", () => {
  /* -------------------------------------------------------------
     WAAROM DEZE GATE BESTAAT

     Gemeten op productie 2026-08-12, alle 176 sitemap-URL's opgehaald:
     92 pagina's serveerden GEEN og:image, terwijl twitter:card overal
     "summary_large_image" beloofde. Daaronder de homepage, /pricing,
     /contact en elke sectorpagina — precies wat in outreach gedeeld
     wordt. Elke deling toonde een kale link.

     De oorzaak is niet een vergeten regel maar een samenvoegregel:
     Next voegt metadata ONDIEP samen, dus een pagina die `openGraph`
     declareert om `locale` te zetten, gooit `images` van de layout
     erboven weg. Zeventien pagina's deden dat.

     Daarom controleert deze test elke statische route afzonderlijk,
     en niet de layout: overerving is juist wat hier niet werkt.
     ------------------------------------------------------------- */
  for (const { route, bestand } of routes) {
    it(`${route} — houdt een og:image in elke taal`, async () => {
      for (const l of LOCALES) {
        const md = await metadataVoor(bestand, l);
        if (!md) continue;
        // Geen openGraph-declaratie is prima: dan erft de pagina die van
        // de layout, inclusief images. Declareert de pagina hem wél, dan
        // moet de afbeelding er zelf in staan.
        if (!md.openGraph) continue;
        const images = (md.openGraph as { images?: unknown }).images;
        expect(
          Array.isArray(images) && images.length > 0,
          `${route} [${l}]: openGraph is gedeclareerd zonder images — ` +
            `dat overschrijft de afbeelding uit de layout. Zet OG_IMAGES erin.`,
        ).toBe(true);
      }
    });
  }
});
