import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/philly/SignOutButton";
import Link from "next/link";

export const metadata: Metadata = { title: "Ops hub" };
export const dynamic = "force-dynamic";

export default async function AppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app");

  const firstName = user.email?.split("@")[0] ?? "operator";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "140px 32px 120px" }}>
      <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 20 }}>
        ◉ Philly ops hub · pre-pilot
      </div>
      <h1 style={{ fontWeight: 300, fontSize: "clamp(48px, 7vw, 92px)", letterSpacing: "-.04em", lineHeight: 1 }}>
        Welcome, <em>{firstName}</em>.
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 17, marginTop: 20, maxWidth: 640, lineHeight: 1.6 }}>
        Signed in as <b style={{ color: "var(--text)" }}>{user.email}</b>. The Philly dispatch
        surface lands here after pilot. For now, use this hub to jump across the ventures.
      </p>

      <div
        style={{
          marginTop: 48,
          padding: 32,
          border: "1px solid var(--line)",
          borderRadius: 18,
          background: "linear-gradient(180deg, var(--panel), var(--bg-2))",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(500px 300px at 50% 0%, rgba(94,255,177,.08), transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 14 }}>
            ◉ Dispatch surface
          </div>
          <Link
            href="/app/jobs"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "18px 22px",
              border: "1px solid var(--accent)",
              borderRadius: 12,
              background: "rgba(94,255,177,.06)",
              marginBottom: 20,
              transition: "all .3s var(--ease)",
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, color: "var(--accent)" }}>Jobs board →</div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--muted-soft)", letterSpacing: ".08em", marginTop: 4 }}>
                Live · create, assign, track
              </div>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, letterSpacing: ".14em", color: "var(--accent)", textTransform: "uppercase" }}>
              Enter
            </span>
          </Link>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted-soft)", marginTop: 28, marginBottom: 14 }}>
            ◉ Coming online
          </div>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14, padding: 0 }}>
            {[
              { name: "Field client (PWA)", status: "In build", hint: "Offline-first" },
              { name: "Live map + routing", status: "Scoping", hint: "Phase 2" },
              { name: "Operator analytics", status: "Scoping", hint: "Phase 3" },
            ].map((item, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  background: "rgba(3,20,15,.4)",
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--muted-soft)", letterSpacing: ".08em", marginTop: 2 }}>
                    {item.hint}
                  </div>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)", padding: "4px 10px", border: "1px solid var(--accent)", borderRadius: 999, background: "rgba(94,255,177,.06)" }}>
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap" }}>
        <a className="btn primary" href="https://diaz.juandiazllc.com/app">
          ◉ Diaz · Master Command →
        </a>
        <a className="btn ghost" href="https://juandiazllc.com/app">
          ← Operator hub
        </a>
        <Link className="btn ghost" href="/">
          ← Back to site
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}
