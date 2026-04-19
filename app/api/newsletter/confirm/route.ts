import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/dict";

// Newsletter double-opt-in confirmation endpoint.
//
// Flow: the signup action stores an unconfirmed row with a UUID token
// and emails the subscriber a link to this route. We look up the row
// by token, stamp confirmed_at, clear the token (so the link can't be
// replayed), then redirect to the locale-aware home with a success
// query param.
//
// Runs with the Supabase service-role key — the token is the only
// secret that authorises the update, so validation is strict:
// must be a proper UUID, must resolve to an unconfirmed row.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function redirectTo(req: NextRequest, locale: Locale, status: "confirmed" | "invalid") {
  const url = new URL(`/${locale}`, req.nextUrl.origin);
  url.searchParams.set("newsletter", status);
  return NextResponse.redirect(url, 302);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (!UUID_RE.test(token)) {
    return redirectTo(req, DEFAULT_LOCALE, "invalid");
  }

  try {
    const admin = createServiceClient();
    const { data: row, error: selectErr } = await admin
      .from("newsletter_subs")
      .select("email, locale, confirmed_at")
      .eq("confirm_token", token)
      .maybeSingle();

    if (selectErr || !row) {
      return redirectTo(req, DEFAULT_LOCALE, "invalid");
    }

    const locale: Locale = (LOCALES as readonly string[]).includes(row.locale)
      ? (row.locale as Locale)
      : DEFAULT_LOCALE;

    // Idempotent: if already confirmed, still redirect to the success page.
    if (row.confirmed_at) {
      return redirectTo(req, locale, "confirmed");
    }

    const { error: updateErr } = await admin
      .from("newsletter_subs")
      .update({ confirmed_at: new Date().toISOString(), confirm_token: null })
      .eq("confirm_token", token);

    if (updateErr) {
      console.error("[newsletter/confirm] update failed:", updateErr.message);
      return redirectTo(req, locale, "invalid");
    }

    return redirectTo(req, locale, "confirmed");
  } catch (e) {
    console.error("[newsletter/confirm] exception:", e);
    return redirectTo(req, DEFAULT_LOCALE, "invalid");
  }
}
