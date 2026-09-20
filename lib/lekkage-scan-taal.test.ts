import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BLOKKEN, VRAGEN } from "./lekkage-scan";
import {
  SCAN_PAD,
  SCAN_TALEN,
  TEKSTEN,
  TOESTEMMING_TEKSTEN,
  VERTALING,
  isScanTaal,
  vragenVoor,
} from "./lekkage-scan-taal";
import { ENKELE_TAAL } from "./i18n/enkele-taal";

/* De EN/DE-scan is een vertaling van de Nederlandse, niet een tweede scan.
   Dat is alleen waar zolang de drie talen dezelfde vragen dragen, in dezelfde
   volgorde, met dezelfde metingen en dezelfde grens. Deze poort meet dat
   tegen de bron in plaats van het aan te nemen. */

const WORTEL = join(__dirname, "..");

/* Woorden die in de vertaling terecht gelijk zijn aan het Nederlands. Elk
   staat hier met naam, zodat een niet-vertaalde regel niet stil meelift op
   "dat is vast een cognaat". */
const COGNAAT: Record<"en" | "de", Set<string>> = {
  en: new Set(),
  de: new Set(["blok.D", "ja"]), // Stapelkosten, Ja
};
const DOC = readFileSync(join(WORTEL, "docs", "lead-magnet.md"), "utf8");

describe("vragenVoor", () => {
  it("nl geeft de bron terug, ongewijzigd", () => {
    const { vragen, blokken } = vragenVoor("nl");
    expect(vragen).toEqual([...VRAGEN]);
    expect(blokken).toEqual([...BLOKKEN]);
  });

  for (const taal of ["en", "de"] as const) {
    describe(taal, () => {
      const { vragen, blokken } = vragenVoor(taal);

      it("dezelfde ids in dezelfde volgorde, dezelfde blokken", () => {
        expect(vragen.map((v) => v.id)).toEqual(VRAGEN.map((v) => v.id));
        expect(vragen.map((v) => v.blok)).toEqual(VRAGEN.map((v) => v.blok));
        expect(blokken.map((b) => b.id)).toEqual(BLOKKEN.map((b) => b.id));
      });

      it("elke vraag is werkelijk vertaald", () => {
        for (let i = 0; i < vragen.length; i++) {
          expect(vragen[i].vraag, vragen[i].id).not.toBe(VRAGEN[i].vraag);
          expect(vragen[i].kost, vragen[i].id).not.toBe(VRAGEN[i].kost);
          expect(vragen[i].vraag.trim().length, vragen[i].id).toBeGreaterThan(10);
        }
        for (let i = 0; i < blokken.length; i++) {
          if (COGNAAT[taal].has("blok." + blokken[i].id)) continue;
          expect(blokken[i].naam, blokken[i].id).not.toBe(BLOKKEN[i].naam);
        }
      });

      it("dezelfde metingen, dezelfde grens met dezelfde waarde en bron", () => {
        for (let i = 0; i < vragen.length; i++) {
          const a = VRAGEN[i].meting;
          const b = vragen[i].meting;
          expect(!!b, vragen[i].id).toBe(!!a);
          if (!a || !b) continue;
          expect(vragen[i].omgekeerd).toBe(VRAGEN[i].omgekeerd);
          expect(b.opdracht).not.toBe(a.opdracht);
          expect(!!b.grens).toBe(!!a.grens);
          if (a.grens && b.grens) {
            // De waarde is een meting en vertaalt niet; de duiding en de
            // bronregel wel, maar de bron zelf moet dezelfde blijven.
            expect(b.grens.waarde).toBe(a.grens.waarde);
            expect(b.grens.duiding).not.toBe(a.grens.duiding);
            expect(b.grens.bron).toContain("Harvard Business Review, 2011");
            expect(a.grens.bron).toContain("Harvard Business Review, 2011");
          }
        }
      });

      it("de vertaling heeft geen vraag die de bron niet kent", () => {
        const ids = new Set(VRAGEN.map((v) => v.id));
        for (const id of Object.keys(VERTALING[taal].vragen)) {
          expect(ids.has(id), `${taal} vertaalt ${id}, die niet bestaat`).toBe(true);
        }
      });

      it("elke vraag staat letterlijk in docs/lead-magnet.md", () => {
        // Dezelfde afspraak als voor de Nederlandse vragen: het document is
        // wat een partner of Juan leest, en het mag niet stil uit de pas lopen.
        for (const v of vragen) {
          expect(DOC, `${taal} ${v.id}`).toContain(v.vraag);
        }
      });
    });
  }
});

describe("de kopij om de vragen heen", () => {
  it("drie talen, en isScanTaal kent precies die drie", () => {
    expect(SCAN_TALEN).toEqual(["nl", "en", "de"]);
    for (const t of SCAN_TALEN) expect(isScanTaal(t)).toBe(true);
    expect(isScanTaal("es")).toBe(false);
    expect(isScanTaal("")).toBe(false);
  });

  it("elk pad in SCAN_PAD draagt zijn taal in ENKELE_TAAL", () => {
    for (const taal of SCAN_TALEN) {
      const pad = SCAN_PAD[taal];
      expect(ENKELE_TAAL[pad], pad).toBeDefined();
      expect(ENKELE_TAAL[pad].locales, `${pad} draagt ${taal} niet`).toContain(taal);
    }
    // En omgekeerd: geen scan-route draagt een taal zonder teksten.
    for (const pad of new Set(Object.values(SCAN_PAD))) {
      for (const l of ENKELE_TAAL[pad].locales) {
        expect(isScanTaal(l), `${pad} draagt ${l} zonder TEKSTEN`).toBe(true);
      }
    }
  });

  it("elke taal heeft elke tekst, en geen twee talen delen er een", () => {
    const sleutels = Object.keys(TEKSTEN.nl) as (keyof typeof TEKSTEN.nl)[];
    for (const taal of ["en", "de"] as const) {
      for (const k of sleutels) {
        const nl = TEKSTEN.nl[k];
        const x = TEKSTEN[taal][k];
        expect(x, `${taal}.${k}`).toBeDefined();
        if (typeof nl === "string" && typeof x === "string") {
          expect(x.trim().length, `${taal}.${k} is leeg`).toBeGreaterThan(0);
          if (COGNAAT[taal].has(k)) continue;
          expect(x, `${taal}.${k} is niet vertaald`).not.toBe(nl);
        }
      }
    }
    expect(TEKSTEN.en.kop).not.toBe(TEKSTEN.de.kop);
  });

  it("de toestemmingstekst is per taal die van TEKSTEN", () => {
    for (const taal of SCAN_TALEN) {
      expect(TOESTEMMING_TEKSTEN[taal]).toBe(TEKSTEN[taal].toestemming);
    }
  });

  it("Duits spreekt met Sie, Engels noemt geen 'je'", () => {
    const de = JSON.stringify(TEKSTEN.de) + JSON.stringify(vragenVoor("de").vragen);
    expect(de).not.toMatch(/\b(du|dein|deine|dich|dir)\b/i);
    expect(de).toMatch(/\b(Sie|Ihr|Ihre|Ihnen)\b/);
    const en = JSON.stringify(TEKSTEN.en) + JSON.stringify(vragenVoor("en").vragen);
    expect(en).not.toMatch(/\b(je|jij|jouw|een|niet)\b/);
  });
});
