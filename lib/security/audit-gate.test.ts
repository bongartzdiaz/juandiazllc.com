import { describe, it, expect } from "vitest";
import {
  advisoryId,
  verzamelAdvisories,
  beoordeel,
  ernstMinstens,
  type Uitzondering,
} from "./audit-gate";

/* De fixture volgt de vorm die `npm audit --json` op 2026-08-05 daadwerkelijk
   gaf voor deze repo vóór de overrides: `next` had via als lijst strings die
   naar postcss en sharp wijzen, en die twee droegen de echte advisory-objecten
   met source, url, severity en title. */
const AUDIT = {
  vulnerabilities: {
    next: {
      name: "next",
      severity: "high",
      isDirect: true,
      via: ["postcss", "sharp"],
      range: "9.3.4-canary.0 - 16.3.0-preview.10",
    },
    postcss: {
      name: "postcss",
      severity: "high",
      via: [
        {
          source: 1117015,
          name: "postcss",
          title: "PostCSS has XSS via Unescaped </style>",
          url: "https://github.com/advisories/GHSA-qx2v-qp2m-jg93",
          severity: "moderate",
          range: "<8.5.10",
        },
        {
          source: 1129001,
          name: "postcss",
          title: "PostCSS: Path Traversal in Source Map Auto-Loading",
          url: "https://github.com/advisories/GHSA-6g55-p6wh-862q",
          severity: "high",
          range: "<=8.5.17",
        },
      ],
      range: "<=8.5.22",
    },
    sharp: {
      name: "sharp",
      severity: "high",
      via: [
        {
          source: 1124066,
          name: "sharp",
          title: "sharp inherited vulnerabilities in libvips",
          url: "https://github.com/advisories/GHSA-f88m-g3jw-g9cj",
          severity: "high",
          range: "<0.35.0",
        },
      ],
      range: "<0.35.0",
    },
  },
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 3, critical: 0, total: 3 } },
};

const VANDAAG = new Date("2026-08-05T12:00:00Z");

describe("advisoryId", () => {
  it("haalt het GHSA-id uit de URL", () => {
    expect(advisoryId("https://github.com/advisories/GHSA-f88m-g3jw-g9cj", 1)).toBe("GHSA-f88m-g3jw-g9cj");
  });

  // Zonder terugval zou een onbekend URL-formaat een lege sleutel opleveren
  // en zouden alle advisories op elkaar gaan lijken.
  it("valt terug op het numerieke source bij een andere URL-vorm", () => {
    expect(advisoryId("https://voorbeeld.nl/iets", 1124066)).toBe("npm-1124066");
  });

  it("geeft 'onbekend' als er niets bruikbaars is", () => {
    expect(advisoryId(undefined, undefined)).toBe("onbekend");
  });
});

describe("ernstMinstens", () => {
  it("rangschikt de niveaus", () => {
    expect(ernstMinstens("high", "high")).toBe(true);
    expect(ernstMinstens("critical", "high")).toBe(true);
    expect(ernstMinstens("moderate", "high")).toBe(false);
  });
});

