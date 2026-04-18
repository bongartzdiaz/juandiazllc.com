import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { JobDetailActions } from "@/components/diaz/JobDetailActions";

export const metadata: Metadata = { title: "Job" };
export const dynamic = "force-dynamic";

type Team = { id: string; name: string; color: string };

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/diaz/login?next=/diaz/app/jobs/${id}`);

  const [jobRes, teamsRes, updatesRes] = await Promise.all([
    supabase
      .from("jobs")
      .select("id,title,customer,address,notes,status,assigned_team,scheduled_for,created_at,teams(name,color)")
      .eq("id", id)
      .single(),
    supabase.from("teams").select("id,name,color").order("name"),
    supabase
      .from("job_updates")
      .select("id,message,kind,created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (jobRes.error || !jobRes.data) notFound();
  const job = jobRes.data as unknown as {
    id: string;
    title: string;
    customer: string | null;
    address: string | null;
    notes: string | null;
    status: string;
    assigned_team: string | null;
    scheduled_for: string | null;
    created_at: string;
    teams: { name: string; color: string } | null;
  };
  const teams = (teamsRes.data ?? []) as Team[];
  const updates = updatesRes.data ?? [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "140px 32px 120px" }}>
      <Link
        href="/diaz/app/jobs"
        style={{
          fontFamily: "'JetBrains Mono'",
          fontSize: 11,
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: "var(--muted-soft)",
          display: "inline-block",
          marginBottom: 24,
        }}
      >
        ← All jobs
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ fontWeight: 300, fontSize: "clamp(36px, 5vw, 64px)", letterSpacing: "-.04em", lineHeight: 1.02, marginBottom: 12 }}>
            {job.title}
          </h1>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, color: "var(--muted)", letterSpacing: ".06em" }}>
            {job.customer && <span>{job.customer}</span>}
            {job.customer && job.address && <span> · </span>}
            {job.address && <span>{job.address}</span>}
          </div>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 11,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            padding: "8px 16px",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            borderRadius: 999,
            background: "rgba(94,255,177,.06)",
            whiteSpace: "nowrap",
          }}
        >
          ● {job.status.replace("_", " ")}
        </div>
      </div>

      <JobDetailActions jobId={job.id} currentStatus={job.status} currentTeam={job.assigned_team} teams={teams} />

      {/* Meta strip */}
      <div
        style={{
          marginTop: 40,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 0,
          border: "1px solid var(--line)",
          borderRadius: 14,
          overflow: "hidden",
          background: "var(--panel)",
        }}
      >
        {[
          {
            l: "Team",
            v: job.teams?.name ? (
              <span style={{ color: job.teams.color }}>● {job.teams.name}</span>
            ) : (
              <span style={{ color: "var(--muted-soft)" }}>— Unassigned</span>
            ),
          },
          {
            l: "Scheduled",
            v: job.scheduled_for
              ? new Date(job.scheduled_for).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "—",
          },
          {
            l: "Created",
            v: new Date(job.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          },
        ].map((m, i) => (
          <div key={i} style={{ padding: "20px 24px", borderRight: i < 2 ? "1px solid var(--line)" : "none" }}>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 6 }}>
              {m.l}
            </div>
            <div style={{ fontSize: 15, color: "var(--text)", fontFamily: "'JetBrains Mono'", letterSpacing: ".04em" }}>
              {m.v}
            </div>
          </div>
        ))}
      </div>

      {job.notes && (
        <div style={{ marginTop: 24, padding: 24, border: "1px solid var(--line)", borderRadius: 14, background: "var(--bg-2)" }}>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 10 }}>
            Notes
          </div>
          <div style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {job.notes}
          </div>
        </div>
      )}

      {/* Activity feed */}
      <section style={{ marginTop: 40 }}>
        <div className="label" style={{ marginBottom: 18 }}>◉ Activity</div>
        {updates.length === 0 ? (
          <div style={{ padding: 24, color: "var(--muted-soft)", fontFamily: "'JetBrains Mono'", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>
            — No updates yet.
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 0 }}>
            {updates.map((u, i) => (
              <li
                key={u.id}
                style={{
                  padding: "16px 0",
                  borderTop: i > 0 ? "1px solid var(--line)" : "none",
                  display: "grid",
                  gridTemplateColumns: "100px 1fr auto",
                  gap: 20,
                  alignItems: "baseline",
                }}
              >
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--muted-soft)", letterSpacing: ".08em" }}>
                  {new Date(u.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.5 }}>
                  {u.message}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono'",
                    fontSize: 9,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: u.kind === "event" ? "var(--accent)" : "var(--muted-soft)",
                  }}
                >
                  {u.kind}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
