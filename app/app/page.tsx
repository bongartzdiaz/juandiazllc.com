import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "Operator hub",
  description: "Juan Diaz LLC internal hub.",
};

export default async function AppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app");

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 640 }}>
        <h1>You&apos;re <em>in.</em></h1>
        <p>
          Signed in as <b style={{ color: "var(--text)" }}>{user.email}</b>. This is the stub for the
          Juan Diaz LLC operator hub — dashboards for Voltafy, Philly, and the other ventures will
          surface here as they come online.
        </p>

        <div
          style={{
            marginTop: 32,
            padding: 20,
            border: "1px solid var(--line)",
            borderRadius: 12,
            background: "rgba(3,20,15,.5)",
            position: "relative",
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 12 }}>
            ◉ Coming online
          </div>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, padding: 0, margin: 0 }}>
            <li style={{ color: "var(--muted)", fontSize: 14 }}>— hmb.juandiazllc.com · HMB Energy Ops</li>
            <li style={{ color: "var(--muted)", fontSize: 14 }}>— philly.juandiazllc.com · Philly field ops</li>
            <li style={{ color: "var(--muted)", fontSize: 14 }}>— voltafy.nl · Solar platform</li>
            <li style={{ color: "var(--muted)", fontSize: 14 }}>— leads · Live submissions</li>
          </ul>
        </div>

        <div style={{ marginTop: 28 }}>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
