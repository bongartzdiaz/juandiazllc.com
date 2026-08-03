import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LocaleLink } from "@/components/LocaleLink";
import { SignOutButton } from "@/components/SignOutButton";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "Dashboard",
    description: "Juan Diaz, LLC — Philly dashboard.",
    alternates: buildAlternates(l, "/dashboard"),
    robots: { index: false, follow: false },
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const firstName =
    user.user_metadata?.full_name?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "operator";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "140px 32px 120px" }}>
      {/* Header */}
      <header style={{ marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 11,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 18,
            }}
          >
            {t("dash.eyebrow")}
          </div>
          <h1
            style={{
              fontFamily: "'Inter'",
              fontWeight: 300,
              fontSize: "clamp(44px, 6vw, 84px)",
              letterSpacing: "-.04em",
              lineHeight: 1,
            }}
          >
            {t("dash.welcome.a")} <em>{firstName}</em>{t("dash.welcome.b")}
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: 16,
              marginTop: 16,
              maxWidth: 620,
              lineHeight: 1.6,
            }}
          >
            {t("dash.lede.a")} <b style={{ color: "var(--text)" }}>{user.email}</b>{t("dash.lede.b")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <LocaleLink className="btn ghost" href="/">{t("dash.btn.site")}</LocaleLink>
          <LocaleLink className="btn ghost" href="/app">{t("dash.btn.hub")}</LocaleLink>
          <SignOutButton />
        </div>
      </header>

      {/* Placeholder mount point */}
      <section
        style={{
          minHeight: 480,
          border: "1px dashed var(--line)",
          borderRadius: 18,
          padding: 48,
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(180deg, var(--panel) 0%, var(--bg-2) 100%)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(800px 500px at 50% 0%, rgba(94,255,177,.08), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 11,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--muted-soft)",
              marginBottom: 20,
            }}
          >
            {t("dash.slot.eyebrow")}
          </div>
          <h2
            style={{
              fontFamily: "'Inter'",
              fontWeight: 300,
              fontSize: "clamp(32px, 4vw, 56px)",
              letterSpacing: "-.035em",
              lineHeight: 1.08,
              marginBottom: 18,
              maxWidth: "28ch",
            }}
            dangerouslySetInnerHTML={{ __html: t("dash.slot.title") }}
          />
          <p
            style={{
              color: "var(--muted)",
              fontSize: 17,
              lineHeight: 1.6,
              maxWidth: "62ch",
              marginBottom: 32,
            }}
            dangerouslySetInnerHTML={{ __html: t("dash.slot.body") }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              marginTop: 28,
            }}
          >
            {[
              { label: t("dash.stat.auth.label"), value: t("dash.stat.auth.value"), hint: t("dash.stat.auth.hint") },
              { label: t("dash.stat.user.label"), value: user.email ?? "—", hint: t("dash.stat.user.hint") },
              { label: t("dash.stat.status.label"), value: t("dash.stat.status.value"), hint: t("dash.stat.status.hint") },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  padding: "18px 20px",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  background: "rgba(3,20,15,.4)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono'",
                    fontSize: 10,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "var(--muted-soft)",
                    marginBottom: 6,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--accent)",
                    fontFamily: "'JetBrains Mono'",
                    letterSpacing: ".04em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.hint}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div
        style={{
          marginTop: 32,
          fontFamily: "'JetBrains Mono'",
          fontSize: 11,
          letterSpacing: ".12em",
          color: "var(--muted-soft)",
          textTransform: "uppercase",
        }}
      >
        {t("dash.footer")}
      </div>
    </div>
  );
}
