import { describe, it, expect } from "vitest";
import {
  MAIL_NRS,
  DAGEN_NA_TOESTEMMING,
  GESPREK_PAD,
  UITSCHRIJF_PAD,
  afmeldLink,
  bouwMail,
  bepaalVolgende,
  markeerVerzonden,
  REEKS_BRON,
  gesprekPad,
  taalVan,
} from "./scan-reeks";
import { SCAN_BRON, TOESTEMMING_TEKST } from "@/lib/scan-opvang";
import { SCAN_TALEN, TOESTEMMING_TEKSTEN } from "@/lib/lekkage-scan-taal";

/* Wat de toestemmingstekst belooft, moet de kopij en de planning waarmaken:
   hooguit drie mails, elk met een afmeldlink, geen bedragen. Deze poort leest
   de gebouwde mails en niet de bestandstekst, dus een euroteken in een
   toelichting blijft onzichtbaar en een euroteken in de kopij niet. */

const TOKEN = "0f1e2d3c-4b5a-4978-8765-43210fedcba9";
const invoer = { lekken: 3, unsub_token: TOKEN };

const DAG = 24 * 60 * 60 * 1000;
const consent = new Date("2026-09-19T08:00:00Z");
const metaMet = (extra: Record<string, unknown> = {}) => ({
  consent_at: consent.toISOString(),
  unsub_token: TOKEN,
  ...extra,
});

describe("de belofte uit de toestemmingstekst", () => {
  it("telt precies drie mails, en de toestemmingstekst zegt dat ook", () => {
    expect(MAIL_NRS).toEqual([1, 2, 3]);
    expect(TOESTEMMING_TEKST).toMatch(/drie mails/);
  });

  it("elke mail draagt de afmeldlink, in tekst én html", () => {
    for (const nr of MAIL_NRS) {
      const m = bouwMail(nr, invoer);
      const link = afmeldLink(TOKEN);
      expect(m.text).toContain(link);
      expect(m.html).toContain(`href="${link}"`);
      expect(link).toContain(UITSCHRIJF_PAD);
      expect(link).toContain(encodeURIComponent(TOKEN));
    }
  });

  it("geen bedrag of percentage in welke mail dan ook", () => {
    const verboden = /€|\beuro\b|\d\s?%|\bprocent\b/i;
    for (const nr of MAIL_NRS) {
      for (const lekken of [null, 0, 1, 3]) {
        const m = bouwMail(nr, { lekken, unsub_token: TOKEN });
        expect(m.onderwerp).not.toMatch(verboden);
        expect(m.text).not.toMatch(verboden);
      }
    }
    // Positieve controle: het patroon vindt wél iets als het er staat.
    expect("dat scheelt €200").toMatch(verboden);
    expect("ongeveer 12 %").toMatch(verboden);
  });

  it("mail 3 leidt naar het gesprek met de herkenbare interest-parameter", () => {
    const m = bouwMail(3, invoer);
    expect(m.text).toContain(GESPREK_PAD);
    expect(GESPREK_PAD).toContain("interest=lekkage-scan");
    expect(bouwMail(1, invoer).text).not.toContain(GESPREK_PAD);
  });

  it("personaliseert alleen op het aantal lekken, en escapet html", () => {
    expect(bouwMail(1, { lekken: 1, unsub_token: TOKEN }).text).toContain("één lek");
    expect(bouwMail(1, { lekken: 0, unsub_token: TOKEN }).text).toContain("niets lekken");
    expect(bouwMail(1, { lekken: null, unsub_token: TOKEN }).text).toContain("een uitslag");
    const m = bouwMail(1, { lekken: 3, unsub_token: "a<b" });
    expect(m.html).not.toContain("a<b");
    expect(m.html).toContain("a%3Cb");
  });

  it("de bron voor de selectie is dezelfde als die van de inschrijving", () => {
    expect(REEKS_BRON).toBe(SCAN_BRON);
  });
});

/* Sinds 2026-09-20 bestaat de reeks in drie talen. De belofte is per taal
   dezelfde, dus de poort hierboven loopt hier nog eens over en en de. De
   Nederlandse tak hierboven blijft staan zoals hij was: zonder `taal` moet
   bouwMail Nederlands geven, want elke rij van vóór die datum heeft geen
   locale in zijn metadata. */
