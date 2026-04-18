"use client";

import Link from "next/link";
import { FolderKanban, Users2, Leaf, Euro, Activity, ArrowRight, Plus, Columns3, FileText } from "lucide-react";
import type { ActivityEntry } from "@/lib/phily/supabase-queries";

type Aggs = {
  projects: { total: number; active: number; planned: number; completed: number; list: { id: string; title: string; status: string; category: string; updated_at: string }[] };
  contacts: { total: number };
  impact: { totalCO2Kg: number; totalPeopleHelped: number; totalTreesPlanted: number; totalMoneyDonated: number };
  kanban: { boardCount: number };
  budget: { total: number; spent: number; remaining: number };
};

const STATUS_COLOR: Record<string, string> = {
  planned: "#94A3B8",
  active: "#5EFFB1",
  completed: "#7DD3FC",
  paused: "#FFB547",
};

export function DashboardHome({ aggs, activity, greeting, firstName }: { aggs: Aggs; activity: ActivityEntry[]; greeting: string; firstName: string }) {
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--txt3)", marginBottom: 10 }}>
          ◉ Dashboard · live
        </div>
        <h1 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-.02em", color: "var(--txt)" }}>
          {greeting}, <span style={{ color: "var(--g, #079455)" }}>{firstName}</span>.
        </h1>
        <p style={{ color: "var(--txt2)", fontSize: 16, marginTop: 8 }}>
          Live across {aggs.projects.total} project{aggs.projects.total === 1 ? "" : "s"}, {aggs.contacts.total} contact{aggs.contacts.total === 1 ? "" : "s"}, {aggs.kanban.boardCount} board{aggs.kanban.boardCount === 1 ? "" : "s"}.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KPI icon={FolderKanban} label="Projects" value={aggs.projects.total} sub={`${aggs.projects.active} active · ${aggs.projects.planned} planned`} accent="#5EFFB1" />
        <KPI icon={Users2} label="Contacts" value={aggs.contacts.total} sub="Across all types" accent="#7DD3FC" />
        <KPI icon={Leaf} label="People helped" value={aggs.impact.totalPeopleHelped.toLocaleString()} sub={`${aggs.impact.totalCO2Kg.toLocaleString()} kg CO₂ saved`} accent="#5EFFB1" />
        <KPI icon={Euro} label="Total budget" value={`€ ${aggs.budget.total.toLocaleString()}`} sub={`€ ${aggs.budget.spent.toLocaleString()} spent`} accent="#FFB547" />
      </div>

      {/* Two-column: recent projects + activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* Recent projects */}
        <section style={cardWrap}>
          <CardHead label="Recent projects" right={<Link href="/diaz/dashboard/projects" style={moreLink}>All <ArrowRight size={12} /></Link>} />
          {aggs.projects.list.length === 0 ? (
            <Empty icon={FolderKanban} text="No projects yet">
              <Link href="/diaz/dashboard/projects" style={primaryBtn}>
                <Plus size={14} style={{ marginRight: 4 }} /> Create the first one
              </Link>
            </Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {aggs.projects.list.map((p) => (
                <Link
                  key={p.id}
                  href="/diaz/dashboard/projects"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--panel2)", textDecoration: "none" }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 500, fontSize: 14, color: "var(--txt)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.title}
                    </div>
                    <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, color: "var(--txt3)", letterSpacing: ".06em", marginTop: 2 }}>
                      {p.category} · updated {timeAgo(p.updated_at)}
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 999, background: STATUS_COLOR[p.status] + "22", color: STATUS_COLOR[p.status] }}>
                    {p.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Activity feed */}
        <section style={cardWrap}>
          <CardHead label="Activity" right={<span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".12em", color: "var(--txt3)", textTransform: "uppercase" }}>last 8</span>} />
          {activity.length === 0 ? (
            <Empty icon={Activity} text="No activity yet" />
          ) : (
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column" }}>
              {activity.map((a) => (
                <li key={a.id} style={{ display: "grid", gridTemplateColumns: "12px 1fr auto", gap: 10, padding: "10px 0", borderTop: "1px solid var(--border)", alignItems: "baseline" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: KIND_COLOR[a.kind] ?? "var(--txt3)" }} />
                  <div style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.4 }}>
                    {a.title}
                    {a.detail && <span style={{ color: "var(--txt3)" }}> · {a.detail}</span>}
                  </div>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 9, color: "var(--txt3)", letterSpacing: ".08em" }}>
                    {timeAgo(a.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Quick actions */}
      <section style={{ ...cardWrap, padding: 24 }}>
        <CardHead label="Quick actions" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Link href="/diaz/dashboard/projects" style={quickAction}>
            <FolderKanban size={18} /> <span>Projects</span>
          </Link>
          <Link href="/diaz/dashboard/contacts" style={quickAction}>
            <Users2 size={18} /> <span>Contacts</span>
          </Link>
          <Link href="/diaz/dashboard/impact" style={quickAction}>
            <Leaf size={18} /> <span>Impact</span>
          </Link>
          <Link href="/diaz/dashboard/kanban" style={quickAction}>
            <Columns3 size={18} /> <span>Kanban</span>
          </Link>
          <Link href="/diaz/dashboard/reports" style={quickAction}>
            <FileText size={18} /> <span>Reports</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

const KIND_COLOR: Record<string, string> = {
  project: "#5EFFB1",
  contact: "#7DD3FC",
  impact: "#94A3B8",
  kanban: "#FFB547",
  milestone: "#C01048",
};

function KPI({ icon: Icon, label, value, sub, accent }: { icon: typeof FolderKanban; label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)", boxShadow: "var(--sh)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: accent, marginBottom: 10 }}>
        <Icon size={18} />
        <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 700, fontSize: 32, color: "var(--txt)", letterSpacing: "-.02em", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, color: "var(--txt3)", letterSpacing: ".06em", marginTop: 8 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function CardHead({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <h2 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 16, color: "var(--txt)" }}>{label}</h2>
      {right}
    </div>
  );
}

function Empty({ icon: Icon, text, children }: { icon: typeof FolderKanban; text: string; children?: React.ReactNode }) {
  return (
    <div style={{ padding: "36px 20px", textAlign: "center", color: "var(--txt3)" }}>
      <Icon size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
      <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 12 }}>
        — {text}
      </div>
      {children}
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const cardWrap: React.CSSProperties = {
  padding: 20,
  border: "1px solid var(--border)",
  borderRadius: 14,
  background: "var(--panel)",
  boxShadow: "var(--sh)",
};
const moreLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "var(--font-red-hat-mono), monospace",
  fontSize: 10,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--txt2)",
  textDecoration: "none",
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 14px",
  borderRadius: 8,
  background: "var(--txt)",
  color: "var(--panel)",
  fontFamily: "var(--font-red-hat-mono), monospace",
  fontSize: 11,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  textDecoration: "none",
  fontWeight: 600,
};
const quickAction: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "14px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--panel2)",
  color: "var(--txt)",
  textDecoration: "none",
  fontFamily: "var(--font-jakarta), sans-serif",
  fontSize: 14,
  fontWeight: 500,
  transition: "background .2s",
};
