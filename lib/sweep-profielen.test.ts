/**
 * Toetst wélke tijdelijke Chrome-profielen `responsive-sweep.mjs` weghaalt.
 *
 * Deze poort bewaakt de keuze, niet de verwijdering. Dat is bewust: de
 * verwijdering zelf raakt de schijf en is alleen te toetsen door hem te laten
 * gebeuren. De keuze is de plek waar het mis kan gaan met gevolgen — één te
 * ruim patroon en dit script wist mappen van iemand anders uit de temp-map.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_LEEFTIJD_MS,
  PROFIEL_PATROON,
  verouderdeProfielen,
} from "../scripts/sweep-profielen.mjs";

const NU = 1_790_200_000_000;
const oud = (msGeleden: number) => `sweep-profiel-${NU - msGeleden}`;
const EIGEN = `sweep-profiel-${NU}`;

describe("verouderdeProfielen", () => {
  it("haalt een profiel weg dat ouder is dan de grens", () => {
    const naam = oud(MAX_LEEFTIJD_MS + 1000);
    expect(verouderdeProfielen([naam], NU, EIGEN)).toEqual([naam]);
  });

  it("laat een profiel staan dat nog binnen de grens valt", () => {
    // Een sweep duurt 12-18 minuten. Een profiel van een uur oud kan dus van
    // een run zijn die nog bezig is; die mag niet onder zijn voeten weg.
    expect(verouderdeProfielen([oud(60 * 60 * 1000)], NU, EIGEN)).toEqual([]);
  });

  it("laat het profiel van de lopende run altijd staan", () => {
    // Zelfs als de klok zou suggereren dat hij oud is.
    expect(verouderdeProfielen([EIGEN], NU + MAX_LEEFTIJD_MS * 2, EIGEN)).toEqual([]);
  });

  it("raakt niets aan dat niet van deze sweep is", () => {
    const vreemden = [
      "chrome-bewijs",
      "sweep-profiel",              // geen stempel
      "sweep-profiel-abc",          // geen cijfers
      "sweep-profiel-123",          // te kort voor een ms-stempel
      `sweep-profiel-${NU}0`,       // 14 cijfers
      `xsweep-profiel-${NU - MAX_LEEFTIJD_MS - 1}`, // voorvoegsel
      "npm-cache",
      "Temp1",
    ];
    expect(verouderdeProfielen(vreemden, NU, EIGEN)).toEqual([]);
  });

  it("laat een stempel uit de toekomst staan", () => {
    // Een verzette systeemklok maakt van "onbekend" geen "oud".
    //
    // De afstand moet GROTER zijn dan de grens, anders toetst dit niets: met
    // een stempel van vijf seconden vooruit blijft de map ook liggen bij
    // `Math.abs(nu - gemaakt)`, en die mutatie overleefde deze test dan ook.
    // Zie feedback_assert_niet_door_het_vangnet.
    const vooruit = `sweep-profiel-${NU + MAX_LEEFTIJD_MS + 60_000}`;
    expect(verouderdeProfielen([vooruit], NU, EIGEN)).toEqual([]);
  });

  it("kiest uit een gemengde map alleen de verouderde eigen profielen", () => {
    const wegA = oud(MAX_LEEFTIJD_MS + 1);
    const wegB = oud(MAX_LEEFTIJD_MS * 10);
    const namen = [wegA, EIGEN, "chrome-bewijs", oud(1000), wegB, "sweep-profiel-xyz"];
    expect(verouderdeProfielen(namen, NU, EIGEN).sort()).toEqual([wegA, wegB].sort());
  });

  it("het patroon eist precies dertien cijfers", () => {
    expect(PROFIEL_PATROON.test(`sweep-profiel-${NU}`)).toBe(true);
    expect(PROFIEL_PATROON.test("sweep-profiel-179020000000")).toBe(false);
    expect(PROFIEL_PATROON.test("sweep-profiel-17902000000000")).toBe(false);
  });
});
