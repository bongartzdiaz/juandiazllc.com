"use client";

import Link from "next/link";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In progress" },
  { key: "complete", label: "Complete" },
];

export function JobsFilter({
  current,
  counts,
}: {
  current: string;
  counts: Record<string, number>;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {FILTERS.map((f) => {
        const active = current === f.key;
        return (
          <Link
            key={f.key}
            href={f.key === "all" ? "/app/jobs" : `/app/jobs?status=${f.key}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              borderRadius: 999,
              border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
              color: active ? "var(--accent)" : "var(--muted)",
              background: active ? "rgba(94,255,177,.06)" : "rgba(10,36,24,.4)",
              fontFamily: "'JetBrains Mono'",
              fontSize: 11,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              transition: "all .3s var(--ease)",
            }}
          >
            {f.label}
            <span
              style={{
                fontSize: 10,
                color: active ? "var(--accent)" : "var(--muted-soft)",
                padding: "2px 6px",
                background: "rgba(3,20,15,.6)",
                borderRadius: 6,
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {counts[f.key] ?? 0}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
