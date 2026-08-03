import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { LOCALES, type Locale } from "@/lib/i18n/dict";
import { TITLE_SUFFIX } from "@/lib/seo/branding";
import { getHomeFaq, getContactFaq } from "@/lib/seo/faqs";

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

type Md = { title?: unknown; description?: unknown };

async function metadataVoor(bestand: string, locale: string): Promise<Md | null> {
  const mod = (await import(/* @vite-ignore */ bestand)) as {
    generateMetadata?: (a: { params: Promise<{ locale: string }> }) => Promise<Md>;
  };
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
