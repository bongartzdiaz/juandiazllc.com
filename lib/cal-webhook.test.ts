import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { handtekeningKlopt, tekst, calBodySchema } from "./cal-webhook";

const SECRET = "test-secret-abc123";
const teken = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body, "utf8").digest("hex");

describe("handtekeningKlopt", () => {
  const body = JSON.stringify({ triggerEvent: "BOOKING_CREATED", payload: { uid: "u1" } });

  it("accepteert een geldige handtekening", () => {
    expect(handtekeningKlopt(body, teken(body), SECRET)).toBe(true);
  });

  it("accepteert hoofdletters in de hex — cal.com garandeert de casing niet", () => {
    expect(handtekeningKlopt(body, teken(body).toUpperCase(), SECRET)).toBe(true);
  });

  it("weigert een ontbrekende header", () => {
    expect(handtekeningKlopt(body, null, SECRET)).toBe(false);
  });

  it("weigert een lege header", () => {
    expect(handtekeningKlopt(body, "", SECRET)).toBe(false);
  });

  it("weigert een handtekening die met een ander secret is gemaakt", () => {
    expect(handtekeningKlopt(body, teken(body, "ander-secret"), SECRET)).toBe(false);
  });

  it("weigert zodra de body één teken verandert", () => {
    const sig = teken(body);
    const geknoeid = body.replace('"u1"', '"u2"');
    expect(handtekeningKlopt(geknoeid, sig, SECRET)).toBe(false);
  });

  it("weigert een te korte handtekening zonder te crashen", () => {
    // timingSafeEqual gooit bij ongelijke lengte. Zonder de lengtecheck vooraf
    // zou een aanvaller het endpoint kunnen laten crashen met één kort teken.
    expect(() => handtekeningKlopt(body, "ab", SECRET)).not.toThrow();
    expect(handtekeningKlopt(body, "ab", SECRET)).toBe(false);
  });

  it("weigert onzin van de juiste lengte", () => {
    expect(handtekeningKlopt(body, "0".repeat(64), SECRET)).toBe(false);
  });
});

describe("tekst — antwoorden uitpakken", () => {
  it("leest de {label, value}-vorm van cal.com", () => {
    expect(tekst({ email: { label: "email_address", value: "a@b.nl" } }, "email")).toBe("a@b.nl");
  });

  it("leest een kale string, voor het geval cal.com de vorm wijzigt", () => {
    expect(tekst({ email: "a@b.nl" }, "email")).toBe("a@b.nl");
  });

  it("plakt een meerkeuze-antwoord aan elkaar", () => {
    expect(tekst({ sector: { value: ["energie", "vastgoed"] } }, "sector")).toBe(
      "energie, vastgoed",
    );
  });

  it("volgt de sleutelvolgorde en pakt de eerste met inhoud", () => {
    const r = { probleem: { value: "   " }, vraag: { value: "hoe meet ik marge?" } };
    expect(tekst(r, "probleem", "vraag")).toBe("hoe meet ik marge?");
  });

  it("geeft lege tekst bij onbekende sleutels", () => {
    expect(tekst({ email: { value: "a@b.nl" } }, "bedrijf")).toBe("");
  });

  it("geeft lege tekst als responses ontbreekt", () => {
    expect(tekst(undefined, "email")).toBe("");
  });
});

describe("calBodySchema", () => {
  it("accepteert een minimale geldige body", () => {
    const r = calBodySchema.safeParse({
      triggerEvent: "BOOKING_CREATED",
      payload: { uid: "abc" },
    });
    expect(r.success).toBe(true);
  });

  it("accepteert onbekende velden in responses — cal.com voegt die toe zonder waarschuwing", () => {
    const r = calBodySchema.safeParse({
      triggerEvent: "BOOKING_CREATED",
      payload: { uid: "abc", responses: { verzonnenVeld: { value: 42 } } },
    });
    expect(r.success).toBe(true);
  });

  it("weigert een payload zonder uid — daar hangt de idempotentie aan", () => {
    const r = calBodySchema.safeParse({ triggerEvent: "BOOKING_CREATED", payload: {} });
    expect(r.success).toBe(false);
  });
});
