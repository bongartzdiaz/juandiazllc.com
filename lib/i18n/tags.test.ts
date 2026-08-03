import { describe, it, expect } from "vitest";
import { tagLabel, tagSlug } from "./tags";
import { DICT, LOCALES, translate, type Locale } from "./dict";
import { POSTS } from "@/lib/insights";
import { SIGNALS } from "@/lib/signals";
import { TITLE_BUDGET } from "@/lib/seo/branding";

const VERTAALD: Locale[] = ["nl", "de", "es"];

describe("tagSlug", () => {
  it("maakt een URL-segment van een tagnaam", () => {
    expect(tagSlug("Energy")).toBe("energy");
    expect(tagSlug("Real estate")).toBe("real-estate");
  });

  it("knipt leidende en sluitende streepjes weg", () => {
    expect(tagSlug("  Field ops  ")).toBe("field-ops");
    expect(tagSlug("R&D")).toBe("r-d");
  });

  it("is idempotent op een al geslugde waarde", () => {
    expect(tagSlug(tagSlug("Real estate"))).toBe("real-estate");
  });
});

describe("tagLabel", () => {
  it("geeft het vertaalde label", () => {
    expect(tagLabel("nl", "real-estate", "Real estate")).toBe("Vastgoed");
    expect(tagLabel("de", "hospitality", "Hospitality")).toBe("Hotellerie");
    expect(tagLabel("es", "systems", "Systems")).toBe("Sistemas");
  });

  // translate() geeft de sleutelnaam terug als hij nergens bestaat. Zonder
  // deze terugval zou "tag.label.onbekend" op de pagina komen te staan.
  it("valt terug op de canonieke tag als de sleutel niet bestaat", () => {
    expect(tagLabel("nl", "verzonnen-tag", "Verzonnen tag")).toBe("Verzonnen tag");
  });

  it("zet nooit een sleutelnaam op de pagina", () => {
    for (const l of LOCALES) {
      expect(tagLabel(l, "bestaat-echt-niet", "Terugval")).not.toContain("tag.label.");
    }
  });
});

/* Gate: elke tag die daadwerkelijk in gebruik is moet in alle vier de
   woordenboeken een label hebben. Zonder dit valt een nieuwe tag stil terug
   op het Engels — precies het gat dat deze fase dichtzet. */
const GEBRUIKTE_TAGS = [
  ...new Set([...POSTS.map((p) => p.tag), ...SIGNALS.map((s) => s.tag)]),
].sort();

describe("elke tag in gebruik heeft een label in vier talen", () => {
  it("vindt de tags die de site echt gebruikt", () => {
    // Faalt zodra iemand een tag toevoegt of verwijdert, zodat de lijst
    // hieronder niet stilletjes achterloopt op de content.
    expect(GEBRUIKTE_TAGS).toEqual([
      "Design",
      "Energy",
      "Growth",
      "Hospitality",
      "Method",
      "Operations",
      "Real estate",
      "Strategy",
      "Systems",
    ]);
  });

  for (const tag of GEBRUIKTE_TAGS) {
    const slug = tagSlug(tag);
    // Bewust rechtstreeks op DICT en niet via translate(): die valt per
    // ontwerp terug op het Engels, dus een ontbrekende Duitse sleutel zou
    // gewoon de Engelse waarde teruggeven en de test zou slagen. Alleen het
    // woordenboek zelf weet of de sleutel er echt staat.
    it(`${tag} — label staat in alle vier de woordenboeken`, () => {
      for (const l of LOCALES) {
        const sleutel = `tag.label.${slug}`;
        expect(Object.hasOwn(DICT[l], sleutel), `${sleutel} ontbreekt in ${l}`).toBe(true);
        expect(DICT[l][sleutel]?.trim(), `${sleutel} is leeg in ${l}`).toBeTruthy();
      }
    });

    it(`${tag} — de vier insight-titels verschillen en passen`, () => {
      const titels = LOCALES.map((l) =>
        translate(l, "insights.tag.meta.title").replace("{tag}", tagLabel(l, slug, tag)),
      );
      expect(new Set(titels).size, `dubbele titel: ${JSON.stringify(titels)}`).toBe(LOCALES.length);
      for (const [i, t] of titels.entries()) {
        expect(t.length, `${LOCALES[i]}: "${t}" is ${t.length} tekens`).toBeLessThanOrEqual(TITLE_BUDGET);
      }
    });
  }
});

describe("de sjablonen dragen hun plaatsaanduidingen", () => {
  for (const l of LOCALES) {
    it(`${l} — {tag} en {n} staan in de juiste sleutels`, () => {
      expect(translate(l, "insights.tag.meta.title")).toContain("{tag}");
      expect(translate(l, "insights.tag.meta.description")).toContain("{tag}");
      expect(translate(l, "insights.tag.h1")).toContain("{tag}");
      expect(translate(l, "signals.tag.desc")).toContain("{tag}");
      for (const k of ["insights.tag.lede.one", "insights.tag.lede.many"]) {
        expect(translate(l, k), k).toContain("{tag}");
        expect(translate(l, k), k).toContain("{n}");
      }
    });

    it(`${l} — de h1 houdt het <em>-accent`, () => {
      expect(translate(l, "insights.tag.h1")).toMatch(/<em>\{tag\}<\/em>/);
    });

    if (VERTAALD.includes(l)) {
      it(`${l} — enkelvoud en meervoud verschillen`, () => {
        expect(translate(l, "insights.tag.lede.one")).not.toBe(translate(l, "insights.tag.lede.many"));
      });
    }
  }
});
