import { describe, it, expect } from "vitest";
import { SECTORS, getSector, getSectors, localizeSector, type Sector } from "./sectors";
import { TITLE_SUFFIX, TITLE_BUDGET } from "./seo/branding";
import { LOCALES, type Locale } from "./i18n/dict";

/* Twee soorten tests staan hier naast elkaar.
   1. Het merge-gedrag van localizeSector — pure functie, klassieke unit tests.
   2. Een inhoudsgate over SECTORS zelf. Die tweede groep test geen code maar
      data: hij faalt zodra iemand een sector toevoegt zonder vertaling, of een
      titel schrijft die buiten wat Google toont valt. Dat is precies het gat
      waardoor 26 pagina's in vier talen dezelfde Engelse titel serveerden. */

const VERTAALD: Locale[] = ["nl", "de", "es"];

const basis: Sector = {
  slug: "test",
  name: "Test sector",
  tagline: "Basis-tagline.",
  summary: "Basis-samenvatting.",
  seoTitle: "Basis SEO-titel",
  seoDescription: "Basis SEO-beschrijving.",
  leaks: [{ title: "Lek", body: "Lektekst." }],
  playbook: [{ phase: "Survey", applied: "Toegepast." }],
  proof: [
    { title: "Voltafy", body: "Bewijstekst.", href: "/work/voltafy" },
    { title: "Zonder link", body: "Geen href." },
  ],
  tags: ["Een", "Twee"],
  cta: "Basis-cta?",
  gradient: "radial-gradient(red, blue)",
};

describe("localizeSector", () => {
  it("geeft de basis ongewijzigd terug als de taal geen vertaling heeft", () => {
    expect(localizeSector(basis, "de")).toBe(basis);
    expect(localizeSector({ ...basis, i18n: { nl: { name: "x" } } }, "de")).toEqual(
      expect.objectContaining({ name: "Test sector" }),
    );
  });

  it("vervangt kopij-velden door de vertaling", () => {
    const s = localizeSector({ ...basis, i18n: { nl: { name: "Testsector", cta: "NL-cta?" } } }, "nl");
    expect(s.name).toBe("Testsector");
    expect(s.cta).toBe("NL-cta?");
  });

  it("laat niet-vertaalde velden op de basiswaarde staan", () => {
    const s = localizeSector({ ...basis, i18n: { nl: { name: "Testsector" } } }, "nl");
    expect(s.tagline).toBe("Basis-tagline.");
    expect(s.summary).toBe("Basis-samenvatting.");
  });

  it("raakt structurele velden nooit aan", () => {
    const s = localizeSector({ ...basis, i18n: { nl: { name: "Testsector" } } }, "nl");
    expect(s.slug).toBe("test");
    expect(s.gradient).toBe(basis.gradient);
  });

  // De reden dat proof per index gemerged wordt in plaats van vervangen: href
  // is een route, geen tekst. Een vertaling die hem weglaat mag de kruislink
  // naar /work niet stukmaken.
  it("behoudt proof[].href uit de basis terwijl titel en body vertaald worden", () => {
    const s = localizeSector(
      { ...basis, i18n: { nl: { proof: [{ title: "Voltafy", body: "NL-bewijs." }, { title: "Zonder link", body: "Ook NL." }] } } },
      "nl",
    );
    expect(s.proof[0].href).toBe("/work/voltafy");
    expect(s.proof[0].body).toBe("NL-bewijs.");
    expect(s.proof[1].href).toBeUndefined();
  });

  it("houdt de basis-href overeind als de vertaalde proof-array korter is", () => {
    const s = localizeSector({ ...basis, i18n: { nl: { proof: [{ title: "Voltafy", body: "NL-bewijs." }] } } }, "nl");
    expect(s.proof).toHaveLength(2);
    expect(s.proof[1].body).toBe("Geen href.");
    expect(s.proof[0].href).toBe("/work/voltafy");
  });

  // Zonder de defined()-filter zou {...basis, ...{name: undefined}} de naam
  // wissen in plaats van hem te laten staan.
  it("een expliciet undefined veld wist de basiswaarde niet", () => {
    const s = localizeSector({ ...basis, i18n: { nl: { name: undefined, cta: "NL-cta?" } } }, "nl");
    expect(s.name).toBe("Test sector");
    expect(s.cta).toBe("NL-cta?");
  });

  it("muteert de basis niet", () => {
    const bron = { ...basis, i18n: { nl: { name: "Testsector", proof: [{ title: "V", body: "B" }] } } };
    localizeSector(bron, "nl");
    expect(bron.name).toBe("Test sector");
    expect(bron.proof[0].body).toBe("Bewijstekst.");
  });
});

