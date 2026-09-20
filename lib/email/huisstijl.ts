/* De huisstijl van elke mail die namens juandiazllc.com de deur uit gaat.
 *
 * Eén omhulsel voor alle verzendpaden: de scan-reeks (Next.js-cron), de
 * ontvangstbevestiging en de interne melding (edge functions), de
 * nieuwsbriefbevestiging. Dit bestand is BYTE-IDENTIEK aan
 * supabase/functions/_shared/huisstijl.ts; lib/email/gedeeld.test.ts houdt
 * dat vast. Daarom: geen imports, geen env, alleen tekst in en html uit.
 *
 * WAAROM ZO KAAL. Mailclients kennen geen CSS-variabelen, geen webfonts, geen
 * SVG in Gmail, en Outlook rendert met Word. Wat wél overal werkt: tabellen,
 * inline stijlen, systeemfonts en een gekleurde knop van één cel. Het palet is
 * dat van de site (app/globals.css): bos-donkergroen als kopband, de
 * accentkleur op de knop en de scheidingslijn, lichte body zodat de tekst
 * leesbaar blijft in clients die donkere modus negeren.
 *
 * De tekstversie is de bron van de kopij; dit omhulsel voegt alleen vorm toe.
 * Wie een alinea aanpast, doet dat in de aanroeper — niet hier. */

export const KLEUR = {
  bos: "#04150F",
  bosLijn: "#103528",
  accent: "#2EC489",
  accentDonker: "#1A8B60",
  tekst: "#1A1A1A",
  gedempt: "#5F6F67",
  lichtVlak: "#F3F7F5",
  wit: "#FFFFFF",
} as const;

export const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Zet een kale URL in een tekstalinea om naar een link; verder blijft tekst
 *  tekst. Bewust geen markdown: twee vormen van dezelfde kopij lopen uit
 *  elkaar, en de tekstversie is de bron. */
export function alineaHtml(s: string): string {
  const veilig = escapeHtml(s);
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${KLEUR.tekst}">${veilig.replace(
    /https?:\/\/[^\s]+/g,
    (url) => `<a href="${url}" style="color:${KLEUR.accentDonker}">${url}</a>`,
  )}</p>`;
}

/** Een citaatblok: wat de aanvrager zelf schreef, letterlijk en veilig. */
export function citaatHtml(s: string): string {
  return `<div style="white-space:pre-wrap;background:${KLEUR.lichtVlak};border-left:3px solid ${KLEUR.accent};padding:14px 16px;border-radius:0 8px 8px 0;margin:0 0 16px;font-size:15px;line-height:1.55;color:${KLEUR.tekst}">${escapeHtml(s)}</div>`;
}

export type Knop = { tekst: string; url: string };

/** Eén knop, één cel. Bulletproof genoeg voor Outlook zonder VML. */
export function knopHtml(knop: Knop): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td style="background:${KLEUR.accentDonker};border-radius:8px"><a href="${escapeHtml(knop.url)}" style="display:inline-block;padding:13px 22px;font-family:${FONT};font-size:16px;font-weight:600;color:${KLEUR.wit};text-decoration:none">${escapeHtml(knop.tekst)} &rarr;</a></td></tr></table>`;
}

export type Omhulsel = {
  /** `lang` op de html-root. */
  taal: string;
  /** Wat de mail is, boven de kopij: kort, klein, in de kopband. */
  kop: string;
  /** Verborgen eerste regel voor de inbox-preview. Leeg = de eerste alinea. */
  preheader?: string;
  /** Kant-en-klare html-blokken, in volgorde (alineaHtml, citaatHtml, knopHtml). */
  blokken: string[];
  /** Regels van de handtekening, als tekst. */
  groet: string[];
  /** Kleine lettertjes onderaan, als html (mag een link dragen). */
  voet: string;
};

export function omhulsel(o: Omhulsel): string {
  const pre = o.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${KLEUR.wit};opacity:0">${escapeHtml(o.preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>`
    : "";
  const groet = o.groet.map((r) => escapeHtml(r)).join("<br>");
  return [
    `<!doctype html><html lang="${escapeHtml(o.taal)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(o.kop)}</title></head>`,
    `<body style="margin:0;padding:0;background:${KLEUR.lichtVlak};font-family:${FONT}">`,
    pre,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${KLEUR.lichtVlak}"><tr><td align="center" style="padding:24px 12px">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${KLEUR.wit};border-radius:12px;overflow:hidden">`,
    `<tr><td style="background:${KLEUR.bos};padding:18px 28px;border-bottom:3px solid ${KLEUR.accent}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`,
    `<td style="font-family:${FONT};font-size:17px;font-weight:700;letter-spacing:.2px;color:#E8F4EC">Juan Diaz</td>`,
    `<td align="right" style="font-family:${FONT};font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#9ABAA9">${escapeHtml(o.kop)}</td>`,
    `</tr></table></td></tr>`,
    `<tr><td style="padding:28px 28px 8px">`,
    ...o.blokken,
    `<p style="margin:20px 0 0;font-size:16px;line-height:1.6;color:${KLEUR.tekst}">${groet}</p>`,
    `</td></tr>`,
    `<tr><td style="padding:16px 28px 24px;border-top:1px solid #E3EBE7"><p style="margin:0;font-size:12px;line-height:1.5;color:${KLEUR.gedempt}">${o.voet}</p></td></tr>`,
    `</table></td></tr></table></body></html>`,
  ].join("\n");
}
