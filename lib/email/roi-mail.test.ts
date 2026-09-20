import { describe, it, expect } from "vitest";
import { bouwRoiMail, markeerRoiVerzonden, roiMailNodig } from "./roi-mail";
import { LOCALES, translate } from "@/lib/i18n/dict";
import { ROI_VELDEN, type RoiGetallen, type RoiVeld } from "@/lib/roi-opvang";
import { BOOKING_15MIN } from "@/lib/booking";

/* De ene ROI-mail: leest de gebouwde mail, niet de bestandstekst.
 *
 * Wat hier telt: de mail draagt de getallen die de bezoeker zag, in zijn
 * taal, met een afmeldlink die het token draagt; oneindig wordt "—"; de
 * batterijregels staan er alleen als de batterij aanstond; en het stempel
 * is idempotent. */

function getallen(extra: Partial<RoiGetallen> = {}): RoiGetallen {
  const g = Object.fromEntries((Object.keys(ROI_VELDEN) as RoiVeld[]).map((k) => [k, null])) as RoiGetallen;
  return {
    ...g,
    consumption: 3500,
    systemSize: 4,
    systemPrice: 5000,
    consumerPrice: 0.3,
    feedInPrice: 0.05,
    yieldPerKwp: 900,
    withBattery: 0,
    scNoBat: 0.3,
    production: 3600,
    savingsSald: 1080,
    savingsNoBat: 441,
    paybackSald: 4.6,
    paybackNoBat: 11.3,
    ...extra,
  };
}

const basis = { consent_at: "2026-09-20T12:00:00Z", unsub_token: "tok-123" };

/** Intl zet een vaste spatie (U+00A0) tussen € en het getal; de asserties
 *  hieronder lezen gewone spaties, dus normaliseren we vóór het vergelijken. */
const plat = (s: string) => s.replace(/\u00a0/g, " ");

describe("bouwRoiMail", () => {
  it("draagt de getallen, de labels van de pagina en de afmeldlink — in het Nederlands", () => {
    const m = bouwRoiMail({ locale: "nl", roi: getallen(), ...basis });
    expect(m.onderwerp).toContain("11,3");
    expect(m.text).toContain(translate("nl", "roi.f.consumption"));
    expect(m.text).toContain("3.500");
    expect(plat(m.text)).toContain("€ 441");
    expect(m.text).toContain("token=tok-123");
    expect(m.html).toContain("token=tok-123");
    expect(m.html).toContain(BOOKING_15MIN);
    expect(m.html).toContain('lang="nl"');
    // Geen batterijregels als de batterij uitstond.
    expect(m.text).not.toContain(translate("nl", "roi.f.batterySize"));
    expect(m.text).not.toContain(translate("nl", "roi.sc.withBat"));
  });

  it("toont de batterijregels en kiest de batterij-terugverdientijd in het onderwerp", () => {
    const m = bouwRoiMail({
      locale: "en",
      roi: getallen({ withBattery: 1, batterySize: 10, batteryPrice: 6000, scWithBat: 0.65, savingsWithBat: 802, paybackWithBat: 13.7 }),
      ...basis,
    });
    expect(m.onderwerp).toContain("13.7");
    expect(m.text).toContain(translate("en", "roi.f.batterySize"));
    expect(m.text).toContain(translate("en", "roi.sc.withBat"));
  });

  it("maakt van null een streepje, nooit een nul", () => {
    const m = bouwRoiMail({ locale: "nl", roi: getallen({ paybackNoBat: null, savingsNoBat: null }), ...basis });
    expect(m.onderwerp).toContain("—");
    // De scenarioregel zonder batterij: bedrag én terugverdientijd zijn "—".
    const regel = plat(m.text).split("\n").find((r) => r.startsWith(translate("nl", "roi.sc.noBat")));
    expect(regel).toBeDefined();
    expect(regel).toContain("— / jaar");
    expect(regel).not.toMatch(/€ 0(?![,.\d])/);
  });

  it("valt terug op Engels bij een onbekende taal", () => {
    const m = bouwRoiMail({ locale: "xx", roi: getallen(), ...basis });
    expect(m.html).toContain('lang="en"');
    expect(m.text).toContain(translate("en", "roi.mail.intro"));
  });

  it("bouwt in alle vier de talen zonder onvervangde plaatshouders", () => {
    for (const loc of LOCALES) {
      const m = bouwRoiMail({ locale: loc, roi: getallen(), ...basis });
      for (const s of [m.onderwerp, m.text, m.html]) {
        expect(s, loc).not.toMatch(/\{(payback|datum|link|kwh)\}/);
      }
      expect(m.text, loc).toContain("2026");
    }
  });

  it("escapet html in de tekstvelden", () => {
    const m = bouwRoiMail({ locale: "nl", roi: getallen(), consent_at: "<b>", unsub_token: "<script>" });
    expect(m.html).not.toContain("<script>");
    expect(m.html).not.toContain("<b>");
  });
});

describe("planning", () => {
  it("nodig zolang er geen stempel of afmelding is", () => {
    expect(roiMailNodig({})).toBe(true);
    expect(roiMailNodig({ verzonden: "2026-09-20T08:00:00Z" })).toBe(false);
    expect(roiMailNodig({ unsubscribed_at: "2026-09-20T08:00:00Z" })).toBe(false);
    expect(roiMailNodig({ verzonden: "" })).toBe(true);
  });

  it("stempelt zonder de rest van de metadata aan te raken", () => {
    const nu = new Date("2026-09-21T08:00:00Z");
    const m = markeerRoiVerzonden({ locale: "de", roi: { a: 1 } }, nu);
    expect(m).toEqual({ locale: "de", roi: { a: 1 }, verzonden: "2026-09-21T08:00:00.000Z" });
    expect(roiMailNodig(m)).toBe(false);
  });
});
