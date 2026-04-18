"use client";

import { useState, useTransition } from "react";
import { updateJobStatus, addJobNote, assignJob } from "@/app/actions/jobs";
import { useRouter } from "next/navigation";

type Team = { id: string; name: string; color: string };

const STATUSES = ["new", "assigned", "in_progress", "complete", "cancelled"] as const;

export function JobDetailActions({
  jobId,
  currentStatus,
  currentTeam,
  teams,
}: {
  jobId: string;
  currentStatus: string;
  currentTeam: string | null;
  teams: Team[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Status changer */}
      <div style={{ padding: 24, border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)" }}>
        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 12 }}>
          ◉ Change status
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUSES.map((s) => {
            const active = s === currentStatus;
            return (
              <button
                key={s}
                disabled={pending || active}
                onClick={() => {
                  start(async () => {
                    await updateJobStatus(jobId, s);
                    router.refresh();
                  });
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 10,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                  color: active ? "var(--accent)" : "var(--muted)",
                  background: active ? "rgba(94,255,177,.08)" : "rgba(3,20,15,.4)",
                  cursor: active ? "default" : "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {s.replace("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assign team */}
      <div style={{ padding: 24, border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)" }}>
        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 12 }}>
          ◉ Assign team
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {teams.map((t) => {
            const active = t.id === currentTeam;
            return (
              <button
                key={t.id}
                disabled={pending || active}
                onClick={() => {
                  start(async () => {
                    await assignJob(jobId, t.id);
                    router.refresh();
                  });
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 10,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  border: `1px solid ${active ? t.color : "var(--line)"}`,
                  color: active ? t.color : "var(--muted)",
                  background: active ? "rgba(94,255,177,.06)" : "rgba(3,20,15,.4)",
                  cursor: active ? "default" : "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                ● {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add note — spans both columns */}
      <div style={{ gridColumn: "span 2", padding: 24, border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)" }}>
        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 12 }}>
          ◉ Add note
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            const fd = new FormData();
            fd.set("message", note);
            start(async () => {
              await addJobNote(jobId, fd);
              setNote("");
              router.refresh();
            });
          }}
          style={{ display: "flex", gap: 10, alignItems: "stretch" }}
        >
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Update from the field, blocker, handover note..."
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRadius: 10,
              background: "rgba(3,20,15,.6)",
              border: "1px solid var(--line)",
              color: "var(--text)",
              fontFamily: "'Inter'",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={pending || !note.trim()}
            style={{
              padding: "14px 22px",
              borderRadius: 10,
              background: "var(--accent)",
              color: "var(--bg)",
              fontFamily: "'JetBrains Mono'",
              fontSize: 11,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              fontWeight: 600,
              border: 0,
              cursor: note.trim() && !pending ? "pointer" : "not-allowed",
              opacity: note.trim() && !pending ? 1 : 0.5,
            }}
          >
            {pending ? "..." : "Post"}
          </button>
        </form>
      </div>
    </div>
  );
}
