"use client";

import { useActionState } from "react";
import { createJob, type JobState } from "@/app/actions/jobs";

const initial: JobState = { status: "idle" };

type Team = { id: string; name: string; color: string };

export function NewJobForm({ teams }: { teams: Team[] }) {
  const [state, formAction, pending] = useActionState(createJob, initial);

  const inputStyle: React.CSSProperties = {
    padding: "16px 20px",
    borderRadius: 12,
    background: "rgba(3,20,15,.6)",
    border: "1px solid var(--line)",
    color: "var(--text)",
    fontFamily: "'JetBrains Mono'",
    fontSize: 13,
    letterSpacing: ".06em",
    outline: "none",
    width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono'",
    fontSize: 11,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: "var(--muted-soft)",
    marginBottom: 8,
    display: "block",
  };

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label htmlFor="title" style={labelStyle}>Title *</label>
        <input id="title" name="title" type="text" required style={inputStyle} placeholder="Install dispatcher — Site B" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label htmlFor="customer" style={labelStyle}>Customer</label>
          <input id="customer" name="customer" type="text" style={inputStyle} placeholder="Acme Logistics" />
        </div>
        <div>
          <label htmlFor="address" style={labelStyle}>Address</label>
          <input id="address" name="address" type="text" style={inputStyle} placeholder="1234 Market St, Philadelphia" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label htmlFor="assigned_team" style={labelStyle}>Assign team</label>
          <select id="assigned_team" name="assigned_team" defaultValue="" style={inputStyle}>
            <option value="">— Unassigned</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="scheduled_for" style={labelStyle}>Scheduled for</label>
          <input id="scheduled_for" name="scheduled_for" type="datetime-local" style={inputStyle} />
        </div>
      </div>

      <div>
        <label htmlFor="notes" style={labelStyle}>Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          style={{
            ...inputStyle,
            fontFamily: "'Inter'",
            fontSize: 15,
            lineHeight: 1.55,
            resize: "vertical",
            minHeight: 100,
          }}
          placeholder="Access codes, site contact, anything the team needs to know."
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        style={{
          marginTop: 12,
          padding: "16px 24px",
          borderRadius: 12,
          background: "var(--accent)",
          color: "var(--bg)",
          fontFamily: "'JetBrains Mono'",
          fontSize: 12,
          letterSpacing: ".14em",
          textTransform: "uppercase",
          fontWeight: 600,
          border: 0,
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
          transition: "box-shadow .3s",
        }}
      >
        {pending ? "Creating..." : "Create job →"}
      </button>

      {state.status === "err" && state.message && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid #FF5D5D",
            background: "rgba(255,93,93,.08)",
            color: "#FF9B9B",
            fontFamily: "'JetBrains Mono'",
            fontSize: 12,
            letterSpacing: ".06em",
          }}
        >
          {state.message}
        </div>
      )}
    </form>
  );
}
