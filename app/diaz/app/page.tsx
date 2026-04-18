import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/diaz/SignOutButton";
import Link from "next/link";
import { buildGreeting } from "@/lib/greeting";

export const metadata: Metadata = { title: "DEUS Dashboard" };
export const dynamic = "force-dynamic";

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/diaz/login?next=/diaz/app");

  const { greeting, firstName } = buildGreeting({
    fullName: user.user_metadata?.full_name,
    email: user.email,
    preferredLocale: user.user_metadata?.preferred_locale,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top bar — auth context above the embedded dashboard */}
      <div
        style={{
          position: "fixed",
          top: 56,
          left: 0,
          right: 0,
          zIndex: 40,
          padding: "10px 20px",
          background: "rgba(3,20,15,.85)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 10.5,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            ◉ DEUS · LIVE
          </span>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {greeting}, <em style={{ color: "var(--accent)", fontFamily: "'Instrument Serif', serif" }}>{firstName}</em>
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn ghost" href="/diaz/app/jobs" style={{ padding: "8px 14px", fontSize: 11 }}>
            Jobs board →
          </Link>
          <Link className="btn ghost" href="/" style={{ padding: "8px 14px", fontSize: 11 }}>
            ← Site
          </Link>
          <SignOutButton />
        </div>
      </div>

      {/* The DEUS dashboard, embedded full-bleed */}
      <iframe
        src="/diaz/dashboard.html"
        title="DEUS Dashboard"
        style={{
          flex: 1,
          width: "100%",
          height: "calc(100vh - 110px)",
          border: 0,
          marginTop: 110,
          background: "var(--bg)",
        }}
      />
    </div>
  );
}
