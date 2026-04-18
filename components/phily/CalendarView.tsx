"use client";

import { CalendarDays, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { Milestone, Project } from "@/lib/phily/supabase-queries";

const STATUS_ICON = { pending: Clock, completed: CheckCircle2, overdue: AlertCircle };
const STATUS_COLOR = { pending: "#94A3B8", completed: "#5EFFB1", overdue: "#C01048" };

export function CalendarView({ milestones, projects }: { milestones: Milestone[]; projects: Project[] }) {
  // Group milestones by month
  const byMonth = milestones.reduce<Record<string, Milestone[]>>((acc, m) => {
    const key = new Date(m.due_date).toISOString().slice(0, 7); // YYYY-MM
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const months = Object.keys(byMonth).sort();
  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]));
  const now = new Date();

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--txt3)", marginBottom: 8 }}>
          ◉ Calendar
        </div>
        <h1 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 32, letterSpacing: "-.02em", color: "var(--txt)" }}>
          Project milestones
        </h1>
        <div style={{ color: "var(--txt2)", fontSize: 14, marginTop: 4 }}>
          {milestones.length} milestone{milestones.length === 1 ? "" : "s"} across {projects.length} project{projects.length === 1 ? "" : "s"}.
        </div>
      </div>

      {milestones.length === 0 ? (
        <div style={{ padding: "80px 40px", border: "2px dashed var(--border)", borderRadius: 16, textAlign: "center", color: "var(--txt3)" }}>
          <CalendarDays size={40} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" }}>
            — No milestones yet
          </div>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            Milestones get added to projects from the Projects page.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {months.map((monthKey) => {
            const monthDate = new Date(monthKey + "-01");
            const isPast = monthDate < new Date(now.getFullYear(), now.getMonth(), 1);
            return (
              <section key={monthKey}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                  <h2 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 18, color: isPast ? "var(--txt3)" : "var(--txt)" }}>
                    {monthDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                  </h2>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", color: "var(--txt3)" }}>
                    {byMonth[monthKey].length} milestone{byMonth[monthKey].length === 1 ? "" : "s"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {byMonth[monthKey].sort((a, b) => a.due_date.localeCompare(b.due_date)).map((m) => {
                    const Icon = STATUS_ICON[m.status];
                    const project = projectsById[m.project_id];
                    const due = new Date(m.due_date);
                    const isToday = due.toDateString() === now.toDateString();
                    const isOverdue = due < now && m.status !== "completed";
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "60px 18px 1fr auto",
                          gap: 16,
                          alignItems: "center",
                          padding: "14px 18px",
                          border: `1px solid ${isToday ? "var(--g, #079455)" : "var(--border)"}`,
                          borderRadius: 12,
                          background: isToday ? "rgba(94,255,177,.06)" : "var(--panel)",
                        }}
                      >
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 700, fontSize: 22, color: "var(--txt)", lineHeight: 1 }}>
                            {due.getDate()}
                          </div>
                          <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 9, color: "var(--txt3)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 2 }}>
                            {due.toLocaleDateString("en-GB", { weekday: "short" })}
                          </div>
                        </div>
                        <Icon size={16} style={{ color: isOverdue ? "#C01048" : STATUS_COLOR[m.status] }} />
                        <div>
                          <div style={{ fontSize: 14, color: "var(--txt)", fontWeight: 500 }}>{m.title}</div>
                          <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, color: "var(--txt3)", letterSpacing: ".06em", marginTop: 2 }}>
                            {project?.title ?? "—"}
                          </div>
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-red-hat-mono), monospace",
                            fontSize: 9,
                            letterSpacing: ".14em",
                            textTransform: "uppercase",
                            padding: "3px 9px",
                            borderRadius: 999,
                            background: (isOverdue ? "#C01048" : STATUS_COLOR[m.status]) + "22",
                            color: isOverdue ? "#C01048" : STATUS_COLOR[m.status],
                          }}
                        >
                          {isOverdue ? "overdue" : m.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
