import { describe, it, expect } from "vitest";
import { VENTURES, getVenture, getVentures, getVentureForTag, localizeVenture, type Venture } from "./ventures";
import { TITLE_SUFFIX, TITLE_BUDGET } from "./seo/branding";
import { LOCALES, type Locale } from "./i18n/dict";

/* Zelfde opzet als sectors.test.ts: eerst het merge-gedrag, daarna een gate
   over de data. Die tweede groep is wat voorkomt dat /nl, /de en /es opnieuw
   dezelfde Engelse titel gaan serveren. */

const VERTAALD: Locale[] = ["nl", "de", "es"];

const basis: Venture = {
  slug: "test",
  name: "Testventure",
  tagline: "Basis-tagline.",
  sector: "Energy",
  sectorSlug: "energy",
  status: "live",
  domain: "test.nl",
  external: "https://test.nl",
  summary: "Basis-samenvatting.",
  story: "Basis-verhaal.",
  phases: [
    { title: "Survey", body: "EN survey." },
    { title: "Build", body: "EN build." },
  ],
  stack: ["Next.js"],
  metrics: [{ label: "Status", value: "Live" }],
  relatedSectors: ["Energy"],
  gradient: "radial-gradient(red, blue)",
};

describe("localizeVenture", () => {
  it("geeft de basis terug als de taal geen vertaling heeft", () => {
    expect(localizeVenture(basis, "de")).toBe(basis);
  });

  it("vervangt kopij en laat de rest staan", () => {
    const v = localizeVenture({ ...basis, i18n: { nl: { tagline: "NL-tagline." } } }, "nl");
    expect(v.tagline).toBe("NL-tagline.");
    expect(v.summary).toBe("Basis-samenvatting.");
  });

  // De vijf fasenamen zijn eigennamen van de methode en zijn in elke taal
  // gelijk; alleen de body vertaalt.
  it("houdt de fasetitel bij de basis en vertaalt alleen de body", () => {
    const v = localizeVenture(
      { ...basis, i18n: { nl: { phases: [{ body: "NL survey." }, { body: "NL build." }] } } },
      "nl",
    );
    expect(v.phases[0].title).toBe("Survey");
    expect(v.phases[0].body).toBe("NL survey.");
    expect(v.phases[1].title).toBe("Build");
  });

  it("raakt naam, stack en structurele velden nooit aan", () => {
    const v = localizeVenture({ ...basis, i18n: { nl: { tagline: "NL." } } }, "nl");
    expect(v.name).toBe("Testventure");
    expect(v.stack).toEqual(["Next.js"]);
    expect(v.slug).toBe("test");
    expect(v.external).toBe("https://test.nl");
    expect(v.status).toBe("live");
  });

  it("muteert de basis niet", () => {
    const bron = { ...basis, i18n: { nl: { phases: [{ body: "NL." }] } } };
    localizeVenture(bron, "nl");
    expect(bron.phases[0].body).toBe("EN survey.");
  });
});

describe("getVenture / getVentures / getVentureForTag", () => {
  it("zonder taal komt de basis terug", () => {
    expect(getVenture("voltafy")?.tagline).toBe("The platform layer.");
    expect(getVentures()).toHaveLength(VENTURES.length);
  });

  it("met taal komt de vertaling terug", () => {
    expect(getVenture("voltafy", "nl")?.tagline).toBe("De platformlaag.");
    expect(getVenture("voltafy", "de")?.tagline).toBe("Die Plattformschicht.");
  });

  it("een onbekende slug geeft undefined", () => {
    expect(getVenture("bestaat-niet", "nl")).toBeUndefined();
  });

  it("de tag-kruislink is taalbewust", () => {
    expect(getVentureForTag("Energy", "es")?.tagline).toBe("La capa de plataforma.");
    expect(getVentureForTag("bestaat-niet", "nl")).toBeUndefined();
  });
});

describe("elke venture is in alle vier de talen af", () => {
  for (const v of VENTURES) {
    describe(v.slug, () => {
      it("heeft een vertaling voor nl, de en es", () => {
        for (const l of VERTAALD) {
          expect(v.i18n?.[l], `${v.slug} mist ${l}`).toBeDefined();
        }
      });

      it("levert vier verschillende titels op", () => {
        const titels = LOCALES.map((l) => {
          const x = getVenture(v.slug, l)!;
          return x.seoTitle ?? `${x.name} — ${x.tagline}`;
        });
        expect(new Set(titels).size, `dubbele titel: ${JSON.stringify(titels)}`).toBe(LOCALES.length);
      });

      it("levert vier verschillende beschrijvingen op", () => {
        const d = LOCALES.map((l) => {
          const x = getVenture(v.slug, l)!;
          return x.seoDescription ?? x.summary;
        });
        expect(new Set(d).size, `dubbele beschrijving: ${JSON.stringify(d)}`).toBe(LOCALES.length);
      });

      // `naam — tagline` liep voor drie van de vijf ventures over de 60
      // tekens die Google toont; vandaar de expliciete seoTitle.
      it("elke titel past binnen het budget dat Google toont", () => {
        for (const l of LOCALES) {
          const x = getVenture(v.slug, l)!;
          const titel = x.seoTitle ?? `${x.name} — ${x.tagline}`;
          expect(titel.length, `${v.slug}/${l} is ${titel.length} tekens: "${titel}"`).toBeLessThanOrEqual(TITLE_BUDGET);
        }
      });

      it("geen enkele titel draagt het merk zelf al", () => {
        for (const l of LOCALES) {
          const titel = getVenture(v.slug, l)!.seoTitle ?? "";
          expect(titel, `${v.slug}/${l}`).not.toContain(TITLE_SUFFIX.trim());
          expect(titel.toLowerCase(), `${v.slug}/${l}`).not.toContain("juan diaz");
        }
      });

      it("vertaalde lijsten hebben dezelfde lengte als de basis", () => {
        for (const l of VERTAALD) {
          const x = getVenture(v.slug, l)!;
          // phases gaat door mergeByIndex, dus de lengte van het resultaat is
          // altijd gelijk; de echte invariant zit in de rauwe vertaaldata.
          expect(v.i18n![l]!.phases, `${v.slug}/${l} phases`).toHaveLength(v.phases.length);
          expect(x.metrics, `${v.slug}/${l} metrics`).toHaveLength(v.metrics.length);
          expect(x.relatedSectors, `${v.slug}/${l} relatedSectors`).toHaveLength(v.relatedSectors.length);
        }
      });

      it("de fasenamen blijven in elke taal gelijk", () => {
        for (const l of VERTAALD) {
          expect(getVenture(v.slug, l)!.phases.map((p) => p.title)).toEqual(v.phases.map((p) => p.title));
        }
      });

      it("geen enkel vertaald veld is nog identiek aan het Engels", () => {
        for (const l of VERTAALD) {
          const x = getVenture(v.slug, l)!;
          expect(x.tagline, `${v.slug}/${l} tagline`).not.toBe(v.tagline);
          expect(x.summary, `${v.slug}/${l} summary`).not.toBe(v.summary);
          expect(x.story, `${v.slug}/${l} story`).not.toBe(v.story);
          for (const [i, p] of x.phases.entries()) {
            expect(p.body, `${v.slug}/${l} fase ${i + 1}`).not.toBe(v.phases[i].body);
          }
        }
      });
    });
  }
});
