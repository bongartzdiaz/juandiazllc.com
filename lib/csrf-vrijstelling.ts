/* ─────────────────────────────────────────────────────────────
   Welke API-routes de Origin-controle mogen overslaan.

   Staat los van proxy.ts omdat een middlewarebestand in Next alleen
   `default` en `config` hoort te exporteren; een lijst die een poort moet
   kunnen uitlezen hoort dus niet daar te staan.

   EXACTE PADEN, GEEN VOORVOEGSELS. Tot 2026-08-21 matchte deze lijst met
   `pathname === p || pathname.startsWith(p)`. Daarmee dekte `/api/cal` ook
   `/api/calculator` — op een site met een ROI-rekenmodule geen denkbeeldige
   naam. Wie een hele naamruimte wil vrijstellen zet elk pad er los in. Dat is
   de bedoeling: elke regel hieronder is een gat in de CSRF-verdediging, en
   een gat hoort geteld te kunnen worden.

   Er stonden er vijf op die met het CRM zijn vertrokken (#134/#138):
   `/api/sms/webhook`, `/api/webhooks/inbound/`, `/api/v1/`, `/api/auth/` en
   `/api/health`. De middelste vier waren naamruimtes, en dat is het
   vervelendste soort dode uitzondering: een toekomstige `/api/auth/...` zou
   vanaf zijn eerste dag vrijgesteld zijn geweest zonder dat iemand die keuze
   maakte. Dat de site ooit auth-routes had maakt dat scenario concreet.

   Het criterium om hier te mogen staan: de route authenticeert zichzelf
   (handtekening of sleutel), óf de browser stuurt er geen Origin bij.
   ───────────────────────────────────────────────────────────── */
export const CSRF_VRIJGESTELD: ReadonlySet<string> = new Set([
  // Foutmelder vanaf de client. Onauthenticated, maar begrensd per IP en
  // zonder zijeffect buiten Sentry.
  '/api/log-error',

  // Browsers posten CSP-rapporten zelf; die dragen geen Origin.
  '/api/csp-report',

  // Web Vitals gaan als keepalive-beacon weg bij het verlaten van de pagina;
  // ook daar zit geen Origin op.
  '/api/vitals',

  // cal.com-webhook. Stuurt `Origin: https://cal.com` mee, dus zonder deze
  // regel krijgt élke boeking 403 en draait de handtekeningcontrole nooit.
  // Gemeten op productie 2026-08-02, vóór de uitzondering bestond:
  //   zonder Origin  -> 503 (route werkt, secret nog niet gezet)
  //   met Origin     -> 403 {"error":"Cross-origin request blocked"}
  // Voldoet aan het criterium: HMAC-SHA256 over de rauwe body, en alles
  // zonder geldige handtekening krijgt 401 vóór er iets geschreven wordt.
  '/api/cal',
])

export function isCsrfVrijgesteld(pathname: string): boolean {
  return CSRF_VRIJGESTELD.has(pathname)
}
