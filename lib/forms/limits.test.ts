import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { capField, isPlausibleEmail, FIELD_LIMITS } from "./limits";

/* -------------------------------------------------------------------------
   Hardening-gate voor de publieke formulier-input.

   Gevonden 2026-08-12 met de payload-lens uit PayloadsAllTheThings: de lead-
   en subscribe-actions schreven vrije tekst zonder bovengrens naar tabellen
   met een anon-INSERT-policy en ongelimiteerde text-kolommen. Deze test
   bewijst dat de begrenzing daadwerkelijk begrenst — met echte grote en vuile
   payloads, en zonder een rij te schrijven of een melding af te vuren.
   ------------------------------------------------------------------------- */

describe("capField — begrenzing", () => {
  it("kapt elk veld af op zijn eigen cap, ongeacht de invoerlengte", () => {
    for (const field of Object.keys(FIELD_LIMITS) as (keyof typeof FIELD_LIMITS)[]) {
      const reus = "A".repeat(1_000_000); // 1 MB — het scenario dat de tabel liet opzwellen
      const uit = capField(reus, field);
      expect(uit.length, field).toBe(FIELD_LIMITS[field]);
    }
  });

  it("laat normale invoer ongemoeid", () => {
    expect(capField("  Acme Solar  ", "company")).toBe("Acme Solar");
    expect(capField("Ik zoek hulp bij mijn energie-administratie.", "message"))
      .toBe("Ik zoek hulp bij mijn energie-administratie.");
  });

  it("strijkt een null-byte weg — die zou Postgres text weigeren", () => {
    expect(capField("abc\u0000def", "name")).toBe("abcdef");
  });

  it("geeft een lege string voor lege of afwezige invoer", () => {
    expect(capField("", "source")).toBe("");
    expect(capField(null, "source")).toBe("");
    expect(capField(undefined, "source")).toBe("");
    expect(capField("   ", "name")).toBe("");
  });
});

describe("isPlausibleEmail — formaat én lengte", () => {
  it("aanvaardt een gewoon adres", () => {
    expect(isPlausibleEmail("info@juandiazllc.com")).toBe(true);
  });

  it("wijst af boven de RFC-5321-limiet, ook als het formaat klopt", () => {
    // Zonder lengtegrens matcht de regex een willekeurig lang "adres":
    // [^\s@]+@[^\s@]+\.[^\s@]+. De cap is dus de eigenlijke bescherming.
    const lokaal = "a".repeat(300);
    const teLang = `${lokaal}@example.com`;
    expect(teLang.length).toBeGreaterThan(FIELD_LIMITS.email);
    expect(isPlausibleEmail(teLang)).toBe(false);
  });

  it("wijst rommel zonder @ of punt af", () => {
    for (const slecht of ["", "geen-at", "a@b", "a@b@c.com", "spaces in@x.com"]) {
      expect(isPlausibleEmail(slecht), slecht).toBe(false);
    }
  });

  it("een payload uit PayloadsAllTheThings komt niet als geldig adres door", () => {
    // Klassieke SQLi/XSS-strings — geen van alle een geldig e-mailadres.
    const payloads = [
      "' OR '1'='1",
      "'; DROP TABLE leads;--",
      "<script>alert(1)</script>",
      "admin'--",
      "${jndi:ldap://x}",
    ];
    for (const p of payloads) {
      expect(isPlausibleEmail(p), p).toBe(false);
      // En als het tóch een tekstveld in gaat: begrensd, dus nooit een reus.
      expect(capField(p, "message").length).toBeLessThanOrEqual(FIELD_LIMITS.message);
    }
  });
});

/* -------------------------------------------------------------------------
   Gate: afweer en detector mogen niet dezelfde kwetsbaarheid delen.

   Tot 2026-08-19 stond de null-byte in `limits.ts` als de byte zelf in de
   regex, en de testinvoer hierboven droeg diezelfde byte. Elke tool die
   control-tekens normaliseert -- een formatter, een editor, een patch door een
   terminal -- had ze samen kunnen strippen: de regex wordt `//g` en strijkt
   niets meer weg, de testinvoer heeft geen NUL meer, en de test blijft groen.
   De afweer verdwijnt dan zonder dat iets rood wordt.

   Beide staan nu als `\u0000`-escape. Deze gate houdt dat zo.
   ------------------------------------------------------------------------- */
describe("afweer en detector delen geen kwetsbaarheid", () => {
  const bron = readFileSync(join(__dirname, "limits.ts"), "utf8");

  it("limits.ts bevat geen ruw control-teken", () => {
    const ruw = [...bron]
      .map((c) => c.charCodeAt(0))
      .filter((n) => n < 32 && n !== 9 && n !== 10 && n !== 13);
    expect(
      ruw,
      "schrijf een control-teken als escape, niet als de byte zelf - anders " +
        "kan een formatter de afweer stilzwijgend verwijderen",
    ).toEqual([]);
  });

  it("de null-byte-strip staat er nog, als escape, en werkt", () => {
    expect(bron, "de escape is uit limits.ts verdwenen").toContain("\\u0000");
    expect(capField("a\u0000b", "name")).toBe("ab");
  });

  it("een adres met CR of LF komt er niet door - header-smokkel", () => {
    // Vandaag afgevangen door de \\s in de regex. Dat is een gevolg, geen
    // besluit; deze test maakt er een besluit van.
    for (const kwaad of [
      "a@b.com\r\nBcc: x@y.com",
      "a@b.com\nX-Injected: 1",
      "a@b.com\r",
    ]) {
      expect(isPlausibleEmail(kwaad), JSON.stringify(kwaad)).toBe(false);
    }
  });
});
