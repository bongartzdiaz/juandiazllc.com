"use server";

import { createClient } from "@/lib/supabase/server";
import { capField, isPlausibleEmail } from "@/lib/forms/limits";
import { translate } from "@/lib/i18n/dict";
import { readLocale } from "@/lib/i18n/form-locale";
import { randomUUID } from "node:crypto";
import { bouwNieuwsbriefMetadata } from "@/lib/nieuwsbrief";

export type SubscribeState = { status: "idle" | "ok" | "err"; message?: string };

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  // Begrensd — zie lib/forms/limits.ts. subscribers.email + .source zijn
  // ongelimiteerde text-kolommen met een anon-INSERT-policy.
  const email = capField(formData.get("email"), "email").toLowerCase();
  const source = capField(formData.get("source"), "source") || "landing";
  const locale = readLocale(formData.get("locale"));

  // Honeypot. NewsletterForm draagt het veld sinds 2026-07-21, maar niets las
  // het: een bot die het invulde werd gewoon ingeschreven. Zelfde antwoord als
  // contact.ts en scan-opvang.ts -- nep-ok, zodat de bot niets leert.
  if (formData.get("website")) {
    return { status: "ok", message: translate(locale, "form.ok.subscribed") };
  }

  if (!isPlausibleEmail(email)) {
    return { status: "err", message: translate(locale, "form.err.email") };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("subscribers")
      // Kale insert. `anon` heeft op marketing.subscribers alleen INSERT
      // (gemeten 2026-08-21); een `.select()` erachter vraagt RETURNING en
      // dus SELECT, wat 42501 geeft en de rij terugdraait terwijl elke test
      // groen blijft -- de mock geeft terug wat je vraagt. Zelfde vorm als
      // contact.ts en scan-opvang.ts.
      // De metadata is wat /api/uitschrijven en een campagne-selectie lezen:
      // zonder `unsub_token` is de afmeldlink voor deze rij dood. Vorm en
      // veldnamen gelijk aan de scan-inschrijving (lib/scan-opvang.ts).
      .insert({
        email,
        source,
        metadata: bouwNieuwsbriefMetadata({
          locale,
          source,
          nu: new Date(),
          token: randomUUID(),
        }),
      });

    if (error) {
      // Duplicate → still treat as success for the user
      if (error.code === "23505") {
        return { status: "ok", message: translate(locale, "form.ok.already") };
      }
      return { status: "err", message: translate(locale, "form.err.generic") };
    }

    return { status: "ok", message: translate(locale, "form.ok.subscribed") };
  } catch {
    // Zelfde tak als in contact.ts, met dezelfde meting erachter: hier landt
    // een `createClient()` die gooit op ontbrekende configuratie, niet een
    // netwerkstoring -- die geeft supabase-js terug als `{ error }` hierboven.
    return { status: "err", message: translate(locale, "form.err.unavailable") };
  }
}
