import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { REEKS_BRON } from "@/lib/email/scan-reeks";

/* De route zelf: de volgorde van de poorten en wat er per rij gebeurt.
   lib/email/scan-reeks.test.ts dekt de planning en de kopij; hier gaat het om
   de bedrading — dat een verkeerde sleutel de database nooit bereikt, dat
   een rij pas na een geslaagde verzending een stempel krijgt, en dat de
   tweede run niets dubbel stuurt.

   De Supabase-client is een nep-tabel in het geheugen die telt hoe vaak hij
   is aangeraakt. De fetch naar Resend is gestubd op `globalThis` en telt ook.
   Beide tellers zijn de positieve controle: "niets verstuurd" is pas een
   meting als aantoonbaar is dat de fetch niet bereikt is. */

type Rij = { id: string; email: string; source: string; metadata: Record<string, unknown> };

const tabel: { rijen: Rij[]; selects: number; updates: number; dbBereikt: boolean } = {
  rijen: [],
  selects: 0,
  updates: 0,
  dbBereikt: false,
};

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    tabel.dbBereikt = true;
    return {
      from: (naam: string) => {
        if (naam !== "subscribers") throw new Error(`onbekende tabel ${naam}`);
        return {
          select: () => ({
            eq: (kolom: string, waarde: string) => ({
              limit: async () => {
                tabel.selects += 1;
                if (kolom !== "source") throw new Error(`onverwacht filter ${kolom}`);
                return { data: tabel.rijen.filter((r) => r.source === waarde), error: null };
              },
            }),
          }),
          update: (patch: { metadata: Record<string, unknown> }) => ({
            eq: async (kolom: string, id: string) => {
              tabel.updates += 1;
              if (kolom !== "id") throw new Error(`onverwacht filter ${kolom}`);
              const rij = tabel.rijen.find((r) => r.id === id);
              if (!rij) return { error: { message: "geen rij" } };
              rij.metadata = patch.metadata;
              return { error: null };
            },
          }),
        };
      },
    };
  },
}));

const { GET } = await import("./route");

const SECRET = "een-geheim-van-genoeg-lengte";
const fetchTeller = { aanroepen: 0, naar: [] as string[] };
let ipTeller = 0;

function stubFetch(status = 200) {
  fetchTeller.aanroepen = 0;
  fetchTeller.naar = [];
  vi.stubGlobal("fetch", async (_url: unknown, init?: RequestInit) => {
    fetchTeller.aanroepen += 1;
    const body = JSON.parse(String(init?.body ?? "{}"));
    fetchTeller.naar.push(body.to);
    return new Response(JSON.stringify({ id: "em_1" }), { status });
  });
}

function req(auth?: string) {
  const headers = new Headers();
  if (auth !== undefined) headers.set("authorization", auth);
  // Uniek IP per verzoek, zodat de rem niet over tests heen optelt. Een teller
  // en geen random: twee gelijke lotingen zouden een 429 opleveren die als
  // een defect in de route leest.
  ipTeller += 1;
  headers.set("x-forwarded-for", `10.${(ipTeller >> 8) & 255}.${ipTeller & 255}.1`);
  return new NextRequest("http://localhost/api/campagne/scan-reeks", { headers });
}

const DAG = 24 * 60 * 60 * 1000;
const consentVanaf = (dagenGeleden: number) =>
  new Date(Date.now() - dagenGeleden * DAG).toISOString();

function rij(id: string, dagenGeleden: number, extra: Record<string, unknown> = {}): Rij {
  return {
    id,
    email: `${id}@voorbeeld.test`,
    source: REEKS_BRON,
    metadata: {
      consent_at: consentVanaf(dagenGeleden),
      unsub_token: `00000000-0000-4000-8000-0000000000${id.charCodeAt(0) % 90 + 10}`,
      lekken: 2,
      ...extra,
    },
  };
}