describe("verzamelAdvisories", () => {
  const advisories = verzamelAdvisories(AUDIT);

  it("vindt alleen de echte advisory-objecten", () => {
    // next levert er geen: zijn via bestaat uit verwijzingen naar postcss en
    // sharp, die zelf al geteld worden. Meetellen zou dubbeltellen.
    expect(advisories.map((a) => a.id).sort()).toEqual([
      "GHSA-6g55-p6wh-862q",
      "GHSA-f88m-g3jw-g9cj",
      "GHSA-qx2v-qp2m-jg93",
    ]);
  });

  // npm rolt per pakket op naar het zwaarste geval. postcss heet daardoor
  // 'high' terwijl één van zijn advisories moderate is.
  it("neemt de ernst van de advisory en niet van het pakket", () => {
    const xss = advisories.find((a) => a.id === "GHSA-qx2v-qp2m-jg93")!;
    expect(xss.ernst).toBe("moderate");
    expect(AUDIT.vulnerabilities.postcss.severity).toBe("high");
  });

  it("overleeft rommel", () => {
    for (const rommel of [null, undefined, {}, { vulnerabilities: null }, 42]) {
      expect(verzamelAdvisories(rommel)).toEqual([]);
    }
  });

  it("telt dezelfde advisory onder twee pakketten één keer", () => {
    const dubbel = {
      vulnerabilities: {
        a: { via: [{ source: 1, name: "x", title: "t", url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc", severity: "high" }] },
        b: { via: [{ source: 1, name: "x", title: "t", url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc", severity: "high" }] },
      },
    };
    expect(verzamelAdvisories(dubbel)).toHaveLength(1);
  });
});

describe("beoordeel", () => {
  const advisories = verzamelAdvisories(AUDIT);

  it("faalt op een high die niet op de lijst staat", () => {
    const b = beoordeel(advisories, [], VANDAAG);
    expect(b.map((x) => x.soort)).toEqual(["niet-geaccepteerd", "niet-geaccepteerd"]);
    expect(b.every((x) => x.ernst === "fout")).toBe(true);
  });

  it("laat een moderate onder de drempel met rust", () => {
    const ids = beoordeel(advisories, [], VANDAAG).map((x) => x.advisory);
    expect(ids).not.toContain("GHSA-qx2v-qp2m-jg93");
  });

  it("verlaagde drempel pakt de moderate wel", () => {
    const ids = beoordeel(advisories, [], VANDAAG, "moderate").map((x) => x.advisory);
    expect(ids).toContain("GHSA-qx2v-qp2m-jg93");
  });

  const geldig: Uitzondering[] = [
    { advisory: "GHSA-f88m-g3jw-g9cj", reden: "fix vereist major bump", vervalt: "2026-09-01" },
    { advisory: "GHSA-6g55-p6wh-862q", reden: "afhankelijk van upstream", vervalt: "2026-09-01" },
  ];

  it("een geldige uitzondering onderdrukt de melding", () => {
    expect(beoordeel(advisories, geldig, VANDAAG)).toEqual([]);
  });

  // Dit is de hele reden dat deze poort bestaat: een geaccepteerd risico mag
  // niet stilzwijgend blijven liggen zoals deze drie tien weken deden.
  it("een verlopen uitzondering laat de poort alsnog omvallen", () => {
    const verlopen = geldig.map((u) => ({ ...u, vervalt: "2026-08-01" }));
    const b = beoordeel(advisories, verlopen, VANDAAG);
    expect(b.map((x) => x.soort)).toEqual(["vervallen", "vervallen"]);
    expect(b[0].detail).toContain("2026-08-01");
  });

  it("de vervaldag zelf telt nog als geldig", () => {
    const opDeDag = geldig.map((u) => ({ ...u, vervalt: "2026-08-06" }));
    expect(beoordeel(advisories, opDeDag, new Date("2026-08-06T00:00:00Z"))).toEqual([]);
  });

  it("een uitzondering die nergens meer op slaat moet weg", () => {
    const b = beoordeel([], [{ advisory: "GHSA-oud-oud-oud", reden: "ooit", vervalt: "2030-01-01" }], VANDAAG);
    expect(b[0].soort).toBe("overbodig");
    expect(b[0].ernst).toBe("fout");
  });

  it("een uitzondering zonder reden is onvolledig", () => {
    const b = beoordeel(advisories, [{ ...geldig[0], reden: "   " }, geldig[1]], VANDAAG);
    expect(b.some((x) => x.soort === "onvolledig")).toBe(true);
  });

  it("een onleesbare vervaldatum is onvolledig", () => {
    const b = beoordeel(advisories, [{ ...geldig[0], vervalt: "binnenkort" }, geldig[1]], VANDAAG);
    const onvolledig = b.find((x) => x.soort === "onvolledig")!;
    expect(onvolledig.detail).toContain("binnenkort");
  });

  it("zonder advisories en zonder uitzonderingen is er niets te melden", () => {
    expect(beoordeel([], [], VANDAAG)).toEqual([]);
  });
});
