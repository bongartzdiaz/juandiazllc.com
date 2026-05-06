---
name: auth-flow
description: Bouw of audit een authenticatie-flow met Supabase Auth — email/password, magic-link, OAuth (Google/Microsoft), MFA, password-reset, session-refresh. Stack-aware (PT, HMB Dashboard, Philly). Volgt PT auth-pattern (Type A JWT vs Type B vault) en compliance-defaults. Gebruik wanneer Juan vraagt "voeg login toe", "MFA implementeren", of bij audit van bestaande auth.
trigger: /auth-flow
---

# /auth-flow

Auth-bouw of -audit met Supabase Auth als basis. Geen custom JWT-stack tenzij echt nodig.

## Usage

```
/auth-flow <doel>
/auth-flow <doel> --stack <pt|hmb|philly|generic>
/auth-flow <doel> --method <password|magic-link|oauth|mfa|otp|sso>
/auth-flow <doel> --provider <google|microsoft|github|apple>     # voor oauth
```

## Hard rules

### Stack-keuzes

- **Supabase Auth** als default — built-in, integreert met RLS
- **NextAuth/Auth.js** alleen als Supabase niet kan (multi-provider exotisch, Vercel KV-sessions)
- **Geen custom JWT** zonder concrete reden — beheer-overhead niet waard
- **Service-role key NOOIT client-side** — altijd via API-route met server-side check

### Session-management
- **Cookies httpOnly + secure + sameSite=Lax** (Strict bij high-sensitivity)
- **Refresh-token rotation** ingeschakeld in Supabase dashboard
- **Session TTL**: 1 uur access-token, 30 dagen refresh-token (Supabase default)
- **Idle-timeout** voor admin-rollen (forceer re-login na 30 min idle)

### Password requirements
- Min 8 karakters (Supabase default; overweeg 10+ voor admin)
- Complexity-check (Supabase: leaked-password protection AAN — advisor warnt anders)
- Geen plain-text storage (Supabase doet dit goed)
- Reset-flow: email-link, geen password-vraag aan support

### MFA
- **TOTP (authenticator-app)** als default, niet SMS (sms-MFA is unsafe per NIST)
- Backup codes bij setup (10× one-time)
- Re-auth vereist voor disable MFA
- Verplicht voor `admin` + `super_admin` rollen

## Patronen

### Email/password — Next.js App Router

```ts
// app/(auth)/login/page.tsx
"use client";
import { createClient } from "@/lib/supabase/client";

async function handleLogin(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "credentials" };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "unconfirmed" };
    }
    return { error: "unknown" };
  }
  return { ok: true, user: data.user };
}
```

### Magic-link — passwordless

```ts
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
});
```

```ts
// app/auth/callback/route.ts
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
```

### OAuth (Google/Microsoft)

```ts
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    queryParams: { access_type: "offline", prompt: "consent" },
  },
});
```

Provider-config in Supabase dashboard → Auth → Providers.

### MFA TOTP — enrollment

```ts
// app/(app)/settings/mfa/page.tsx
async function enrollMfa() {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw error;
  // data.totp.qr_code → toon aan user, scan met Google Authenticator etc
  // data.totp.secret → backup voor user
  return { factorId: data.id, qrCode: data.totp.qr_code };
}

async function verifyEnrollment(factorId: string, code: string) {
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error) throw challenge.error;
  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  return verify;
}
```

### MFA challenge bij login

```ts
// Na successful password-login, check of MFA actief is:
const { data: { aal } } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
if (aal === "aal1" && hasMfaFactors) {
  // Toon MFA-challenge UI
} else {
  // Volledig ingelogd
}
```

### Password reset

```ts
// Stap 1: gebruiker vraagt reset
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/auth/reset`,
});

// Stap 2: gebruiker komt op /auth/reset met access_token in URL fragment
// Supabase client detecteert dit auto, dan:
await supabase.auth.updateUser({ password: newPassword });
```

### Logout

```ts
await supabase.auth.signOut();
// Of voor server-side:
await supabase.auth.signOut({ scope: "global" });  // alle sessies, alle devices
```

## Server-side auth check (Next.js)

```ts
// middleware.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options: CookieOptions) => res.cookies.set({ name, value, ...options }),
        remove: (name, options: CookieOptions) => res.cookies.set({ name, value: "", ...options }),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes
  if (req.nextUrl.pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/public).*)"],
};
```

## Role-based access (RBAC)

```sql
-- profiles tabel met role
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','manager','admin','super_admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- helper-fn voor RLS
CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = p_role
  );
$$;
```

```ts
// In page-component:
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    redirect("/dashboard?error=unauthorized");
  }

  return <AdminContent />;
}
```

NIET: alleen client-side role-check (kan via DevTools omzeild — zie [[project_pt_security_todo]] SEC-12).

## OTP (telefoon-verificatie) — apart traject

Voor OTP/SMS-flow zoals HMB telemarketing-2026: zie [[project_hmb_otp_telemarketing_2026]]. Niet hetzelfde als auth — is consent-bewijs voor lead-form, niet user-login.

## Audit-checklist voor bestaande auth

- [ ] Wachtwoorden hash-only opgeslagen (Supabase: ja default)
- [ ] Leaked-password protection AAN (advisor warnt anders)
- [ ] Email-confirm verplicht op signup
- [ ] Reset-link expires < 1 uur
- [ ] MFA optie aanwezig + verplicht voor admin
- [ ] Session-cookies httpOnly + secure + sameSite
- [ ] Logout invalidates sessie server-side
- [ ] Geen credentials in URLs / logs
- [ ] Brute-force protection: IP-based rate-limit op /login
- [ ] CSRF-protection op state-changing endpoints (Next.js handelt automatisch met same-site)
- [ ] Auth-events gelogd (login, logout, MFA enroll, password reset)
- [ ] Profile-edit vereist re-auth voor email-wijziging
- [ ] Account-delete flow verwijdert PII over alle systemen (zie /audit-leads vergetelheid-checklist)

## Output flow
1. **Brief** — bevestig stack, method, scope (build vs audit)
2. **Architecture-diagram** als build (1-2 paragrafen)
3. **Files** — code per file met complete imports + types
4. **DB-migraties** als nieuwe `profiles`/`roles` nodig is
5. **Env-vars** — wat moet in `.env`
6. **Test-plan** — login + reset + MFA + logout + edge cases
7. **Compliance-flag** — bewaartermijn auth-events, GDPR-rechten

## Combineer met
- `/db-migration` — voor profiles + RLS-helpers
- `/api-route` — voor admin endpoints
- `/security-baseline` — voor pre-launch audit
- `/audit-leads` — voor account-delete vergetelheid-flow