beforeEach(() => {
  tabel.rijen = [];
  tabel.selects = 0;
  tabel.updates = 0;
  tabel.dbBereikt = false;
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("CAMPAGNE_FROM", "Juan <juan@juandiazllc.com>");
  stubFetch();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("poorten, in volgorde, en allemaal vóór de database", () => {
  it("CRON_SECRET ontbreekt of te kort → 503, ook met een 'goede' header", async () => {
    for (const s of ["", "kort"]) {
      vi.stubEnv("CRON_SECRET", s);
      const res = await GET(req(`Bearer ${s}`));
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ ok: false, error: "not-configured" });
    }
    expect(tabel.dbBereikt).toBe(false);
    expect(fetchTeller.aanroepen).toBe(0);
  });

  it("geen of verkeerde Bearer → 401", async () => {
    for (const h of [undefined, "", "Bearer fout", `Bearer ${SECRET}x`, SECRET]) {
      const res = await GET(req(h));
      expect(res.status).toBe(401);
    }
    expect(tabel.dbBereikt).toBe(false);
    expect(fetchTeller.aanroepen).toBe(0);
  });

  it("RESEND_API_KEY of CAMPAGNE_FROM ontbreekt → 503, ná de auth", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(503);
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CAMPAGNE_FROM", "");
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(503);
    // Zonder auth blijft het 401, niet 503: de sleutelcontrole komt eerst.
    expect((await GET(req("Bearer fout"))).status).toBe(401);
    expect(tabel.dbBereikt).toBe(false);
  });
});

describe("per rij", () => {
  it("stuurt alleen wat aan de beurt is, stempelt, en is idempotent", async () => {
    tabel.rijen = [
      rij("a", 0), // mail 1 nu
      rij("b", 1), // dag 1: mail 1 te laat, mail 2 pas op dag 3 → dus 1
      rij("c", 1, { verzonden: { 1: consentVanaf(1) } }), // mail 2 pas op dag 3
      rij("d", 8, { unsubscribed_at: consentVanaf(1) }), // afgemeld
      { ...rij("e", 0), source: "newsletter" }, // andere bron
    ];
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      bekeken: 4,
      verzonden: 2,
      overgeslagen: 2,
      mislukt: 0,
    });
    expect(fetchTeller.naar.sort()).toEqual(["a@voorbeeld.test", "b@voorbeeld.test"]);
    expect(tabel.updates).toBe(2);
    expect(tabel.rijen[0].metadata.verzonden).toHaveProperty("1");
    expect(tabel.rijen[1].metadata.verzonden).toHaveProperty("1");

    // Tweede run dezelfde dag: niets dubbel.
    stubFetch();
    const res2 = await GET(req(`Bearer ${SECRET}`));
    expect(await res2.json()).toMatchObject({ verzonden: 0, overgeslagen: 4 });
    expect(fetchTeller.aanroepen).toBe(0);
  });

  it("verzendfout → geen stempel, zodat de volgende run het opnieuw probeert", async () => {
    tabel.rijen = [rij("a", 0)];
    stubFetch(500);
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(await res.json()).toMatchObject({ verzonden: 0, mislukt: 1 });
    expect(tabel.updates).toBe(0);
    expect(tabel.rijen[0].metadata).not.toHaveProperty("verzonden");
  });

  it("rij zonder unsub_token wordt niet gemaild", async () => {
    tabel.rijen = [rij("a", 0, { unsub_token: undefined })];
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(await res.json()).toMatchObject({ verzonden: 0, mislukt: 1 });
    expect(fetchTeller.aanroepen).toBe(0);
  });

  it("de mail draagt afzender, reply-to en afmeldlink", async () => {
    tabel.rijen = [rij("a", 0)];
    let body: Record<string, string> = {};
    vi.stubGlobal("fetch", async (_u: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return new Response("{}", { status: 200 });
    });
    await GET(req(`Bearer ${SECRET}`));
    expect(body.from).toBe("Juan <juan@juandiazllc.com>");
    expect(body.reply_to).toBe("info@juandiazllc.com");
    expect(body.text).toContain("/api/uitschrijven?token=");
  });
});
