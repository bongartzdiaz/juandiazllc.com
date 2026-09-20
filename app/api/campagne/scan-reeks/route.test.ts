import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { REEKS_BRON } from "@/lib/email/scan-reeks";

/* De route zelf: de volgorde van de poorten en wat er per rij gebeurt.
   lib/email/scan-reeks.test.ts dekt de planning en de kopij; hier gaat het om
   de bedrading — dat een verkeerde sleutel de database nooit bereikt, dat
   een rij pas na een geslaagde verzending een stempel krijgt, en dat de
   tweede run niets dubbel stuurt.

   De Supabase-client is een nep-tabel in het geheugen die telt hoe vaak hij
   is aangeraakt. De fetch naar Brevo is gestubd op `globalThis` en telt ook.
   Beide tellers zijn de positieve controle: "niets verstuurd" is pas een
   meting als aantoonbaar is dat de fetch niet bereikt is. */

type Rij = { id: string; email: string; source: string; metadata: Record<string, unknown> };

const tabel: {
  rijen: Rij[];
  selects: number;
  updates: number;
  dbBereikt: boolean;
  clientFaalt: boolean;
} = {
  rijen: [],
  selects: 0,
  updates: 0,
  dbBereikt: false,
  clientFaalt: false,
};

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    // Zonder SUPABASE_SECRET_KEY gooit de echte client; de vlag speelt dat na.
    if (tabel.clientFaalt) throw new Error("SUPABASE_SECRET_KEY ontbreekt");
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
    fetchTeller.naar.push(body.to[0].email);
    return new Response(JSON.stringify({ messageId: "<1@brevo>" }), { status });
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
  tabel.clientFaalt = false;
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.stubEnv("BREVO_API_KEY", "xkeysib-test");
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

  it("BREVO_API_KEY of CAMPAGNE_FROM ontbreekt → 503, ná de auth", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(503);
    vi.stubEnv("BREVO_API_KEY", "xkeysib-test");
    vi.stubEnv("CAMPAGNE_FROM", "");
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(503);
    // Zonder auth blijft het 401, niet 503: de sleutelcontrole komt eerst.
    expect((await GET(req("Bearer fout"))).status).toBe(401);
    expect(tabel.dbBereikt).toBe(false);
  });
});

describe("elke 503 noemt de variabele in het log, nooit de waarde", () => {
  /* Van buiten zijn de drie 503-takken niet uit elkaar te houden -- dat is
     bewust, een aanroeper zonder Bearer mag niets over de configuratie
     leren. Het runtime-log moet het wél kunnen. Tot 2026-09-19 zwegen alle
     takken, en stond productie op "503 not-configured" zonder dat te
     herleiden was welke van de vier variabelen ontbrak. */
  const gevallen: Array<{ naam: string; opzet: () => void; verwacht: string; geheim: string }> = [
    { naam: "CRON_SECRET", opzet: () => vi.stubEnv("CRON_SECRET", "xyz"), verwacht: "CRON_SECRET", geheim: "xyz" },
    { naam: "BREVO_API_KEY", opzet: () => vi.stubEnv("BREVO_API_KEY", ""), verwacht: "BREVO_API_KEY", geheim: "xkeysib-test" },
    { naam: "CAMPAGNE_FROM leeg", opzet: () => vi.stubEnv("CAMPAGNE_FROM", ""), verwacht: "CAMPAGNE_FROM leeg", geheim: "juan@juandiazllc.com" },
    {
      naam: "CAMPAGNE_FROM freemail",
      opzet: () => vi.stubEnv("CAMPAGNE_FROM", "Juan Diaz, LLC <bongartzdiaz@gmail.com>"),
      verwacht: "CAMPAGNE_FROM staat op een gratis maildomein",
      geheim: "bongartzdiaz@gmail.com",
    },
    { naam: "SUPABASE_SECRET_KEY", opzet: () => { tabel.clientFaalt = true; }, verwacht: "SUPABASE_SECRET_KEY", geheim: "xkeysib-test" },
  ];

  for (const g of gevallen) {
    it(`${g.naam} → 503 + één warn met de naam`, async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        g.opzet();
        const res = await GET(req(`Bearer ${SECRET}`));
        expect(res.status).toBe(503);
        expect(await res.json()).toEqual({ ok: false, error: "not-configured" });
        expect(warn).toHaveBeenCalledTimes(1);
        const regel = String(warn.mock.calls[0][0]);
        expect(regel).toContain("[scan-reeks] not-configured: " + g.verwacht);
        // De waarde zelf, of het geheim uit de andere variabelen, staat er niet in.
        expect(regel).not.toContain(g.geheim);
        expect(regel).not.toContain(SECRET);
        expect(fetchTeller.aanroepen).toBe(0);
      } finally {
        warn.mockRestore();
      }
    });
  }

  it("een gezonde configuratie logt niets", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await GET(req(`Bearer ${SECRET}`));
      expect(res.status).toBe(200);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("de freemail-afzender wordt vóór de database geweigerd", async () => {
    vi.stubEnv("CAMPAGNE_FROM", "x@gmail.com");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await GET(req(`Bearer ${SECRET}`));
      expect(tabel.dbBereikt).toBe(false);
    } finally {
      warn.mockRestore();
    }
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
    let body: Record<string, unknown> = {};
    let headers: Record<string, string> = {};
    vi.stubGlobal("fetch", async (_u: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      headers = init?.headers as Record<string, string>;
      return new Response("{}", { status: 201 });
    });
    await GET(req(`Bearer ${SECRET}`));
    expect(headers["api-key"]).toBe("xkeysib-test");
    expect(body.sender).toEqual({ name: "Juan", email: "juan@juandiazllc.com" });
    expect(body.replyTo).toEqual({ email: "info@juandiazllc.com" });
    expect(String(body.textContent)).toContain("/api/uitschrijven?token=");
    expect(String(body.htmlContent)).toContain("/api/uitschrijven?token=");
  });
});

