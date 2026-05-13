"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/* Bundle CY — self-service signup server action.
 * ─────────────────────────────────────────────
 * Marketing-side `/signup?plan=<slug>` posts here. The server action:
 *   1. Validates inputs (name + email + password + consent + plan)
 *   2. Calls Supabase `auth.signUp` to create the auth user
 *   3. Redirects to `/philly/welcome?plan=<slug>` so Bundle CZ's
 *      onboarding wizard can create the Org/Membership + start the
 *      Stripe Checkout against the chosen plan.
 *
 * If Supabase isn't configured (CI smoke / dev / marketing-only
 * deploys), the action returns an error and the user sees a clear
 * "signup unavailable on this deployment" message — no 500.
 *
 * Consent: the marketing-checkbox is NEVER pre-checked per
 * /auth-flow skill conventions; we hard-reject submissions where
 * `consent` !== 'on'. Privacy link rendered inline.
 *
 * Conventions followed:
 *   - /ui-form skill: server-side validation on every field
 *   - /auth-flow skill: Supabase Auth as default; no custom JWT
 *   - existing repo patterns: `useActionState` + (prev, formData)
 *     signature mirroring `app/actions/auth.ts:signInWithPassword`. */

export type SignupState = { status: "idle" | "ok" | "err"; message?: string };

// Same plan slugs as `/[locale]/pricing` + `lib/philly/billing/plans.ts`.
// Kept inline (no shared import from the standalone app) so the
// marketing-side server action stays independently deployable.
const VALID_PLANS = ["operator", "team", "business"] as const;
type Plan = (typeof VALID_PLANS)[number];
function isValidPlan(p: unknown): p is Plan {
  return typeof p === "string" && (VALID_PLANS as readonly string[]).includes(p);
}

// Email regex — bounded quantifiers, same ReDoS-safe pattern used in
// the standalone `/api/me` validator after Bundle CP.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{1,63}$/;
const MAX_EMAIL_LEN = 320;
const MIN_PASSWORD_LEN = 8;
const MAX_PASSWORD_LEN = 256;
const MAX_NAME_LEN = 120;

export async function signUpWithPassword(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const plan = String(formData.get("plan") ?? "");
  const consent = String(formData.get("consent") ?? "");
  const locale = String(formData.get("locale") ?? "en");

  if (!name || name.length > MAX_NAME_LEN) {
    return { status: "err", message: "Enter your full name (max 120 characters)." };
  }
  if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
    return { status: "err", message: "Enter a valid email address." };
  }
  if (!password || password.length < MIN_PASSWORD_LEN) {
    return { status: "err", message: `Password must be at least ${MIN_PASSWORD_LEN} characters.` };
  }
  if (password.length > MAX_PASSWORD_LEN) {
    return { status: "err", message: "Password is unreasonably long." };
  }
  if (!isValidPlan(plan)) {
    return { status: "err", message: "Choose a plan from the pricing page first." };
  }
  // Marketing-checkbox is NEVER pre-checked (telemarketing-2026 +
  // GDPR Art. 7 freely-given consent). HTML form-encoding sends
  // checked boxes as "on"; anything else means the user didn't tick it.
  if (consent !== "on") {
    return { status: "err", message: "You must agree to the terms + privacy policy to continue." };
  }

  // The Supabase env vars are absent on marketing-only / smoke
  // deploys (see lib/supabase/middleware.ts no-op path).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      status: "err",
      message: "Signup is not enabled on this deployment yet. Contact juan@juandiazllc.com.",
    };
  }

  // Bundle DH — branch on whether Supabase issued a session (email
  // confirmation disabled in the project) or not (email confirmation
  // enabled — the user must click a link before they can sign in).
  // The previous version redirected straight to /philly/welcome
  // regardless, which 401'd in the email-confirmation case because
  // the create-org route requires an authenticated session.
  let needsEmailConfirmation = false
  try {
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";
    // emailRedirectTo routes through /auth/callback so the code can
    // be exchanged for a session before the user lands on /philly/welcome.
    const next = `/philly/welcome?plan=${plan}&new=1`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        // User-metadata is replicated into the Supabase auth user's
        // raw_user_meta_data column and surfaces in the JWT. Bundle CZ
        // reads this to pre-fill the onboarding wizard.
        data: { full_name: name, plan, signup_locale: locale },
      },
    });
    if (error) {
      // Common cases: user-already-exists, password-too-weak,
      // rate-limit. Pass through the Supabase message — it's already
      // user-friendly enough for the form-error area.
      return { status: "err", message: error.message };
    }
    // No session = email confirmation flow. data.user exists with an
    // unconfirmed email; data.session is null until they click the link.
    needsEmailConfirmation = !data.session;
  } catch {
    return { status: "err", message: "Network error. Try again in a moment." };
  }

  if (needsEmailConfirmation) {
    redirect(`/${locale}/auth/confirm?email=${encodeURIComponent(email)}`);
  }
  redirect(`/${locale}/philly/welcome?plan=${plan}&new=1`);
}
