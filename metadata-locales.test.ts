import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { LOCALES } from "@/lib/i18n/dict";
import { TITLE_SUFFIX } from "@/lib/seo/branding";

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

const tekst = (v: unknown): string =>
  typeof v === "string" ? v : v && typeof v === "object" && "default" in v
    ? String((v as { default: unknown }).default)
    : String(v ?? "");

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
        const volledig = t.includes("Juan Diaz") ? t : `${t}${TITLE_SUFFIX}`;
        expect(volledig.length, `${route} [${l}]: "${volledig}"`).toBeLessThanOrEqual(60);
      }
    });
  }
});