describe("dezelfde belofte in en en de", () => {
  const VERBODEN = /€|\beuro\b|\d\s?%|\bprocent\b|\bpercent\b|\bProzent\b/i;
  const DRIE = { nl: /drie mails/, en: /three emails/, de: /drei E-Mails/ } as const;

  it("de toestemmingstekst belooft in elke taal drie mails", () => {
    for (const taal of SCAN_TALEN) {
      expect(TOESTEMMING_TEKSTEN[taal], taal).toMatch(DRIE[taal]);
    }
    expect(TOESTEMMING_TEKSTEN.nl).toBe(TOESTEMMING_TEKST);
  });

  for (const taal of ["en", "de"] as const) {
    describe(taal, () => {
      const in_ = (lekken: number | null) => ({ lekken, unsub_token: TOKEN, taal });

      it("drie mails, elk met afmeldlink in tekst én html", () => {
        for (const nr of MAIL_NRS) {
          const m = bouwMail(nr, in_(3));
          const link = afmeldLink(TOKEN);
          expect(m.text).toContain(link);
          expect(m.html).toContain(`href="${link}"`);
        }
      });

      it("geen bedrag of percentage", () => {
        for (const nr of MAIL_NRS) {
          for (const lekken of [null, 0, 1, 3]) {
            const m = bouwMail(nr, in_(lekken));
            expect(m.onderwerp).not.toMatch(VERBODEN);
            expect(m.text).not.toMatch(VERBODEN);
          }
        }
      });

      it("is werkelijk vertaald: geen Nederlandse kopij, geen open placeholder", () => {
        const nl = bouwMail(1, { lekken: 3, unsub_token: TOKEN });
        for (const nr of MAIL_NRS) {
          const m = bouwMail(nr, in_(3));
          expect(m.onderwerp).not.toBe(bouwMail(nr, { lekken: 3, unsub_token: TOKEN }).onderwerp);
          expect(m.text).not.toContain("afmelden");
          expect(m.text).not.toMatch(/\{[a-zA-Z_]+\}/);
          expect(m.html).not.toMatch(/\{[a-zA-Z_]+\}/);
        }
        expect(nl.text).toContain("lek");
      });

      it("mail 3 leidt naar het gesprek in dezelfde taal", () => {
        const pad = gesprekPad(taal);
        expect(pad).toBe(`/${taal}/contact?interest=lekkage-scan`);
        expect(bouwMail(3, in_(3)).text).toContain(pad);
        expect(bouwMail(3, in_(3)).text).not.toContain(GESPREK_PAD);
        expect(bouwMail(1, in_(3)).text).not.toContain(pad);
      });
    });
  }

  it("taalVan: alleen de drie scantalen, alles anders is Nederlands", () => {
    expect(taalVan({ locale: "en" })).toBe("en");
    expect(taalVan({ locale: "de" })).toBe("de");
    expect(taalVan({ locale: "nl" })).toBe("nl");
    expect(taalVan({ locale: "es" })).toBe("nl");
    expect(taalVan({})).toBe("nl");
    expect(taalVan({ locale: 7 })).toBe("nl");
  });

  it("zonder taal is de mail Nederlands — de rijen van vóór 2026-09-20", () => {
    expect(bouwMail(1, invoer).text).toBe(bouwMail(1, { ...invoer, taal: "nl" }).text);
  });
});

describe("planning", () => {
  it("dag 0 → mail 1, dag 3 → mail 2, dag 7 → mail 3, daarna niets", () => {
    expect(DAGEN_NA_TOESTEMMING).toEqual({ 1: 0, 2: 3, 3: 7 });
    let meta: Record<string, unknown> = metaMet();
    const nu0 = new Date(consent.getTime());
    expect(bepaalVolgende(meta, nu0)).toBe(1);
    meta = markeerVerzonden(meta, 1, nu0);
    expect(bepaalVolgende(meta, nu0)).toBeNull();
    expect(bepaalVolgende(meta, new Date(consent.getTime() + 2 * DAG))).toBeNull();
    const nu3 = new Date(consent.getTime() + 3 * DAG);
    expect(bepaalVolgende(meta, nu3)).toBe(2);
    meta = markeerVerzonden(meta, 2, nu3);
    const nu7 = new Date(consent.getTime() + 7 * DAG);
    expect(bepaalVolgende(meta, nu7)).toBe(3);
    meta = markeerVerzonden(meta, 3, nu7);
    expect(bepaalVolgende(meta, new Date(consent.getTime() + 30 * DAG))).toBeNull();
  });

  it("een gemiste dag haalt de laagste mail eerst in, niet de hoogste", () => {
    const laat = new Date(consent.getTime() + 10 * DAG);
    expect(bepaalVolgende(metaMet(), laat)).toBe(1);
  });

  it("afgemeld → nooit meer iets, ook met openstaande mails", () => {
    const meta = metaMet({ unsubscribed_at: "2026-09-20T00:00:00Z" });
    expect(bepaalVolgende(meta, new Date(consent.getTime() + 10 * DAG))).toBeNull();
  });

  it("zonder bruikbare consent_at is er geen begin", () => {
    expect(bepaalVolgende({ unsub_token: TOKEN }, consent)).toBeNull();
    expect(bepaalVolgende(metaMet({ consent_at: "gisteren" }), consent)).toBeNull();
  });

  it("vóór de toestemming wordt er niets verstuurd", () => {
    expect(bepaalVolgende(metaMet(), new Date(consent.getTime() - 1))).toBeNull();
  });

  it("markeerVerzonden geeft een nieuw object en laat de invoer staan", () => {
    const meta = metaMet();
    const uit = markeerVerzonden(meta, 1, consent);
    expect(meta).not.toHaveProperty("verzonden");
    expect(uit.verzonden).toEqual({ 1: consent.toISOString() });
    expect(uit.consent_at).toBe(meta.consent_at);
  });
});
