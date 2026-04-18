"use client";

import { useState, useTransition } from "react";
import { Plus, Leaf, Users, Droplet, Zap, Euro, Sprout } from "lucide-react";
import { useRouter } from "next/navigation";
import { addImpactMetric } from "@/app/actions/phily";
import type { ImpactMetric, Project } from "@/lib/phily/supabase-queries";

type Summary = {
  totalCO2Kg: number;
  totalPeopleHelped: number;
  totalTreesPlanted: number;
  totalMoneyDonated: number;
  totalWaterLiters: number;
  totalEnergyKwh: number;
  totalProjects: number;
  activeProjects: number;
};

const METRIC_ICONS = {
  co2_kg: Leaf,
  people_helped: Users,
  trees_planted: Sprout,
  money_donated: Euro,
  water_liters: Droplet,
  energy_kwh: Zap,
  custom: Leaf,
};

export function ImpactView({ metrics, projects, summary }: { metrics: ImpactMetric[]; projects: Project[]; summary: Summary }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const [pending, start] = useTransition();

  const cards = [
    { l: "CO₂ reduced", v: summary.totalCO2Kg.toLocaleString(), u: "kg", i: Leaf, c: "#5EFFB1" },
    { l: "People helped", v: summary.totalPeopleHelped.toLocaleString(), u: "", i: Users, c: "#7DD3FC" },
    { l: "Trees planted", v: summary.totalTreesPlanted.toLocaleString(), u: "", i: Sprout, c: "#5EFFB1" },
    { l: "Money donated", v: summary.totalMoneyDonated.toLocaleString(), u: "€", i: Euro, c: "#FFB547" },
    { l: "Water supplied", v: summary.totalWaterLiters.toLocaleString(), u: "L", i: Droplet, c: "#7DD3FC" },
    { l: "Energy delivered", v: summary.totalEnergyKwh.toLocaleString(), u: "kWh", i: Zap, c: "#FFB547" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--txt3)", marginBottom: 8 }}>
            ◉ Impact
          </div>
          <h1 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 32, letterSpacing: "-.02em", color: "var(--txt)" }}>
            Cumulative across {summary.totalProjects} project{summary.totalProjects === 1 ? "" : "s"}
          </h1>
        </div>
        <button onClick={() => setOpen(true)} disabled={projects.length === 0} style={{ ...primaryBtn, opacity: projects.length === 0 ? 0.4 : 1, cursor: projects.length === 0 ? "not-allowed" : "pointer" }}>
          <Plus size={16} style={{ marginRight: 6 }} /> Add metric
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 28 }}>
        {cards.map((c, i) => {
          const Icon = c.i;
          return (
            <div key={i} style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)", boxShadow: "var(--sh)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.c, marginBottom: 10 }}>
                <Icon size={18} />
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>{c.l}</span>
              </div>
              <div style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 700, fontSize: 28, color: "var(--txt)", letterSpacing: "-.02em" }}>
                {c.u === "€" && "€ "}{c.v}{c.u && c.u !== "€" && <span style={{ fontSize: 14, color: "var(--txt3)", marginLeft: 4, fontWeight: 400 }}>{c.u}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <h2 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 20, color: "var(--txt)", marginBottom: 14 }}>Recent metrics</h2>

      {metrics.length === 0 ? (
        <div style={{ padding: "60px 40px", border: "2px dashed var(--border)", borderRadius: 14, textAlign: "center", color: "var(--txt3)", fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" }}>
          {projects.length === 0 ? "— Create a project first, then add impact metrics" : "— No metrics yet. Add the first one above."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {metrics.slice(0, 20).map((m) => {
            const Icon = METRIC_ICONS[m.metric_type] ?? Leaf;
            const project = projects.find((p) => p.id === m.project_id);
            return (
              <div key={m.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto auto", gap: 16, alignItems: "center", padding: "14px 18px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)" }}>
                <Icon size={16} style={{ color: "var(--txt2)" }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--txt)" }}>
                    {m.metric_type.replace("_", " ")} {m.notes && <span style={{ color: "var(--txt3)", fontWeight: 400 }}>· {m.notes}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--txt3)", fontFamily: "var(--font-red-hat-mono), monospace", marginTop: 2 }}>
                    {project?.title ?? "—"}
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 14, fontWeight: 600, color: "var(--txt)" }}>
                  {m.value.toLocaleString()} <span style={{ color: "var(--txt3)", fontWeight: 400, fontSize: 11 }}>{m.unit}</span>
                </div>
                <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, color: "var(--txt3)" }}>
                  {new Date(m.date).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "grid", placeItems: "center", zIndex: 100, padding: 20 }}
        >
          <div style={{ background: "var(--panel)", borderRadius: 16, padding: 28, maxWidth: 520, width: "100%", boxShadow: "var(--shlg)" }}>
            <h2 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 22, color: "var(--txt)", marginBottom: 18 }}>Add impact metric</h2>
            <form
              action={async (fd) => {
                setErr(null);
                const res = await addImpactMetric(fd);
                if (res.ok) { setOpen(false); router.refresh(); }
                else setErr(res.message ?? "Failed");
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)" }}>Project *</span>
                <select name="project_id" required style={inputStyle}>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)" }}>Metric type</span>
                <select name="metric_type" defaultValue="custom" style={inputStyle}>
                  {Object.keys(METRIC_ICONS).map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)" }}>Value *</span>
                  <input name="value" type="number" step="0.01" required style={inputStyle} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)" }}>Unit</span>
                  <input name="unit" type="text" placeholder="kg / L / kWh" style={inputStyle} />
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)" }}>Notes</span>
                <textarea name="notes" rows={2} style={inputStyle} />
              </label>
              {err && <div style={{ padding: "8px 12px", background: "var(--rb)", color: "var(--rt)", borderRadius: 8, fontSize: 13 }}>{err}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setOpen(false)} style={ghostBtn}>Cancel</button>
                <button type="submit" style={primaryBtn}>Add →</button>
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
  display: "inline-flex",
  alignItems: "center",
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
