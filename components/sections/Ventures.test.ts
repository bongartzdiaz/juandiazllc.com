import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { zonderCommentaar } from "../../lib/bronscan";
import { VENTURES } from "../../lib/ventures";

/* Poort: de homepage-kaarten lezen uit lib/ventures.ts, niet uit een eigen lijst.
 *
 * Aanleiding. Tot 2026-08-21 droeg dit component een tweede VENTURES-array, met
 * href, domeinnaam en een eigen `soon`-vlag erin. `lib/ventures.test.ts` bewaakt
 * dat een venture zonder adres er ook geen toont — alleen leest die poort de
 * andere lijst, dus wat de homepage werkelijk rendert was ongedekt. Dezelfde
 * vorm als #199, waar llms.txt de claim nog droeg die #188 er net had uitgehaald:
 * de reparatie landde op één van de twee plekken en de poort keek naar die ene.
 *
 * De poort leest het bestand als tekst, niet als module. Dat is hetzelfde
 * argument als in ResultsStrip.test.ts — wat telt is wat de geserveerde pagina
 * bevat, niet wat een module toevallig exporteert. Een module-import zou een
 * tweede lijst die ernaast staat niet eens kunnen zien; dat is nu juist het
 * defect dat hier bewaakt wordt. */

const WORTEL = join(__dirname, "..", "..");
const COMPONENT = join(WORTEL, "components", "sections", "Ventures.tsx");
const PAGINA = join(WORTEL, "app", "[locale]", "page.tsx");

const BRON = zonderCommentaar(readFileSync(COMPONENT, "utf8"));

/** De slugs waarvoor het component opmaak vastlegt. */
const OPGEMAAKT = [...BRON.matchAll(/^\s*"([a-z0-9-]+)":\s*\{\s*dictId:/gm)].map((m) => m[1]);

describe("de homepage-kaarten hebben één bron", () => {
  it("leest daadwerkelijk het component", () => {
    // Zonder deze controle slaagt alles hieronder op een lege string zodra het
    // pad verschuift — een poort die niets leest gaat nooit af.
    expect(BRON.length).toBeGreaterThan(500);
    expect(BRON).toContain("v-card");
  });

  it("draagt zelf geen adres meer", () => {
    // Een domeinnaam of URL in dit bestand betekent per definitie dat de feiten
    // hier een tweede keer staan. Ze horen in lib/ventures.ts, waar de gate op
    // status-en-adres eromheen zit.
    expect(BRON, "URL in het component").not.toMatch(/https?:\/\//);
    expect(BRON, "domeinnaam in het component").not.toMatch(/"[a-z0-9-]+\.(nl|com|eu|io|ai|dev)"/);
  });

  it("draagt zelf geen statusvlag meer", () => {
    expect(BRON, "eigen live/soon-vlag").not.toMatch(/\b(live|soon)\s*:\s*(true|false)/);
  });

  it("importeert VENTURES niet — dat zou de hele dataset in de bundel trekken", () => {
    // Dit component is een client-component. Een runtime-import van
    // lib/ventures.ts sleept honderden regels kopij in vier talen mee naar de
    // browser voor vier velden per kaart, en tree-shaking helpt niet omdat
    // VENTURES één aaneengesloten literal is. Alleen het type mag mee; dat is
    // bij het compileren weg.
    expect(BRON).not.toMatch(/import\s*\{[^}]*\bVENTURES\b[^}]*\}\s*from/);
    expect(BRON, "verwacht de feiten als prop").toMatch(/\bkaarten\b/);
  });

  it("legt opmaak vast voor precies de ventures die bestaan", () => {
    const verwacht = VENTURES.map((v) => v.slug).sort();
    expect(OPGEMAAKT.length, "geen enkele opmaakregel gevonden — is het formaat veranderd?").toBe(
      VENTURES.length,
    );
    expect([...OPGEMAAKT].sort(), "opmaaktabel en venture-data lopen uiteen").toEqual(verwacht);
  });

  it("de pagina geeft de kaarten ook werkelijk door", () => {
    // Een prop die niemand vult is een component dat niets rendert. Deze
    // assertie is wat de poort aan de echte pagina koppelt in plaats van aan
    // een component dat los van alles correct is.
    const pagina = zonderCommentaar(readFileSync(PAGINA, "utf8"));
    expect(pagina, "page.tsx importeert de afgeleide niet").toMatch(
      /import\s*\{[^}]*\bventureKaarten\b[^}]*\}\s*from\s*"@\/lib\/ventures"/,
    );
    expect(pagina, "page.tsx geeft kaarten niet door aan <Ventures />").toMatch(
      /<Ventures\s+kaarten=\{ventureKaarten\(\)\}/,
    );
  });
});
