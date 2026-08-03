import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/* Conventiegate: marketingcode gebruikt LocaleLink, niet next/link.
 *
 * De middleware leidt een taalloos pad netjes door, dus een gewone Link werkt
 * gewoon — hij kost alleen een 307 per klik. De audit telde 22 van zulke links
 * op elke pagina. Dat is precies het soort fout dat nooit opvalt tijdens het
 * bouwen en die daarom een gate nodig heeft in plaats van oplettendheid.
 *
 * De test leest de bestanden zelf; hij faalt dus ook op een bestand dat pas
 * volgende maand wordt toegevoegd. */

const WORTEL = join(__dirname, "..", "..");

/** Mag next/link rechtstreeks gebruiken, met reden. */
const UITZONDERINGEN: Record<string, string> = {
  "components/LocaleLink.tsx": "is zelf de wrapper",
  "app/not-found.tsx":
    "valt buiten app/[locale] en dus buiten de LocaleProvider; leest de taal uit de jdl_locale-cookie",
};

function tsxBestanden(map: string): string[] {
  const uit: string[] = [];
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) {
      if (naam === "philly" || naam === "node_modules") continue; // eigen app, geen taalprefix
      uit.push(...tsxBestanden(pad));
    } else if (naam.endsWith(".tsx")) {
      uit.push(pad);
    }
  }
  return uit;
}

const BESTANDEN = [join(WORTEL, "app"), join(WORTEL, "components")]
  .flatMap(tsxBestanden)
  .map((p) => relative(WORTEL, p).split(sep).join("/"))
  .sort();

describe("marketingcode linkt via LocaleLink", () => {
  it("vindt daadwerkelijk bestanden om te controleren", () => {
    // Zonder deze controle zou een kapot pad de hele gate stilzwijgend
    // laten slagen op een lege lijst.
    expect(BESTANDEN.length).toBeGreaterThan(30);
    expect(BESTANDEN).toContain("components/Nav.tsx");
  });

  it("geen enkel bestand importeert next/link buiten de uitzonderingen", () => {
    const overtreders = BESTANDEN.filter((p) => {
      if (p in UITZONDERINGEN) return false;
      return /from "next\/link"/.test(readFileSync(join(WORTEL, p), "utf8"));
    });
    expect(overtreders, `gebruik LocaleLink in: ${overtreders.join(", ")}`).toEqual([]);
  });

  it("elke uitzondering bestaat nog en gebruikt next/link ook echt", () => {
    // Een uitzondering die niets meer uitzondert hoort weg, anders groeit de
    // lijst stilletjes uit tot hij de gate uitholt.
    for (const [pad, reden] of Object.entries(UITZONDERINGEN)) {
      expect(BESTANDEN, `${pad} bestaat niet meer — haal de uitzondering weg`).toContain(pad);
      expect(readFileSync(join(WORTEL, pad), "utf8"), `${pad} (${reden})`).toMatch(/from "next\/link"/);
    }
  });
});
