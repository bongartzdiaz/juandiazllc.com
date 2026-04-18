"use client";

import { useState, useTransition } from "react";
import { Plus, FolderKanban, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createProject, deleteProject, updateProjectStatus } from "@/app/actions/phily";
import type { Project } from "@/lib/phily/supabase-queries";

const STATUSES = ["planned", "active", "completed", "paused"] as const;
const STATUS_COLOR: Record<string, string> = {
  planned: "#94A3B8",
  active: "#5EFFB1",
  completed: "#7DD3FC",
  paused: "#FFB547",
};

export function ProjectsView({ initialProjects }: { initialProjects: Project[] }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const projects = initialProjects;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--txt3)", marginBottom: 8 }}>
            ◉ Projects
          </div>
          <h1 style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif", fontWeight: 600, fontSize: 32, letterSpacing: "-.02em", color: "var(--txt)" }}>
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </h1>
          <div style={{ color: "var(--txt2)", fontSize: 14, marginTop: 4 }}>
            {projects.filter((p) => p.status === "active").length} active ·{" "}
            {projects.filter((p) => p.status === "planned").length} planned ·{" "}
            {projects.filter((p) => p.status === "completed").length} completed
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 10,
            background: "var(--txt)",
            color: "var(--panel)",
            border: 0,
            fontFamily: "var(--font-red-hat-mono), monospace",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: ".05em",
          }}
        >
          <Plus size={16} />
          New project
        </button>
      </div>

      {projects.length === 0 ? (
        <div
          style={{
            padding: "80px 40px",
            border: "2px dashed var(--border)",
            borderRadius: 16,
            textAlign: "center",
            color: "var(--txt3)",
          }}
        >
          <FolderKanban size={40} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" }}>
            — No projects yet
          </div>
          <div style={{ marginTop: 8, fontSize: 15 }}>Click <b>New project</b> to create the first one.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {projects.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 20,
                border: "1px solid var(--border)",
                borderRadius: 14,
                background: "var(--panel)",
                boxShadow: "var(--sh)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <h3 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 17, color: "var(--txt)", lineHeight: 1.25 }}>
                  {p.title}
                </h3>
                <span
                  style={{
                    fontFamily: "var(--font-red-hat-mono), monospace",
                    fontSize: 10,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: STATUS_COLOR[p.status] + "22",
                    color: STATUS_COLOR[p.status],
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.status}
                </span>
              </div>
              {p.description && (
                <p style={{ color: "var(--txt2)", fontSize: 14, lineHeight: 1.5 }}>
                  {p.description.length > 140 ? p.description.slice(0, 140) + "…" : p.description}
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--border)", fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, color: "var(--txt3)", letterSpacing: ".04em" }}>
                <span>{p.category}</span>
                <span>€ {(p.budget_cents / 100).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STATUSES.filter((s) => s !== p.status).map((s) => (
                  <button
                    key={s}
                    disabled={pending}
                    onClick={() => start(async () => { await updateProjectStatus(p.id, s); router.refresh(); })}
                    style={{
                      fontSize: 10,
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      padding: "4px 8px",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      background: "transparent",
                      color: "var(--txt2)",
                      cursor: "pointer",
                      fontFamily: "var(--font-red-hat-mono), monospace",
                    }}
                  >
                    → {s}
                  </button>
                ))}
                <button
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Delete "${p.title}"?`)) return;
                    start(async () => { await deleteProject(p.id); router.refresh(); });
                  }}
                  style={{
                    marginLeft: "auto",
                    padding: "4px 8px",
                    border: 0,
                    background: "transparent",
                    color: "var(--r, #C01048)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "grid", placeItems: "center", zIndex: 100, padding: 20 }}
        >
          <div style={{ background: "var(--panel)", borderRadius: 16, padding: 28, maxWidth: 520, width: "100%", boxShadow: "var(--shlg)" }}>
            <h2 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 22, color: "var(--txt)", marginBottom: 18 }}>
              New project
            </h2>
            <form
              action={async (fd) => {
                setErr(null);
                const res = await createProject(fd);
                if (res.ok) {
                  setOpen(false);
                  router.refresh();
                } else {
                  setErr(res.message ?? "Failed");
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {["title", "description", "category"].map((f) => (
                <label key={f} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)" }}>
                    {f}{f === "title" ? " *" : ""}
                  </span>
                  {f === "description" ? (
                    <textarea name={f} rows={3} style={inputStyle} />
                  ) : (
                    <input name={f} type="text" required={f === "title"} style={inputStyle} />
                  )}
                </label>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)" }}>Start date</span>
                  <input name="start_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={inputStyle} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)" }}>Budget (€)</span>
                  <input name="budget" type="number" step="0.01" style={inputStyle} />
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)" }}>Status</span>
                <select name="status" defaultValue="planned" style={inputStyle}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              {err && <div style={{ padding: "8px 12px", background: "var(--rb)", color: "var(--rt)", borderRadius: 8, fontSize: 13 }}>{err}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setOpen(false)} style={ghostBtn}>Cancel</button>
                <button type="submit" style={primaryBtn}>Create →</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--panel2)",
  color: "var(--txt)",
  fontFamily: "var(--font-jakarta), sans-serif",
  fontSize: 14,
  outline: "none",
};
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
};
const ghostBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 8,
  background: "transparent",
  color: "var(--txt2)",
  border: "1px solid var(--border)",
  fontFamily: "var(--font-red-hat-mono), monospace",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  letterSpacing: ".05em",
};
