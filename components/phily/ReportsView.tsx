"use client";

import { Download, TrendingUp, FolderKanban, Users2, Leaf } from "lucide-react";
import type { Project, Contact, ImpactMetric } from "@/lib/phily/supabase-queries";

type Summary = {
  totalCO2Kg: number;
  totalPeopleHelped: number;
  totalTreesPlanted: number;
  totalMoneyDonated: number;
  totalProjects: number;
  activeProjects: number;
};

export function ReportsView({ projects, contacts, summary, metrics }: { projects: Project[]; contacts: Contact[]; summary: Summary; metrics: ImpactMetric[] }) {
  // Project status breakdown
  const statusCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  // Category breakdown
  const categoryCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  // Contact type breakdown
  const contactTypeCounts = contacts.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {});

  // Budget totals
  const totalBudget = projects.reduce((a, p) => a + p.budget_cents, 0) / 100;
  const totalSpent = projects.reduce((a, p) => a + p.spent_cents, 0) / 100;

  // Metric type breakdown
  const metricTypeCounts = metrics.reduce<Record<string, { count: number; total: number }>>((acc, m) => {
    if (!acc[m.metric_type]) acc[m.metric_type] = { count: 0, total: 0 };
    acc[m.metric_type].count++;
    acc[m.metric_type].total += m.value;
    return acc;
  }, {});

  function exportCSV() {
    const rows = [
      ["Section", "Key", "Value"],
      ["Summary", "Total projects", String(projects.length)],
      ["Summary", "Active projects", String(summary.activeProjects)],
      ["Summary", "Total contacts", String(contacts.length)],
      ["Summary", "Total budget", String(totalBudget)],
      ["Summary", "Total spent", String(totalSpent)],
      ["Impact", "CO2 kg", String(summary.totalCO2Kg)],
      ["Impact", "People helped", String(summary.totalPeopleHelped)],
      ["Impact", "Trees planted", String(summary.totalTreesPlanted)],
      ["Impact", "Money donated", String(summary.totalMoneyDonated)],
      ...Object.entries(statusCounts).map(([k, v]) => ["Project status", k, String(v)]),
      ...Object.entries(categoryCounts).map(([k, v]) => ["Project category", k, String(v)]),
      ...Object.entries(contactTypeCounts).map(([k, v]) => ["Contact type", k, String(v)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diaz-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--txt3)", marginBottom: 8 }}>
            ◉ Reports
          </div>
          <h1 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 32, letterSpacing: "-.02em", color: "var(--txt)" }}>
            Live snapshot
          </h1>
          <div style={{ color: "var(--txt2)", fontSize: 14, marginTop: 4 }}>
            All numbers reflect what's currently in Supabase.
          </div>
        </div>
        <button onClick={exportCSV} style={primaryBtn}>
          <Download size={14} style={{ marginRight: 6 }} /> Export CSV
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 28 }}>
        <Stat icon={FolderKanban} label="Projects" value={projects.length} sub={`${summary.activeProjects} active`} />
        <Stat icon={Users2} label="Contacts" value={contacts.length} sub={`${Object.keys(contactTypeCounts).length} types`} />
        <Stat icon={Leaf} label="Impact entries" value={metrics.length} sub={`${Object.keys(metricTypeCounts).length} metric types`} />
        <Stat icon={TrendingUp} label="Total budget" value={`€ ${totalBudget.toLocaleString()}`} sub={`€ ${totalSpent.toLocaleString()} spent (${totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%)`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <Breakdown title="Projects by status" data={statusCounts} colorMap={{ planned: "#94A3B8", active: "#5EFFB1", completed: "#7DD3FC", paused: "#FFB547" }} />
        <Breakdown title="Projects by category" data={categoryCounts} />
        <Breakdown title="Contacts by type" data={contactTypeCounts} colorMap={{ partner: "#5EFFB1", beneficiary: "#7DD3FC", stakeholder: "#94A3B8", donor: "#FFB547" }} />
        <Breakdown title="Impact by metric" data={Object.fromEntries(Object.entries(metricTypeCounts).map(([k, v]) => [k.replace("_", " "), v.count]))} />
      </div>

      <section style={{ marginTop: 28, padding: 24, border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)" }}>
        <div style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 16, color: "var(--txt)", marginBottom: 14 }}>
          Project budget detail
        </div>
        {projects.length === 0 ? (
          <div style={{ color: "var(--txt3)", fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", padding: "20px 0" }}>
            — No projects to report
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Project", "Status", "Budget", "Spent", "Remaining", "Burn"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 8px", fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const budget = p.budget_cents / 100;
                const spent = p.spent_cents / 100;
                const remaining = budget - spent;
                const burn = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 8px", fontSize: 14, color: "var(--txt)", fontWeight: 500 }}>{p.title}</td>
                    <td style={{ padding: "10px 8px", fontSize: 11, color: "var(--txt2)", fontFamily: "var(--font-red-hat-mono), monospace", letterSpacing: ".08em", textTransform: "uppercase" }}>{p.status}</td>
                    <td style={{ padding: "10px 8px", fontSize: 13, color: "var(--txt)", fontFamily: "var(--font-red-hat-mono), monospace" }}>€ {budget.toLocaleString()}</td>
                    <td style={{ padding: "10px 8px", fontSize: 13, color: "var(--txt2)", fontFamily: "var(--font-red-hat-mono), monospace" }}>€ {spent.toLocaleString()}</td>
                    <td style={{ padding: "10px 8px", fontSize: 13, color: remaining < 0 ? "#C01048" : "var(--txt)", fontFamily: "var(--font-red-hat-mono), monospace" }}>€ {remaining.toLocaleString()}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, color: burn > 100 ? "#C01048" : burn > 80 ? "#FFB547" : "var(--txt2)", fontFamily: "var(--font-red-hat-mono), monospace" }}>{burn}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof FolderKanban; label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)", boxShadow: "var(--sh)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--txt2)", marginBottom: 10 }}>
        <Icon size={16} />
        <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 700, fontSize: 28, color: "var(--txt)", letterSpacing: "-.02em" }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, color: "var(--txt3)", letterSpacing: ".06em", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Breakdown({ title, data, colorMap }: { title: string; data: Record<string, number>; colorMap?: Record<string, string> }) {
  const entries = Object.entries(data);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (entries.length === 0) {
    return (
      <div style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)" }}>
        <div style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 14, color: "var(--txt)", marginBottom: 10 }}>{title}</div>
        <div style={{ color: "var(--txt3)", fontSize: 12, fontFamily: "var(--font-red-hat-mono), monospace" }}>—</div>
      </div>
    );
  }
  return (
    <div style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)" }}>
      <div style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 14, color: "var(--txt)", marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "var(--txt2)", fontFamily: "var(--font-red-hat-mono), monospace", letterSpacing: ".06em", textTransform: "uppercase" }}>{k}</span>
              <span style={{ fontSize: 12, color: "var(--txt)", fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 600 }}>{v}</span>
            </div>
            <div style={{ height: 6, background: "var(--panel2)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(v / total) * 100}%`, background: colorMap?.[k] ?? "var(--txt2)", transition: "width .3s" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 8,
  background: "var(--txt)",
  color: "var(--panel)",
  border: 0,
  fontFamily: "var(--font-red-hat-mono), monospace",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: ".05em",
  display: "inline-flex",
  alignItems: "center",
};
