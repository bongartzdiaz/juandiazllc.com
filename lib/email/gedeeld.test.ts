import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { omhulsel, alineaHtml, knopHtml, citaatHtml, KLEUR } from "./huisstijl";

/* Twee verzendpaden, één bron. De edge functions kunnen niets buiten
   supabase/functions/ importeren, dus lib/email/{brevo,huisstijl}.ts staan
   daar als kopie onder _shared/. Dezelfde poort als lib/lead-notify-auth.test.ts
   voor auth.ts: byte-identiek, anders loopt de campagne uit de pas met de
   bevestiging zonder dat iets dat ziet. */

const PAREN = [
  ["lib/email/brevo.ts", "supabase/functions/_shared/brevo.ts"],
  ["lib/email/huisstijl.ts", "supabase/functions/_shared/huisstijl.ts"],
] as const;

describe("lib/email ↔ supabase/functions/_shared", () => {
  it.each(PAREN)("%s is byte-identiek aan %s", (a, b) => {
    const A = readFileSync(a);
    const B = readFileSync(b);
    expect(A.length).toBeGreaterThan(500);
    expect(A.equals(B)).toBe(true);
  });

  it("de gedeelde bestanden importeren niets — anders bundelt Deno ze niet", () => {
    for (const [a] of PAREN) {
      expect(readFileSync(a, "utf8")).not.toMatch(/^\s*import\s/m);
    }
  });
});

describe("huisstijl", () => {
  it("omhulsel escapet alles wat van buiten komt en draagt de blokken in volgorde", () => {
    const html = omhulsel({
      taal: "nl",
      kop: 'Kop <"x">',
      preheader: "Eerste regel & zo",
      blokken: [alineaHtml("Alinea één https://juandiazllc.com/nl"), citaatHtml("<script>"), knopHtml({ tekst: "Ga", url: "https://x.nl/?a=1&b=2" })],
      groet: ["Juan", "info@juandiazllc.com"],
      voet: "voet",
    });
    expect(html).toContain('lang="nl"');
    expect(html).toContain("Kop &lt;&quot;x&quot;&gt;");
    expect(html).toContain("Eerste regel &amp; zo");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('href="https://juandiazllc.com/nl"');
    expect(html).toContain('href="https://x.nl/?a=1&amp;b=2"');
    expect(html.indexOf("Alinea")).toBeLessThan(html.indexOf("&lt;script&gt;"));
    expect(html.indexOf("&lt;script&gt;")).toBeLessThan(html.indexOf('href="https://x.nl'));
    expect(html).toContain(KLEUR.accent);
    expect(html).toContain("Juan<br>info@juandiazllc.com");
  });

  it("geen preheader → geen verborgen blok", () => {
    const html = omhulsel({ taal: "en", kop: "k", blokken: [], groet: [], voet: "" });
    expect(html).not.toContain("display:none");
  });
});
