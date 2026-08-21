import { describe, it, expect, vi, afterEach } from "vitest";
import { createHmac } from "node:crypto";

/* ─────────────────────────────────────────────────────────────
   De route zelf, niet zijn hulpstukken.

   lib/cal-webhook.test.ts dekt `handtekeningKlopt` uitputtend af, en die
   dekking was correct. Wat niemand testte was de VOLGORDE in de route — en
   precies daar zat het defect: ik schreef bij #206 dat een vreemde hier "niet
   verder komt dan een vergelijking", terwijl `await req.text()` de hele body
   in het geheugen las vóór die vergelijking. Een helper-test kan dat niet
   zien; hij roept de handler nooit aan.

   Supabase is met opzet gemockt met een client die gooit. Elk pad hieronder
   hoort te eindigen vóór de database, dus als er ooit één doorloopt is dat
   geen stille regressie maar een luide fout. */
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    throw new Error("de database is bereikt op een pad dat had moeten afwijzen");
  },
}));

const { POST } = await import("./route");

const SECRET = "test-secret-abc123";
const teken = (body: string) => createHmac("sha256", SECRET).update(body, "utf8").digest("hex");

/** Bouwt een Request met een body die in stukjes binnenkomt, en telt hoeveel
    stukjes er werkelijk zijn opgehaald. Dat aantal is het bewijs dat het
    plafond tijdens het lezen werkt en niet pas achteraf. */
function maakReq(body: string, opties: { handtekening?: string | null; stuk?: number } = {}) {
  const bytes = new TextEncoder().encode(body);
  const stuk = opties.stuk ?? 1024;
  const teller = { opgehaald: 0 };
  let i = 0;

  const req = {
    headers: {
      get: (n: string) =>
        n.toLowerCase() === "x-cal-signature-256" ? (opties.handtekening ?? null) : null,
    },
    body: new ReadableStream<Uint8Array>(
      {
        pull(c) {
          if (i >= bytes.length) return void c.close();
          teller.opgehaald += 1;
          c.enqueue(bytes.slice(i, i + stuk));
          i += stuk;
        },
      },
      // highWaterMark 0, anders trekt de stroom bij aanmaak al één stuk binnen
      // om zijn buffer te vullen. De teller stond dan op 1 terwijl de route
      // nog niets had gelezen — een vaste offset in de meter, die zich las
      // als een defect in de code.
      { highWaterMark: 0 },
    ),
  } as unknown as Request;

  return { req, teller, stukjesTotaal: Math.ceil(bytes.length / stuk) };
}

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/cal", () => {
  it("geeft 503 zonder secret, en leest de body dan helemaal niet", async () => {
    vi.stubEnv("CAL_WEBHOOK_SECRET", "");
    const { req, teller } = maakReq("x".repeat(50_000));

    const res = await POST(req);

    expect(res.status).toBe(503);
    expect(teller.opgehaald, "een niet-geconfigureerde route hoort niets te lezen").toBe(0);
  });

  it("kapt een te grote body af vóór de handtekeningcontrole", async () => {
    // Met een GELDIGE handtekening. Zou het plafond ná de HMAC staan, dan
    // kwam dit verzoek gewoon door en was de test groen om de verkeerde reden.
    vi.stubEnv("CAL_WEBHOOK_SECRET", SECRET);
    const body = "x".repeat(300 * 1024);
    const { req } = maakReq(body, { handtekening: teken(body) });

    const res = await POST(req);

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "too-large" });
  });

  it("stopt met lezen zodra het plafond geraakt is", async () => {
    // Dit is het punt van de hele wijziging. 4 MB in stukjes van 64 KB is 64
    // stukjes; het plafond ligt op 256 KB, dus na het vijfde stuk (320 KB) is
    // het overschreden en stopt de lezing. Een implementatie die eerst alles
    // inleest en dán meet haalt ze alle 64 op en faalt hier.
    //
    // Geen exact getal, want MAX_BYTES staat in de route en is daar niet uit
    // te exporteren zonder Next' route-contract te schenden. De ondergrens
    // staat er wél bij: nul opgehaalde stukjes zou betekenen dat de meter
    // stuk is en niet dat de route zuinig leest.
    vi.stubEnv("CAL_WEBHOOK_SECRET", SECRET);
    const { req, teller, stukjesTotaal } = maakReq("x".repeat(4 * 1024 * 1024), {
      stuk: 64 * 1024,
      handtekening: "maakt niet uit",
    });

    expect(await POST(req).then((r) => r.status)).toBe(413);
    expect(stukjesTotaal).toBe(64);
    expect(teller.opgehaald).toBeGreaterThan(0);
    expect(teller.opgehaald).toBeLessThanOrEqual(5);
  });

  it("geeft 401 bij een verkeerde handtekening", async () => {
    vi.stubEnv("CAL_WEBHOOK_SECRET", SECRET);
    const body = JSON.stringify({ triggerEvent: "BOOKING_CREATED", payload: { uid: "u1" } });
    const { req } = maakReq(body, { handtekening: "a".repeat(64) });

    const res = await POST(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "bad-signature" });
  });

  it("geeft 401 bij een ontbrekende handtekening", async () => {
    vi.stubEnv("CAL_WEBHOOK_SECRET", SECRET);
    const { req } = maakReq("{}", { handtekening: null });

    expect(await POST(req).then((r) => r.status)).toBe(401);
  });

  it("laat een correct ondertekende body wél door tot de schemacontrole", async () => {
    // Zonder deze assertie bewijst niets hierboven dat het plafond de gewone
    // weg niet óók dichtzet: een route die alles met 413 beantwoordt zou alle
    // andere tests halen. 400 betekent: gelezen, handtekening goed, schema
    // afgekeurd — precies één stap vóór de database.
    vi.stubEnv("CAL_WEBHOOK_SECRET", SECRET);
    const body = JSON.stringify({ dit: "past niet op het schema" });
    const { req } = maakReq(body, { handtekening: teken(body) });

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid-payload" });
  });
});
