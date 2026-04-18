"use client";

import { useState, useTransition } from "react";
import { Plus, Users2, Trash2, Mail, Phone, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContact, deleteContact } from "@/app/actions/phily";
import type { Contact } from "@/lib/phily/supabase-queries";

const TYPES = ["partner", "beneficiary", "stakeholder", "donor"] as const;
const TYPE_COLOR: Record<string, string> = {
  partner: "#5EFFB1",
  beneficiary: "#7DD3FC",
  stakeholder: "#94A3B8",
  donor: "#FFB547",
};

export function ContactsView({ initialContacts }: { initialContacts: Contact[] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const [pending, start] = useTransition();

  const filtered = initialContacts
    .filter((c) => filter === "all" || c.type === filter)
    .filter((c) => !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--txt3)", marginBottom: 8 }}>
            ◉ Contacts
          </div>
          <h1 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 32, letterSpacing: "-.02em", color: "var(--txt)" }}>
            {initialContacts.length} contact{initialContacts.length === 1 ? "" : "s"}
          </h1>
        </div>
        <button onClick={() => setOpen(true)} style={primaryBtn}>
          <Plus size={16} style={{ marginRight: 6 }} /> New contact
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, company…"
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", ...TYPES].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${filter === t ? "var(--txt)" : "var(--border)"}`,
                background: filter === t ? "var(--txt)" : "transparent",
                color: filter === t ? "var(--panel)" : "var(--txt2)",
                fontFamily: "var(--font-red-hat-mono), monospace",
                fontSize: 11,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "80px 40px", border: "2px dashed var(--border)", borderRadius: 16, textAlign: "center", color: "var(--txt3)" }}>
          <Users2 size={40} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" }}>
            {initialContacts.length === 0 ? "— No contacts yet" : "— No matches"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map((c) => (
            <div
              key={c.id}
              style={{
                padding: 18,
                border: "1px solid var(--border)",
                borderRadius: 12,
                background: "var(--panel)",
                boxShadow: "var(--sh)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 16, color: "var(--txt)" }}>
                    {c.name}
                  </div>
                  {c.company && (
                    <div style={{ color: "var(--txt2)", fontSize: 13, marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Building2 size={11} /> {c.company}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-red-hat-mono), monospace",
                    fontSize: 9,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: TYPE_COLOR[c.type] + "22",
                    color: TYPE_COLOR[c.type],
                  }}
                >
                  {c.type}
                </span>
              </div>
              {c.email && (
                <a href={`mailto:${c.email}`} style={{ color: "var(--txt2)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                  <Mail size={11} /> {c.email}
                </a>
              )}
              {c.phone && (
                <a href={`tel:${c.phone}`} style={{ color: "var(--txt2)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                  <Phone size={11} /> {c.phone}
                </a>
              )}
              {c.notes && (
                <p style={{ color: "var(--txt2)", fontSize: 12, lineHeight: 1.5, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  {c.notes.length > 100 ? c.notes.slice(0, 100) + "…" : c.notes}
                </p>
              )}
              <button
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Delete ${c.name}?`)) return;
                  start(async () => { await deleteContact(c.id); router.refresh(); });
                }}
                style={{
                  alignSelf: "flex-end",
                  padding: "4px 8px",
                  border: 0,
                  background: "transparent",
                  color: "#C01048",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={12} />
              </button>
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
            <h2 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 22, color: "var(--txt)", marginBottom: 18 }}>New contact</h2>
            <form
              action={async (fd) => {
                setErr(null);
                const res = await createContact(fd);
                if (res.ok) { setOpen(false); router.refresh(); }
                else setErr(res.message ?? "Failed");
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {["name", "email", "phone", "company", "notes"].map((f) => (
                <label key={f} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)" }}>
                    {f}{f === "name" ? " *" : ""}
                  </span>
                  {f === "notes" ? (
                    <textarea name={f} rows={3} style={inputStyle} />
                  ) : (
                    <input name={f} type={f === "email" ? "email" : "text"} required={f === "name"} style={inputStyle} />
                  )}
                </label>
              ))}
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt3)" }}>Type</span>
                <select name="type" defaultValue="stakeholder" style={inputStyle}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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
