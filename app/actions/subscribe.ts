"use server";

import { query, isUniqueViolation } from "@/lib/db";
import { notifySubscriber } from "@/lib/notify";

export type SubscribeState = { status: "idle" | "ok" | "err"; message?: string };

/* Nieuwsbriefaanmelding.
   ───────────────────────────────────────────────────────────────────────────
   De melding stond tot 2026-08-11 NIET in dit bestand. Hij kwam uit een
   databasetrigger (`subscribers_notify_new` → `notify_new_lead()`), die via
   `pg_net` de edge function `lead-notify` aanriep. Dat werkte, maar het stond
   nergens in de code: wie dit bestand las, zag een insert en verder niets.

   Met de verhuizing naar Postgres verdwijnt die trigger — `pg_net` is een
   Supabase-extensie. De melding staat nu hier, waar hij hoort: zichtbaar naast
   de handeling die hem veroorzaakt. Zelfde contract als bij contact.ts —
   stil uitgeschakeld zonder env-vars, en fouten worden ingeslikt. De rij staat
   dan al in de database; de melding is een gemak, geen voorwaarde. */

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const source = String(formData.get("source") ?? "landing");

  if (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) === false) {
    return { status: "err", message: "Enter a valid email." };
  }

  try {
    await query(
      `insert into subscribers (email, source) values ($1, $2)`,
      [email, source],
    );
  } catch (err) {
    // Dubbele aanmelding is geen fout maar een bevestiging. `subscribers.email`
    // is uniek; wie zich twee keer opgeeft hoort niet te schrikken.
    if (isUniqueViolation(err)) {
      return { status: "ok", message: "You're already on the list. ✓" };
    }
    return { status: "err", message: "Something went wrong. Try again." };
  }

  await notifySubscriber({ email, source });

  return { status: "ok", message: "Subscribed. Welcome aboard. ✓" };
}
