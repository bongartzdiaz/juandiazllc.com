# Cookie policy

_Last updated: 2026-04-25._

The Philly CRM operates on a **strictly-necessary-only** cookie
posture. We do not set analytics, advertising, or cross-site
tracking cookies, which is why the platform does not display a
cookie-consent banner.

## What we set

| Cookie name        | Set by      | Purpose                                    | Lifetime          | Consent required? |
| ------------------ | ----------- | ------------------------------------------ | ----------------- | ----------------- |
| `sb-access-token`  | Supabase    | Authenticated session — short-lived JWT    | Session / 1 hour  | No (Art. 5(3) ePrivacy exemption — strictly necessary for a service explicitly requested) |
| `sb-refresh-token` | Supabase    | Renews the access token without re-login   | Session / 30 days | No (same exemption)                                                                       |
| `pai-locale`       | Application | Remembers the operator's UI language       | 1 year            | No (preference cookie auto-set on first request from `Accept-Language`; not used to identify the user beyond their language choice) |

We have audited the codebase via `grep -RIn "cookies\\(\\)\\.set\\|Set-Cookie\\|document\\.cookie"`
and confirmed no other cookies are written.

## Why no banner

The ePrivacy Directive (2002/58/EC, as amended) Art. 5(3) requires
prior consent only for cookies that are **not** "strictly necessary
for the provision of an information society service explicitly
requested by the subscriber or user." Both Supabase session cookies
fall under that exemption — without them the operator cannot stay
signed in. The locale cookie is a user-preference cookie; the
European Data Protection Board (EDPB Opinion 04/2012) confirms
preference cookies are exempt where they are not used for tracking.

Since the platform is **cookieless** for analytics, advertising, and
fingerprinting, no consent banner is required under either the GDPR
or the ePrivacy Directive (or the Dutch Telecommunicatiewet which
implements ePrivacy in the Netherlands).

## What changes if we add analytics later

If a future deployment introduces an analytics SDK:

- **Cookieless / first-party / EU-hosted** (e.g. Plausible, Pirsch,
  Fathom): no consent required; document in this file.
- **Cookies + first-party** (e.g. Matomo with cookies enabled): a
  consent UI is required before cookies are written. Use a
  **clear opt-in** (no pre-ticked boxes, no nudge patterns) per
  the EDPB Guidelines 5/2020 on consent.
- **Third-party** (e.g. Google Analytics): full prior consent + a
  Transfer Impact Assessment for the EU→US data flow.

## What changes if we add fingerprinting

Fingerprinting falls under Art. 5(3) the same way cookies do: prior
consent is required. The platform does not fingerprint today.

## Contact

Questions: \<privacy@example.com>.
