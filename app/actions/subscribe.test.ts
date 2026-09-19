import { describe, it, expect, vi, beforeEach } from "vitest";
import { DICT, LOCALES } from "@/lib/i18n/dict";
import {
  HOMEPAGE_BRON,
  NIEUWSBRIEF_CAMPAGNE,
  bouwNieuwsbriefMetadata,
  toestemmingSleutel,
} from "@/lib/nieuwsbrief";

/* ─────────────────────────────────────────────────────────────
   Wat de nieuwsbriefinschrijving werkelijk wegschrijft.

   `app/actions/foutpaden.test.ts` bewaakt welke storing in welke tak landt;
   die poort kijkt naar de returnwaarde en niet naar de rij. Deze poort vangt
   de insert-payload af, want daar zat het gat: tot 2026-09-19 ging er geen
   `metadata` mee, dus kon `/api/uitschrijven` een nieuwsbriefrij niet vinden
   en las niets de honeypot die NewsletterForm al sinds juli draagt.

   De mock geeft terug wat je vraagt, dus een groene run bewijst hier alleen
   de vorm van wat er naar Supabase gaat -- niet dat `anon` het mag. Dat
   laatste is een grant (INSERT-only, gemeten 2026-08-21) en de reden dat de
   insert kaal is; een `.select()` erachter zou de mock net zo goed slikken.
   Vandaar de tekstscan onderaan.
   ───────────────────────────────────────────────────────────── */

const vangnet = vi.hoisted(() => ({
  payloads: [] as Array<Record<string, unknown>>,
  aanroepen: 0,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      insert: (rij: Record<string, unknown>) => {
        vangnet.aanroepen += 1;
        vangnet.payloads.push(rij);
        return Promise.resolve({ data: null, error: null });
      },
    }),
  }),
}));

const { subscribe } = await import("./subscribe");

function formulier(velden: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.set(k, v);
  return fd;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

beforeEach(() => {
  vangnet.payloads.length = 0;
  vangnet.aanroepen = 0;
});

describe("de zuivere helft", () => {
  it("de homepage toont cta.news.hint, elk ander formulier nl.sub", () => {
    expect(toestemmingSleutel(HOMEPAGE_BRON)).toBe("cta.news.hint");
    expect(toestemmingSleutel("insights_footer")).toBe("nl.sub");
    expect(toestemmingSleutel("landing")).toBe("nl.sub");
  });

  it("de toestemmingstekst is per taal de tekst die de bezoeker zag", () => {
    for (const l of LOCALES) {
      const m = bouwNieuwsbriefMetadata({
        locale: l,
        source: HOMEPAGE_BRON,
        nu: new Date("2026-09-19T08:00:00Z"),
        token: "t",
      });
      expect(m.consent_tekst, l).toBe(DICT[l]["cta.news.hint"]);
      expect(m.consent_at).toBe("2026-09-19T08:00:00.000Z");
      expect(m.campagne).toBe(NIEUWSBRIEF_CAMPAGNE);
    }
  });

  it("de vier talen dragen elk een eigen toestemmingstekst", () => {
    const teksten = new Set(LOCALES.map((l) => DICT[l]["nl.sub"]));
    expect(teksten.size).toBe(LOCALES.length);
  });
});

describe("wat de actie wegschrijft", () => {
  it("schrijft metadata met dezelfde velden als de scan-inschrijving", async () => {
    const uit = await subscribe(
      { status: "idle" },
      formulier({ email: "Poort@Voorbeeld.example", source: "insights_footer", locale: "nl" }),
    );
    expect(uit.status).toBe("ok");
    expect(vangnet.aanroepen).toBe(1);

    const rij = vangnet.payloads[0];
    expect(rij.email).toBe("poort@voorbeeld.example");
    expect(rij.source).toBe("insights_footer");

    const m = rij.metadata as Record<string, unknown>;
    // Exact deze sleutels: /api/uitschrijven leest `unsub_token`, en een
    // campagne-selectie leest `campagne` en `locale`. Een veld erbij is een
    // bewuste bewerking, niet iets dat stil meelift.
    expect(Object.keys(m).sort()).toEqual(
      ["campagne", "consent_at", "consent_tekst", "locale", "unsub_token"],
    );
    expect(m.unsub_token).toMatch(UUID_RE);
    expect(m.locale).toBe("nl");
    expect(m.consent_tekst).toBe(DICT.nl["nl.sub"]);
    expect(Date.parse(String(m.consent_at))).not.toBeNaN();
  });

  it("elke inschrijving krijgt een ander afmeldtoken", async () => {
    for (let i = 0; i < 3; i++) {
      await subscribe(
        { status: "idle" },
        formulier({ email: `p${i}@voorbeeld.example`, source: "landing", locale: "en" }),
      );
    }
    const tokens = vangnet.payloads.map(
      (r) => (r.metadata as Record<string, unknown>).unsub_token,
    );
    expect(new Set(tokens).size).toBe(3);
  });

  it("de homepage-bron legt de homepage-tekst vast", async () => {
    await subscribe(
      { status: "idle" },
      formulier({ email: "p@voorbeeld.example", source: HOMEPAGE_BRON, locale: "de" }),
    );
    const m = vangnet.payloads[0].metadata as Record<string, unknown>;
    expect(m.consent_tekst).toBe(DICT.de["cta.news.hint"]);
  });

  it("een gevulde honeypot schrijft niets weg en antwoordt nep-ok", async () => {
    for (const l of LOCALES) {
      const uit = await subscribe(
        { status: "idle" },
        formulier({ email: "bot@voorbeeld.example", website: "http://spam", locale: l }),
      );
      expect(uit.status, l).toBe("ok");
      // Woordelijk het gewone succesbericht: een bot mag niet kunnen zien dat
      // hij is herkend.
      expect(uit.message, l).toBe(DICT[l]["form.ok.subscribed"]);
    }
    expect(vangnet.aanroepen).toBe(0);
  });

  it("een ongeldig adres bereikt de database niet", async () => {
    const uit = await subscribe(
      { status: "idle" },
      formulier({ email: "a@b", locale: "es" }),
    );
    expect(uit.status).toBe("err");
    expect(vangnet.aanroepen).toBe(0);
  });
});

describe("bedrading die een mock niet kan zien", () => {
  it("de insert blijft kaal: geen .select() na de insert", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { zonderCommentaar } = await import("@/lib/bronscan");
    const bron = zonderCommentaar(
      readFileSync(join(process.cwd(), "app/actions/subscribe.ts"), "utf8"),
    );
    // Positieve controle: de insert zelf staat er wel.
    expect(bron).toMatch(/\.insert\(\{/);
    expect(bron).not.toMatch(/\.select\(\)/);
    expect(bron).not.toMatch(/\.single\(\)/);
  });

  it("beide formulieren dragen het honeypot-veld dat de actie leest", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    for (const pad of ["components/NewsletterForm.tsx", "components/sections/CtaBig.tsx"]) {
      const bron = readFileSync(join(process.cwd(), pad), "utf8");
      expect(bron, pad).toContain('name="website"');
    }
  });
});
