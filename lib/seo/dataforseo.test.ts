import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  authHeader,
  bouwBody,
  bouwUrl,
  parseEnvelop,
  wachtOpQuotum,
  _resetQuotum,
  DFS_ENDPOINTS,
  DFS_MIN_INTERVAL_MS,
  DFS_BASIS,
} from "./dataforseo";

/* Deze tests dekken alles wat zonder netwerk mis kan gaan. De enige regel die
   ze niet dekken is de fetch zelf in roep(); die is daarom bewust dun. */

describe("authHeader", () => {
  it("codeert login:wachtwoord als base64 achter 'Basic '", () => {
    // Bekende waarde uit de DataForSEO-documentatie zelf.
    expect(authHeader("login", "password")).toBe("Basic bG9naW46cGFzc3dvcmQ=");
  });

  it("gaat goed met niet-ASCII in het wachtwoord", () => {
    const h = authHeader("jan@example.com", "wachtwoord-mét-é");
    expect(h.startsWith("Basic ")).toBe(true);
    const terug = Buffer.from(h.slice(6), "base64").toString("utf8");
    expect(terug).toBe("jan@example.com:wachtwoord-mét-é");
  });

  it("weigert een ontbrekende login of wachtwoord", () => {
    expect(() => authHeader("", "x")).toThrow(/verplicht/);
    expect(() => authHeader("x", "")).toThrow(/verplicht/);
  });
});

describe("bouwBody", () => {
  it("levert een array op topniveau, ook bij één taak", () => {
    // Een object eromheen geeft 40501 en dat kost geld voordat je het ziet.
    const body = bouwBody([{ target: "juandiazllc.com" }]);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(JSON.stringify(body).startsWith("[")).toBe(true);
  });

  it("weigert een lege takenlijst", () => {
    expect(() => bouwBody([])).toThrow(/minstens één taak/);
  });
});

describe("bouwUrl", () => {
  it("plakt endpoint achter de basis", () => {
    expect(bouwUrl("rankedKeywords")).toBe(
      `${DFS_BASIS}/dataforseo_labs/google/ranked_keywords/live`,
    );
  });

  it("elk gedeclareerd endpoint begint met een slash en is een live-endpoint", () => {
    for (const [naam, pad] of Object.entries(DFS_ENDPOINTS)) {
      expect(pad.startsWith("/"), `${naam} mist de leidende slash`).toBe(true);
      expect(pad.endsWith("/live"), `${naam} is geen live-endpoint`).toBe(true);
    }
  });
});

describe("parseEnvelop", () => {
  const geslaagd = {
    status_code: 20000,
    status_message: "Ok.",
    cost: 0.0101,
    tasks: [{ status_code: 20000, result: [{ keyword: "saldering", search_volume: 1600 }] }],
  };

  it("haalt resultaten en kosten uit een geslaagd antwoord", () => {
    const r = parseEnvelop<{ keyword: string }>(geslaagd);
    expect(r.ok).toBe(true);
    expect(r.kosten).toBe(0.0101);
    expect(r.resultaten).toHaveLength(1);
    expect(r.resultaten[0].keyword).toBe("saldering");
    expect(r.fouten).toEqual([]);
  });

  it("meldt een fout op envelopniveau", () => {
    const r = parseEnvelop({ status_code: 40200, status_message: "Payment Required." });
    expect(r.ok).toBe(false);
    expect(r.fouten[0]).toMatch(/40200/);
    expect(r.fouten[0]).toMatch(/Payment Required/);
  });

  // Dit is het geval waar een naïeve client op stukloopt: bovenop staat 20000,
  // maar de taak eronder faalde. Zonder deze controle lijkt het verzoek
  // geslaagd met nul resultaten — niet te onderscheiden van "niets gevonden".
  it("ziet een gefaalde taak onder een geslaagde envelop", () => {
    const r = parseEnvelop({
      status_code: 20000,
      status_message: "Ok.",
      cost: 0,
      tasks: [{ status_code: 40501, status_message: "Invalid Field in POST data." }],
    });
    expect(r.ok).toBe(false);
    expect(r.resultaten).toEqual([]);
    expect(r.fouten[0]).toMatch(/taak 0 40501/);
  });

  it("voegt resultaten uit meerdere taken samen en slaat de gefaalde over", () => {
    const r = parseEnvelop<{ n: number }>({
      status_code: 20000,
      cost: 0.02,
      tasks: [
        { status_code: 20000, result: [{ n: 1 }, { n: 2 }] },
        { status_code: 40400, status_message: "Not Found." },
        { status_code: 20000, result: [{ n: 3 }] },
      ],
    });
    expect(r.resultaten.map((x) => x.n)).toEqual([1, 2, 3]);
    expect(r.ok).toBe(false);
    expect(r.fouten).toHaveLength(1);
  });

  it("gaat om met result: null zonder te crashen", () => {
    const r = parseEnvelop({ status_code: 20000, cost: 0, tasks: [{ status_code: 20000, result: null }] });
    expect(r.ok).toBe(true);
    expect(r.resultaten).toEqual([]);
  });

  it("overleeft rommel", () => {
    for (const rommel of [null, undefined, "", 42, []]) {
      const r = parseEnvelop(rommel);
      expect(r.ok).toBe(false);
      expect(r.kosten).toBe(0);
    }
  });

  it("rapporteert kosten ook wanneer het verzoek faalde", () => {
    // Een mislukte taak kan alsnog geld kosten; dat mag niet wegvallen.
    const r = parseEnvelop({ status_code: 20000, cost: 0.005, tasks: [{ status_code: 40501 }] });
    expect(r.kosten).toBe(0.005);
  });
});

describe("wachtOpQuotum", () => {
  beforeEach(() => _resetQuotum());

  it("laat de eerste aanroep direct door", async () => {
    const gewacht = await wachtOpQuotum(() => 1_000_000, vi.fn());
    expect(gewacht).toBe(0);
  });

  it("houdt 5 seconden aan tussen twee snelle aanroepen", async () => {
    const slaap = vi.fn(async () => {});
    let klok = 1_000_000;
    await wachtOpQuotum(() => klok, slaap);
    klok += 500; // een halve seconde later
    const gewacht = await wachtOpQuotum(() => klok, slaap);
    expect(gewacht).toBe(DFS_MIN_INTERVAL_MS - 500);
    expect(slaap).toHaveBeenCalledWith(DFS_MIN_INTERVAL_MS - 500);
  });

  it("wacht niet wanneer er al genoeg tijd voorbij is", async () => {
    const slaap = vi.fn(async () => {});
    let klok = 1_000_000;
    await wachtOpQuotum(() => klok, slaap);
    klok += DFS_MIN_INTERVAL_MS + 1;
    const gewacht = await wachtOpQuotum(() => klok, slaap);
    expect(gewacht).toBe(0);
    expect(slaap).not.toHaveBeenCalled();
  });

  it("de grens komt overeen met 12 verzoeken per minuut", () => {
    expect(60_000 / DFS_MIN_INTERVAL_MS).toBe(12);
  });
});
