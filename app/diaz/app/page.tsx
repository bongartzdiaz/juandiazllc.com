import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/diaz/SignOutButton";

export const metadata: Metadata = { title: "Command" };
export const dynamic = "force-dynamic";

const VENTURES = [
  { name: "Voltafy", domain: "voltafy.nl", url: "https://voltafy.nl", live: true },
  { name: "Performance Tracker", domain: "performancetracker.nl", url: "https://performancetracker.nl", live: true },
  { name: "Help Mij Besparen", domain: "helpmijbesparen.nl", url: "https://helpmijbesparen.nl", live: true },
  { name: "Salderingsregeling 2027", domain: "salderingsregeling2027.nl", url: "https://salderingsregeling2027.nl", live: true },
  { name: "Dispatch board", domain: "/diaz/app/jobs", url: "/diaz/app/jobs", live: true },
  { name: "Operator hub", domain: "/app", url: "/app", live: true },
];

function daysUntil2027() {
  return Math.max(0, Math.floor((new Date("2027-01-01T00:00:00+01:00").getTime() - Date.now()) / 86400000));
}

type Lead = { id: string; name: string | null; email: string; company: string | null; sector: string | null; message: string | null; created_at: string };
type Job = { id: string; title: string; status: string; created_at: string };

export default async function CommandPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/diaz/login?next=/diaz/app");

  const [subRes, leadRes, recentLeadsRes, jobRes, openJobsRes, recentJobsRes] = await Promise.all([
    supabase.from("subscribers").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("id,name,email,company,sector,message,created_at").order("created_at", { ascending: false }).limit(4),
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase.from("jobs").select("*", { count: "exact", head: true }).in("status", ["new", "assigned", "in_progress"]),
    supabase.from("jobs").select("id,title,status,created_at").order("created_at", { ascending: false }).limit(4),
  ]);

  const recentLeads = (recentLeadsRes.data ?? []) as Lead[];
  const recentJobs = (recentJobsRes.data ?? []) as Job[];
  const firstName = user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "operator";

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="label">◉ Command surface · live</div>
          <h1>Welcome, <em>{firstName}.</em></h1>
          <p>
            Master view across every venture under Juan Diaz LLC. Signed in as{" "}
            <b style={{ color: "var(--text)" }}>{user.email}</b>.
          </p>
        </div>
        <SignOutButton />
      </div>

      {/* KPI strip */}
      <div className="stat-strip">
        <div>
          <div className="n">{subRes.count ?? 0}</div>
          <div className="l">Subscribers</div>
        </div>
        <div>
          <div className="n">{leadRes.count ?? 0}</div>
          <div className="l">Total leads</div>
        </div>
        <div>
          <div className="n">{jobRes.count ?? 0}</div>
          <div className="l">Total jobs</div>
        </div>
        <div>
          <div className="n">{openJobsRes.count ?? 0}</div>
          <div className="l">Open jobs (Philly)</div>
        </div>
        <div>
          <div className="n">{daysUntil2027()}</div>
          <div className="l">Days to 2027</div>
        </div>
      </div>

      {/* Recent leads + Open jobs */}
      <div className="grid-2">
        <section className="card">
          <div className="label">◉ Latest leads</div>
          <h2>From <em>juandiazllc.com</em></h2>
          <div style={{ marginTop: 14 }}>
            {recentLeads.length === 0 ? (
              <div style={{ padding: "24px 0", color: "var(--muted-soft)", fontFamily: "'JetBrains Mono'", fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", textAlign: "center" }}>
                — No leads yet
              </div>
            ) : (
              recentLeads.map((l) => (
                <div key={l.id} className="lead-row">
                  <div className="top">
                    <b>{l.name ?? l.email}{l.company && <span style={{ color: "var(--muted-soft)", fontWeight: 400 }}> · {l.company}</span>}</b>
                    <span className="when">{new Date(l.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {l.sector && <div className="meta">{l.sector}</div>}
                  {l.message && <p>{l.message.length > 180 ? l.message.slice(0, 180) + "…" : l.message}</p>}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <div className="label">◉ Latest jobs</div>
          <h2>From <em>philly</em></h2>
          <div style={{ marginTop: 14 }}>
            {recentJobs.length === 0 ? (
              <div style={{ padding: "24px 0", color: "var(--muted-soft)", fontFamily: "'JetBrains Mono'", fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", textAlign: "center" }}>
                — No jobs yet
              </div>
            ) : (
              recentJobs.map((j) => (
                <div key={j.id} className="lead-row">
                  <div className="top">
                    <b>{j.title}</b>
                    <span className="when">{new Date(j.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}</span>
                  </div>
                  <div className="meta">{j.status.replace("_", " ")}</div>
                </div>
              ))
            )}
            <a href="https://philly.juandiazllc.com/app/jobs" target="_blank" rel="noopener noreferrer" className="btn ghost" style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>
              Open dispatch board ↗
            </a>
          </div>
        </section>
      </div>

      {/* Ventures */}
      <section className="card">
        <div className="label">◉ Ventures · quick jump</div>
        <h2>The <em>portfolio.</em></h2>
        <div style={{ marginTop: 14 }}>
          {VENTURES.map((v) => (
            <a key={v.url} href={v.url} target={v.url.startsWith("http") ? "_blank" : undefined} rel={v.url.startsWith("http") ? "noopener noreferrer" : undefined} className="venture-row">
              <div>
                <div className="name">{v.name}</div>
                <div className="domain">{v.domain}</div>
              </div>
              <span className={`badge${v.live ? "" : " soon"}`}>{v.live ? "Live ↗" : "Internal ↗"}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
