import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { JobsFilter } from "@/components/diaz/JobsFilter";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  title: string;
  customer: string | null;
  address: string | null;
  status: "new" | "assigned" | "in_progress" | "complete" | "cancelled";
  assigned_team: string | null;
  scheduled_for: string | null;
  created_at: string;
  teams?: { name: string; color: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  new: "#A2BDB0",
  assigned: "#7DD3FC",
  in_progress: "#5EFFB1",
  complete: "#8BA89A",
  cancelled: "#FF9B9B",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/diaz/login?next=/diaz/app/jobs");

  let query = supabase
    .from("jobs")
    .select("id,title,customer,address,status,assigned_team,scheduled_for,created_at,teams(name,color)")
    .order("created_at", { ascending: false });

  if (sp.status && sp.status !== "all") {
    query = query.eq("status", sp.status);
  }

  const { data } = await query;
  const jobs = (data ?? []) as unknown as JobRow[];

  const [newCount, assignedCount, progressCount, doneCount] = await Promise.all([
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "assigned"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "complete"),
  ]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "140px 32px 120px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, marginBottom: 48, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 14 }}>
            ◉ Dispatch · live
          </div>
          <h1 style={{ fontWeight: 300, fontSize: "clamp(44px, 6vw, 80px)", letterSpacing: "-.04em", lineHeight: 1 }}>
            Jobs <em style={{ color: "var(--muted-soft)" }}>board.</em>
          </h1>
        </div>
        <Link className="btn primary" href="/diaz/app/jobs/new">
          + New job
        </Link>
      </div>

      {/* Filter chips */}
      <JobsFilter
        current={sp.status ?? "all"}
        counts={{
          new: newCount.count ?? 0,
          assigned: assignedCount.count ?? 0,
          in_progress: progressCount.count ?? 0,
          complete: doneCount.count ?? 0,
          all: (newCount.count ?? 0) + (assignedCount.count ?? 0) + (progressCount.count ?? 0) + (doneCount.count ?? 0),
        }}
      />

      {/* Jobs list */}
      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 10 }}>
        {jobs.length === 0 ? (
          <div
            style={{
              padding: "60px 32px",
              border: "1px solid var(--line)",
              borderRadius: 16,
              background: "var(--panel)",
              textAlign: "center",
              color: "var(--muted-soft)",
              fontFamily: "'JetBrains Mono'",
              fontSize: 12,
              letterSpacing: ".14em",
              textTransform: "uppercase",
            }}
          >
            — No jobs yet. Create the first one above.
          </div>
        ) : (
          jobs.map((j) => (
            <Link
              key={j.id}
              href={`/diaz/app/jobs/${j.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr auto auto",
                gap: 24,
                padding: "20px 24px",
                border: "1px solid var(--line)",
                borderRadius: 14,
                background: "var(--panel)",
                alignItems: "center",
                transition: "all .3s var(--ease)",
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono'",
                    fontSize: 10,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    border: `1px solid ${STATUS_COLORS[j.status]}`,
                    color: STATUS_COLORS[j.status],
                    borderRadius: 999,
                    background: "rgba(3,20,15,.4)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {j.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{j.title}</div>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: "var(--muted-soft)", letterSpacing: ".06em" }}>
                  {j.customer && <>{j.customer} · </>}
                  {j.address && <>{j.address}</>}
                </div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: "var(--muted)", letterSpacing: ".08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {j.teams?.name ? (
                  <span style={{ color: j.teams.color }}>● {j.teams.name}</span>
                ) : (
                  <span style={{ color: "var(--muted-soft)" }}>— unassigned</span>
                )}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--muted-soft)", letterSpacing: ".06em", whiteSpace: "nowrap" }}>
                {j.scheduled_for
                  ? new Date(j.scheduled_for).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : new Date(j.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
