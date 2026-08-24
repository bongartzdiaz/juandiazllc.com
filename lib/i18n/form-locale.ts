import { LOCALES, type Locale } from "./dict";

/* ─────────────────────────────────────────────────────────────
   De taal van een formulierinzending, veilig gelezen.

   Hij komt uit een verborgen veld en is dus door de client te kiezen. Hij
   bepaalt in welke taal de server action antwoordt en — bij een lead — in
   welke taal de automatische ontvangstbevestiging wordt opgesteld. Hij landt
   ook in de database, dus hij gaat door een whitelist en niet door capField:
   alles buiten de vier ondersteunde talen wordt Engels.

   Stond eerder als eigen kopie in `app/actions/contact.ts`, mét een tweede
   `LOCALES = ["en","nl","de","es"]` naast de canonieke in `dict.ts`. Toen
   `subscribe.ts` dezelfde functie nodig had, zou dat een derde kopie zijn
   geworden — en twee lijsten die hetzelfde beweren lopen uiteen, waarna de
   zwakste bewaakt.
   ───────────────────────────────────────────────────────────── */
export function readLocale(value: FormDataEntryValue | null): Locale {
  const raw = String(value ?? "").trim().slice(0, 2).toLowerCase();
  return (LOCALES as readonly string[]).includes(raw) ? (raw as Locale) : "en";
}
