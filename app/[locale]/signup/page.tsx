import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/SignupForm";
import { LoginScene } from "@/components/LoginScene";
import { translate } from "@/lib/i18n/dict";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

/* Bundle CY — self-service signup.
 *
 * Reuses LoginScene + the same `.auth-wrap` chrome as /login so the
 * two adjacent flows look consistent. Robots noindex because we
 * don't want this page in search results (people should land here
 * via a /pricing CTA, not a Google query).
 *
 * The page is wrapped in Suspense because SignupForm reads from
 * useSearchParams() to pick up `?plan=` — Next 16 requires this. */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "signup.meta.title"),
    description: translate(l, "signup.meta.desc"),
    alternates: buildAlternates(l, "/signup"),
    robots: { index: false, follow: false },
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default function SignupPage() {
  return (
    <div className="auth-wrap">
      <LoginScene />
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