describe("getSector / getSectors", () => {
  it("zonder taal komt de basis terug", () => {
    expect(getSector("energy")?.name).toBe("Energy & solar");
    expect(getSectors()).toHaveLength(SECTORS.length);
  });

  it("met taal komt de vertaling terug", () => {
    expect(getSector("energy", "nl")?.name).toBe("Energie & zon");
    expect(getSector("energy", "de")?.name).toBe("Energie & Solar");
  });

  it("een onbekende slug geeft undefined, ook mét taal", () => {
    expect(getSector("bestaat-niet", "nl")).toBeUndefined();
  });
});

describe("elke sector is in alle vier de talen af", () => {
  for (const s of SECTORS) {
    describe(s.slug, () => {
      it("heeft een vertaling voor nl, de en es", () => {
        for (const l of VERTAALD) {
          expect(s.i18n?.[l], `${s.slug} mist ${l}`).toBeDefined();
        }
      });

      // Dit is de auditfout zelf: vier URL's, één titel.
      it("levert vier verschillende titels op", () => {
        const titels = LOCALES.map((l) => {
          const v = getSector(s.slug, l)!;
          return v.seoTitle ?? `${v.name} — ${v.tagline}`;
        });
        expect(new Set(titels).size, `dubbele titel: ${JSON.stringify(titels)}`).toBe(LOCALES.length);
      });

      it("levert vier verschillende beschrijvingen op", () => {
        const d = LOCALES.map((l) => {
          const v = getSector(s.slug, l)!;
          return v.seoDescription ?? v.summary;
        });
        expect(new Set(d).size, `dubbele beschrijving: ${JSON.stringify(d)}`).toBe(LOCALES.length);
      });

      // Google toont ~60 tekens. layout.tsx plakt TITLE_SUFFIX erachter, dus
      // de sector mag maximaal TITLE_BUDGET gebruiken.
      it("elke titel past binnen het budget dat Google toont", () => {
        for (const l of LOCALES) {
          const v = getSector(s.slug, l)!;
          const titel = v.seoTitle ?? `${v.name} — ${v.tagline}`;
          expect(titel.length, `${s.slug}/${l} is ${titel.length} tekens: "${titel}"`).toBeLessThanOrEqual(TITLE_BUDGET);
        }
      });

      // De oude seoTitles eindigden op "| Juan Diaz", waardoor het merk twee
      // keer in de <title> stond zodra de layout TITLE_SUFFIX toevoegde.
      it("geen enkele titel draagt het merk zelf al", () => {
        for (const l of LOCALES) {
          const v = getSector(s.slug, l)!;
          const titel = v.seoTitle ?? "";
          expect(titel, `${s.slug}/${l}`).not.toContain(TITLE_SUFFIX.trim());
          expect(titel.toLowerCase(), `${s.slug}/${l}`).not.toContain("juan diaz");
        }
      });

      // Een kortere vertaalde array zou een leak of fase stil laten vallen.
      it("vertaalde lijsten hebben dezelfde lengte als de basis", () => {
        for (const l of VERTAALD) {
          const v = getSector(s.slug, l)!;
          expect(v.leaks, `${s.slug}/${l} leaks`).toHaveLength(s.leaks.length);
          expect(v.playbook, `${s.slug}/${l} playbook`).toHaveLength(s.playbook.length);
          expect(v.proof, `${s.slug}/${l} proof`).toHaveLength(s.proof.length);
          expect(v.tags, `${s.slug}/${l} tags`).toHaveLength(s.tags.length);
        }
      });

      it("geen enkel vertaald veld is nog identiek aan het Engels", () => {
        for (const l of VERTAALD) {
          const v = getSector(s.slug, l)!;
          expect(v.summary, `${s.slug}/${l} summary is niet vertaald`).not.toBe(s.summary);
          expect(v.tagline, `${s.slug}/${l} tagline is niet vertaald`).not.toBe(s.tagline);
          expect(v.cta, `${s.slug}/${l} cta is niet vertaald`).not.toBe(s.cta);
        }
      });
    });
  }
});
