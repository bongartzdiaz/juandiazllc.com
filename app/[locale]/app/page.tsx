import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { VENTURES, getVentures } from "@/lib/ventures";
import { LocaleLink } from "@/components/LocaleLink";
import { buildGreeting } from "@/lib/greeting";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "Operator hub",
    description: "Juan Diaz, LLC internal hub.",
    alternates: buildAlternates(l, "/app"),
    robots: { index: false, follow: false },
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export const dynamic = "force-dynamic";

function daysUntil2027() {
  const target = new Date("2027-01-01T00:00:00+01:00").getTime();
  return Math.max(0, Math.floor((target - Date.now()) / 86400000));
}

type Lead = {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  sector: string | null;
  message: string | null;
  created_at: string;
};

export default async function AppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app");

  const [subCountRes, leadCountRes, recentLeadsRes] = await Promise.all([
    supabase.from("subscribers").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id,name,email,company,sector,message,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const subCount = subCountRes.count ?? 0;
  const leadCount = leadCountRes.count ?? 0;
  const recentLeads = (recentLeadsRes.data ?? []) as Lead[];

  const { greeting, firstName } = buildGreeting({
    fullName: user.user_metadata?.full_name,
    email: user.email,
    preferredLocale: user.user_metadata?.preferred_locale,
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "140px 32px 120px" }}>
      <header data-reveal style={{ marginBottom: 56 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 11,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 20,
          }}
        >
          {t("app.eyebrow")}
        </div>
        <h1
          style={{
            fontFamily: "'Inter'",
            fontWeight: 300,
            fontSize: "clamp(48px, 7vw, 96px)",
            letterSpacing: "-.04em",
            lineHeight: 1,
          }}
        >
          {greeting}, <em>{firstName}</em>.
        </h1>
        <p
          style={{
            color: "var(--muted)",
            fontSize: 17,
            marginTop: 20,
            maxWidth: 640,
            lineHeight: 1.6,
          }}
        >
          {t("app.lede.a")}{" "}
          <b style={{ color: "var(--text)" }}>{user.email}</b>
          {t("app.lede.b")}
        </p>
      </header>

      {/* Stats strip */}
      <div
        data-reveal
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 0,
          border: "1px solid var(--line)",
          borderRadius: 18,
          overflow: "hidden",
          background: "linear-gradient(180deg, var(--panel), var(--bg-2))",
          marginBottom: 56,
        }}
      >
        {[
          { l: t("app.stat.subs"), n: subCount.toString() },
          { l: t("app.stat.leads"), n: leadCount.toString() },
          { l: t("app.stat.days"), n: daysUntil2027().toString() },
          { l: t("app.stat.ventures"), n: VENTURES.filter((v) => v.status === "live").length.toString() },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              padding: "36px 28px",
              borderRight: i < 3 ? "1px solid var(--line)" : "none",
            }}
          >
            <div
              style={{
                fontFamily: "'Inter'",
                fontWeight: 300,
                fontSize: "clamp(40px, 5vw, 64px)",
                letterSpacing: "-.04em",
                lineHeight: 1,
                color: "var(--accent)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.n}
            </div>
            <div
              style={{
                marginTop: 10,
                fontFamily: "'JetBrains Mono'",
                fontSize: 11,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {/* Recent leads + Ventures shortcuts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 16,
          marginBottom: 56,
        }}
      >
        {/* Recent leads */}
        <section
          data-reveal
          style={{
            border: "1px solid var(--line)",
            borderRadius: 18,
            padding: 28,
            background: "var(--panel)",
            minHeight: 360,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 20,
            }}
          >
            <div>
              <div className="label">{t("app.leads.eyebrow")}</div>
              <h2
                style={{
                  fontFamily: "'Inter'",
                  fontWeight: 400,
                  fontSize: 28,
                  letterSpacing: "-.02em",
                  marginTop: 6,
                }}
                dangerouslySetInnerHTML={{ __html: t("app.leads.title") }}
              />
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono'",
                fontSize: 11,
                letterSpacing: ".12em",
                color: "var(--muted-soft)",
                textTransform: "uppercase",
              }}
            >
              {t("app.leads.last5")}
            </span>
          </div>

          {recentLeads.length === 0 ? (
            <div
              style={{
                padding: "40px 0",
                color: "var(--muted-soft)",
                fontFamily: "'JetBrains Mono'",
                fontSize: 12,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              {t("app.leads.empty")}
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 0 }}>
              {recentLeads.map((lead, i) => (
                <li
                  key={lead.id}
                  style={{
                    padding: "16px 0",
                    borderTop: i > 0 ? "1px solid var(--line)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>
                      {lead.name ?? lead.email}
                      {lead.company && (
                        <span style={{ color: "var(--muted-soft)", fontWeight: 400, marginLeft: 8 }}>
                          · {lead.company}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono'",
                        fontSize: 10,
                        color: "var(--muted-soft)",
                        letterSpacing: ".08em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(lead.created_at).toLocaleDateString("en-GB", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  {lead.sector && (
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono'",
                        fontSize: 10,
                        color: "var(--accent)",
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {lead.sector}
                    </div>
                  )}
                  {lead.message && (
                    <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
                      {lead.message.length > 220 ? lead.message.slice(0, 220) + "…" : lead.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Venture shortcuts */}
        <aside
          data-reveal
          style={{
            border: "1px solid var(--line)",
            borderRadius: 18,
            padding: 28,
            background: "var(--panel)",
          }}
        >
          <div className="label">{t("app.ventures.eyebrow")}</div>
          <h2
            style={{
              fontFamily: "'Inter'",
              fontWeight: 400,
              fontSize: 28,
              letterSpacing: "-.02em",
              marginTop: 6,
              marginBottom: 18,
            }}
            dangerouslySetInnerHTML={{ __html: t("app.ventures.title") }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {getVentures(l).map((v) => (
              <a
                key={v.slug}
                href={v.external}
                target={v.external.startsWith("http") ? "_blank" : undefined}
                rel={v.external.startsWith("http") ? "noopener noreferrer" : undefined}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "rgba(3,20,15,.4)",
                  transition: "all .3s var(--ease)",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{v.name}</div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono'",
                      fontSize: 10,
                      color: "var(--muted-soft)",
                      letterSpacing: ".08em",
                      marginTop: 2,
                    }}
                  >
                    {v.domain}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono'",
                    fontSize: 10,
                    letterSpacing: ".12em",
                    color: v.status === "live" ? "var(--accent)" : "var(--warn)",
                    textTransform: "uppercase",
                  }}
                >
                  {v.status === "live" ? t("app.ventures.live") : t("app.ventures.shipping")}
                </span>
              </a>
            ))}
          </div>
        </aside>
      </div>

      {/* Account row */}
      <section
        data-reveal
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 28px",
          border: "1px solid var(--line)",
          borderRadius: 14,
          background: "var(--bg-2)",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div className="label" style={{ marginBottom: 6 }}>{t("app.acct.eyebrow")}</div>
          <div style={{ fontSize: 15 }}>
            {t("app.acct.signedInAs")} <b>{user.email}</b>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <LocaleLink className="btn primary" href="/philly">
            {t("app.btn.master")}
          </LocaleLink>
          <LocaleLink className="btn ghost" href="/philly/deals">
            {t("app.btn.dispatch")}
          </LocaleLink>
          <LocaleLink className="btn ghost" href="/">
            {t("app.btn.back")}
          </LocaleLink>
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