/* De ROI-mail loopt in dezelfde run, na de scan-reeks, met dezelfde telling. */

function roiRij(id: string, extra: Record<string, unknown> = {}): Rij {
  return {
    id,
    email: `${id}@voorbeeld.test`,
    source: "energy-roi",
    metadata: {
      locale: "nl",
      consent_at: consentVanaf(0),
      unsub_token: `10000000-0000-4000-8000-0000000000${id.charCodeAt(0) % 90 + 10}`,
      roi: { consumption: 3500, withBattery: 0, savingsNoBat: 441, paybackNoBat: 11.3 },
      ...extra,
    },
  };
}

describe("energy-roi: één mail per rij", () => {
  it("stuurt, stempelt, en is idempotent — naast de scan-reeks in dezelfde telling", async () => {
    tabel.rijen = [rij("a", 0), roiRij("r"), roiRij("s", { verzonden: consentVanaf(1) })];
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(await res.json()).toEqual({ ok: true, bekeken: 3, verzonden: 2, overgeslagen: 1, mislukt: 0 });
    expect(fetchTeller.naar.sort()).toEqual(["a@voorbeeld.test", "r@voorbeeld.test"]);
    expect(typeof tabel.rijen[1].metadata.verzonden).toBe("string");

    stubFetch();
    const res2 = await GET(req(`Bearer ${SECRET}`));
    expect(await res2.json()).toMatchObject({ verzonden: 0, overgeslagen: 3 });
  });

  it("zonder token of zonder getallen: mislukt, niet gemaild", async () => {
    tabel.rijen = [roiRij("r", { unsub_token: undefined }), roiRij("s", { roi: undefined })];
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(await res.json()).toMatchObject({ verzonden: 0, mislukt: 2 });
    expect(fetchTeller.aanroepen).toBe(0);
    expect(tabel.updates).toBe(0);
  });

  it("de mail staat in de taal van de rij en draagt de berekening en de afmeldlink", async () => {
    tabel.rijen = [roiRij("r", { locale: "de" })];
    let body: Record<string, unknown> = {};
    vi.stubGlobal("fetch", async (_u: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return new Response("{}", { status: 201 });
    });
    await GET(req(`Bearer ${SECRET}`));
    expect(String(body.htmlContent)).toContain('lang="de"');
    expect(String(body.textContent)).toContain("3.500");
    expect(String(body.textContent)).toContain("/api/uitschrijven?token=");
    expect(String(body.subject)).toContain("11,3");
  });
});
