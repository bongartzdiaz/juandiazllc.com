import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { LoginScene } from "@/components/LoginScene";
import { Suspense } from "react";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "Login",
    description: "Sign in to the Juan Diaz, LLC operator hub.",
    alternates: buildAlternates(l, "/login"),
    robots: { index: false, follow: false },
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <LoginScene />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
