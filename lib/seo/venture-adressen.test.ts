import { describe, it, expect } from "vitest";
import { controleerVentureAdressen } from "./venture-adressen";
import { VENTURES } from "@/lib/ventures";

/* De controle zelf, zonder netwerk. De echte lookup draait alleen in de
 * dagelijkse productie-audit; hier gaat het om de vraag of hij de juiste
 * conclusie trekt uit wat hij terugkrijgt.
 *
 * Het onderscheid dat ertoe doet: ENOTFOUND is een fout (de naam bestaat niet,
 * dat gaat vanzelf niet over), al het andere een waarschuwing. Zonder dat
 * onderscheid staat deze controle af en toe rood door een hapering elders, en
 * dan leer je hem negeren — precies wanneer hij wel ergens voor staat. */

const MET_ADRES = VENTURES.filter((v) => v.external);

const zoektAlles = async () => undefined;
const haaltAlles = async () => ({ ok: true, status: 200 });

function gooit(code: string, veld: "code" | "cause" = "code") {
  return async () => {
    throw veld === "code"
      ? Object.assign(new Error("fout"), { code })
      : Object.assign(new Error("fetch failed"), { cause: { code } });
  };
}

describe("controleerVentureAdressen", () => {
  it("heeft adressen om te controleren", () => {
    // Zonder deze controle zou de gate slagen op een lege lijst, en dat is
    // precies wat er gebeurt als iemand alle domeinen op null zet.
    expect(MET_ADRES.length).toBeGreaterThan(2);
  });

  it("zwijgt als alles bestaat en antwoordt", async () => {
    expect(await controleerVentureAdressen({ zoek: zoektAlles, haal: haaltAlles })).toEqual([]);
  });

  it("noemt een niet-bestaande naam een fout", async () => {
    const uit = await controleerVentureAdressen({ zoek: gooit("ENOTFOUND"), haal: haaltAlles });
    expect(uit).toHaveLength(MET_ADRES.length);
    expect(uit.every((b) => b.ernst === "fout")).toBe(true);
    expect(uit[0].soort).toBe("venture-adres-bestaat-niet");
    expect(uit[0].detail).toContain("bestaat niet in DNS");
  });

  /* De val die de eerste versie van deze controle liet omvallen. Tegen de
   * echte dode host gaf `fetch` hier UND_ERR_CONNECT_TIMEOUT in plaats van
   * ENOTFOUND, dus een controle die alleen naar de fetch-fout keek noemde een
   * verdwenen domein "kan tijdelijk zijn". DNS wordt eerst gevraagd, dus dit
   * blijft een fout. */
  it("blijft een fout ook als de fetch een time-out zou geven", async () => {
    const uit = await controleerVentureAdressen({
      zoek: gooit("ENOTFOUND"),
      haal: gooit("UND_ERR_CONNECT_TIMEOUT", "cause"),
    });
    expect(uit.every((b) => b.ernst === "fout")).toBe(true);
  });

  it("noemt een tijdelijke DNS-hapering een waarschuwing", async () => {
    const uit = await controleerVentureAdressen({ zoek: gooit("EAI_AGAIN"), haal: haaltAlles });
    expect(uit.every((b) => b.ernst === "waarschuwing")).toBe(true);
    expect(uit[0].soort).toBe("venture-adres-onbereikbaar");
  });

  it("noemt een 5xx een waarschuwing, geen fout", async () => {
    const uit = await controleerVentureAdressen({
      zoek: zoektAlles,
      haal: async () => ({ ok: false, status: 503 }),
    });
    expect(uit.every((b) => b.ernst === "waarschuwing")).toBe(true);
    expect(uit[0].soort).toBe("venture-adres-antwoordt-niet");
    expect(uit[0].detail).toContain("503");
  });

  it("noemt een onbereikbare host een waarschuwing als de naam wél bestaat", async () => {
    const uit = await controleerVentureAdressen({
      zoek: zoektAlles,
      haal: gooit("UND_ERR_CONNECT_TIMEOUT", "cause"),
    });
    expect(uit.every((b) => b.ernst === "waarschuwing")).toBe(true);
    expect(uit[0].soort).toBe("venture-adres-onbereikbaar");
    expect(uit[0].detail).toContain("UND_ERR_CONNECT_TIMEOUT");
  });

  it("controleert geen venture zonder adres", async () => {
    // Philly heeft er geen. Zou hij er wel een dragen, dan is dat een fout die
    // ventures.test.ts opvangt — deze controle hoort er niet over te struikelen.
    const zonder = VENTURES.filter((v) => !v.external);
    expect(zonder.length).toBeGreaterThan(0);
    const uit = await controleerVentureAdressen({ zoek: gooit("ENOTFOUND"), haal: haaltAlles });
    for (const v of zonder) {
      expect(uit.some((b) => b.detail.startsWith(v.name))).toBe(false);
    }
  });
});
