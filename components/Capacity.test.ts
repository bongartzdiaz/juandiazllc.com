import { describe, it, expect } from "vitest";
import {
  TOTAL_SLOTS,
  SLOTS_REMAINING,
  LAST_VERIFIED,
  MAX_AGE_DAYS,
  quarterLabel,
} from "./Capacity";
import { DICT, LOCALES } from "@/lib/i18n/dict";

// Deze poort bestaat omdat het capaciteitsgetal vier maanden stilstond
// (2026-04-20 → 2026-08-19) terwijl het commentaar erboven volhield dat dit
// geen nep-schaarste is. Een getal dat niemand bijwerkt is precies dat.
//
// De poort meet niet of het getal KLOPT — dat kan alleen Juan tegen zijn
// agenda. Hij meet of iemand er recent naar gekeken hééft. Dat is het
// verschil tussen een claim en een claim van vier maanden oud.
describe("capaciteitssignaal", () => {
  it("LAST_VERIFIED is een geldige ISO-datum", () => {
    expect(LAST_VERIFIED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(LAST_VERIFIED))).toBe(false);
  });

  it(`is in de laatste ${MAX_AGE_DAYS} dagen tegen de agenda gehouden`, () => {
    const dagen = (Date.now() - Date.parse(LAST_VERIFIED)) / 86_400_000;
    expect(
      dagen,
      `SLOTS_REMAINING staat op ${SLOTS_REMAINING}/${TOTAL_SLOTS} en is ${Math.floor(dagen)} ` +
        `dagen niet nagekeken. Zet het getal goed en werk LAST_VERIFIED bij in ` +
        `components/Capacity.tsx. Klopt het nog? Dan alleen de datum.`,
    ).toBeLessThanOrEqual(MAX_AGE_DAYS);
  });

  it("LAST_VERIFIED ligt niet in de toekomst", () => {
    expect(Date.parse(LAST_VERIFIED)).toBeLessThanOrEqual(Date.now());
  });

  it("het aantal vrije plekken past binnen het totaal", () => {
    expect(SLOTS_REMAINING).toBeGreaterThanOrEqual(0);
    expect(SLOTS_REMAINING).toBeLessThanOrEqual(TOTAL_SLOTS);
    expect(TOTAL_SLOTS).toBeGreaterThan(0);
  });

  // De aanleiding voor deze test: het bijschrift zei "één blueprint per
  // kwartaal" terwijl de balk er vier tekende.
  //
  // Bewust een POSITIEVE controle. Mijn eerste opzet was een zwarte lijst
  // ("mag niet 'één ... per kwartaal' bevatten") en die liet de mutatie erdoor:
  // het Nederlandse "Eén" viel buiten het patroon. Een zwarte lijst moet elke
  // spelling raden; deze eist gewoon dat het juiste getal er staat.
  //
  // Assert op DICT[l], niet via translate() — die valt terug op Engels en zou
  // een ontbrekende Nederlandse sleutel niet laten zien.
  const TELWOORD: Record<number, Record<string, string>> = {
    1: { en: "one", nl: "één", de: "ein", es: "un" },
    2: { en: "two", nl: "twee", de: "zwei", es: "dos" },
    3: { en: "three", nl: "drie", de: "drei", es: "tres" },
    4: { en: "four", nl: "vier", de: "vier", es: "cuatro" },
    5: { en: "five", nl: "vijf", de: "fünf", es: "cinco" },
    6: { en: "six", nl: "zes", de: "sechs", es: "seis" },
  };

  it("het bijschrift noemt hetzelfde aantal als de balk tekent", () => {
    const woorden = TELWOORD[TOTAL_SLOTS];
    expect(
      woorden,
      `geen telwoord bekend voor TOTAL_SLOTS=${TOTAL_SLOTS} — vul TELWOORD aan`,
    ).toBeTruthy();

    for (const l of LOCALES) {
      const note = DICT[l]["fomo.capacity.note"];
      expect(note, `fomo.capacity.note ontbreekt in ${l}`).toBeTruthy();
      expect(
        note.toLowerCase().includes(woorden[l]),
        `fomo.capacity.note (${l}) noemt niet "${woorden[l]}" terwijl de balk ` +
          `${TOTAL_SLOTS} plekken tekent: "${note}"`,
      ).toBe(true);
    }
  });
});

describe("quarterLabel", () => {
  // Stond eerder als vaste default "Q3 2026" in de props zonder aanroeper die
  // hem meegaf, dus elke render toonde dat — ook in Q4.
  it.each([
    ["2026-01-01", "Q1 2026"],
    ["2026-03-31", "Q1 2026"],
    ["2026-04-01", "Q2 2026"],
    ["2026-08-19", "Q3 2026"],
    ["2026-09-30", "Q3 2026"],
    ["2026-10-01", "Q4 2026"],
    ["2026-12-31", "Q4 2026"],
    ["2027-01-01", "Q1 2027"],
  ])("%s → %s", (iso, verwacht) => {
    expect(quarterLabel(new Date(`${iso}T12:00:00Z`))).toBe(verwacht);
  });
});
