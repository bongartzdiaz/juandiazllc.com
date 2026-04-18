"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Full-bleed embedded DEUS dashboard.
 * The dashboard owns the entire viewport. A small floating dock
 * (bottom-right) gives quick access to Jobs / Site / Sign out
 * without stealing pixels from the dashboard above it.
 */
export function DashboardFrame() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
      <iframe
        src="/diaz/dashboard.html"
        title="DEUS Dashboard"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          border: 0,
          background: "var(--bg)",
          zIndex: 1,
        }}
      />

      {/* Floating dock — bottom-right */}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {open && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: 8,
              background: "rgba(6,32,26,.92)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              backdropFilter: "blur(14px)",
              boxShadow: "0 20px 50px rgba(0,0,0,.5)",
              minWidth: 180,
              pointerEvents: "auto",
            }}
          >
            <Link
              href="/diaz/app/jobs"
              onClick={() => setOpen(false)}
              style={dockItem}
            >
              ◉ Jobs board
            </Link>
            <Link href="/" onClick={() => setOpen(false)} style={dockItem}>
              ← juandiazllc.com
            </Link>
            <button
              onClick={() => {
                start(async () => {
                  await signOut();
                  router.push("/diaz/login");
                  router.refresh();
                });
              }}
              disabled={pending}
              style={{ ...dockItem, color: "#FF9B9B", cursor: "pointer", border: 0, background: "transparent", textAlign: "left" }}
            >
              {pending ? "Signing out…" : "Sign out →"}
            </button>
          </div>
        )}

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "var(--bg)",
            border: 0,
            cursor: "pointer",
            fontFamily: "'JetBrains Mono'",
            fontSize: 16,
            fontWeight: 700,
            boxShadow: "0 14px 40px rgba(94,255,177,.4), 0 0 0 1px rgba(94,255,177,.6)",
            pointerEvents: "auto",
            transition: "transform .25s var(--ease)",
            transform: open ? "rotate(45deg)" : "rotate(0)",
          }}
        >
          ⏻
        </button>
      </div>
    </>
  );
}

const dockItem: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  fontFamily: "'JetBrains Mono'",
  fontSize: 11,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--text)",
  textDecoration: "none",
  display: "block",
  transition: "background .2s",
};
