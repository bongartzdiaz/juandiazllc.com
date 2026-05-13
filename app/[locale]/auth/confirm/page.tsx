import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { translate } from "@/lib/i18n/dict";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { LoginScene } from "@/components/LoginScene";

/* Bundle DH — post-signup "check your email" landing.
 *
 * Reached after /signup when the Supabase project requires email
 * confirmation before issuing a session. The signup action lands the
 * user here with ?email=<address> so we can show the address back
 * to them in case they typo'd it.
 *
 * Robots noindex — same reasoning as /signup + /login: people land
 * here by following a flow, not by searching for it. */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "confirm.meta.title"),
    description: translate(l, "confirm.meta.desc"),
    alternates: buildAlternates(l, "/auth/confirm"),
    robots: { index: false, follow: false },
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

async function ConfirmContent({
  searchParams,
  locale,
}: {
  searchParams: { email?: string };
  locale: string;
}) {
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);
  const email = typeof searchParams.email === "string" ? searchParams.email : "";

  return (
    <div className="auth-card glass">
      <div className="auth-mark" aria-hidden style={{ color: "var(--accent)" }}>
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      </div>

      <div className="auth-eyebrow">
        <span className="dot-pulse" aria-hidden />
        <span>{t("confirm.eyebrow")}</span>
      </div>

      <h1>{t("confirm.title")}</h1>
      <p>{t("confirm.lede")}</p>

      {email && (
        <div className="auth-plan-badge" aria-live="polite">
          <span className="auth-plan-label">{t("confirm.sentToLabel")}</span>
          <span className="auth-plan-value" style={{ wordBreak: "break-all" }}>{email}</span>
        </div>
      )}

      <ul className="auth-checklist" aria-label={t("confirm.checklistLabel")}>
        <li>{t("confirm.step1")}</li>
        <li>{t("confirm.step2")}</li>
        <li>{t("confirm.step3")}</li>
      </ul>

      <div className="auth-alt">
        {t("confirm.troubleQuestion")}{" "}
        <Link href={`/${l}/contact`}>{t("confirm.contactLink")}</Link>
      </div>
    </div>
  );
}

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  return (
    <div className="auth-wrap">
      <LoginScene />
      <Suspense fallback={null}>
        <ConfirmContent searchParams={sp} locale={locale} />
      </Suspense>
    </div>
  );
}
