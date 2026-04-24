"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/dict";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  section: string;
  run: () => void;
  keywords?: string[];
};

export function CommandPalette() {
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const go = (href: string) => () => { setOpen(false); router.push(href); };
    const ext = (url: string) => () => { setOpen(false); window.open(url, "_blank", "noopener,noreferrer"); };
    const switchLocale = (l: Locale) => () => { setLocale(l); setOpen(false); };
    return [
      { id: "nav-home", section: "Pages", label: "Home", hint: "/", run: go("/"), keywords: ["landing", "start"] },
      { id: "nav-story", section: "Pages", label: "Story", hint: "/story", run: go("/story") },
      { id: "nav-work", section: "Pages", label: "Work / Ventures", hint: "/work", run: go("/work") },
      { id: "nav-signals", section: "Pages", label: "Signals", hint: "/signals", run: go("/signals") },
      { id: "nav-contact", section: "Pages", label: "Contact", hint: "/contact", run: go("/contact"), keywords: ["book", "call", "email"] },
      { id: "nav-login", section: "Pages", label: "Login", hint: "/login", run: go("/login"), keywords: ["sign in", "client"] },
      { id: "nav-app", section: "Pages", label: "Operator hub", hint: "/app", run: go("/app"), keywords: ["dashboard"] },
      { id: "v-voltafy", section: "Ventures", label: "Voltafy", hint: "voltafy.nl", run: ext("https://voltafy.nl") },
      { id: "v-pt", section: "Ventures", label: "Performance Tracker", hint: "performancetracker.nl", run: ext("https://performancetracker.nl") },
      { id: "v-hmb", section: "Ventures", label: "Help Mij Besparen", hint: "helpmijbesparen.nl", run: ext("https://helpmijbesparen.nl") },
      { id: "v-sr", section: "Ventures", label: "Salderingsregeling 2027", hint: "salderingsregeling2027.nl", run: ext("https://salderingsregeling2027.nl") },
      { id: "social-li", section: "Social", label: "LinkedIn — /juanstefan", run: ext("https://linkedin.com/in/juanstefan") },
      { id: "social-ig", section: "Social", label: "Instagram — @diazelcazador", run: ext("https://instagram.com/diazelcazador") },
      { id: "mail", section: "Social", label: "Email Juan", hint: "juan@juandiazllc.com", run: () => { setOpen(false); window.location.href = "mailto:juan@juandiazllc.com"; } },
      ...LOCALES.map((l) => ({
        id: `lang-${l}`,
        section: "Language",
        label: `Switch to ${LOCALE_NAMES[l]}${l === locale ? " (current)" : ""}`,
        hint: l.toUpperCase(),
        run: switchLocale(l as Locale),
      })),
    ];
  }, [router, locale, setLocale]);

  const filtered = useMemo(() => {
    if (!q.trim()) return commands;
    const needle = q.toLowerCase();
    return commands.filter((c) => {
      const hay = [c.label, c.hint ?? "", c.section, ...(c.keywords ?? [])].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [commands, q]);

  useEffect(() => { setActive(0); }, [q, open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(filtered.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[active];
        if (cmd) cmd.run();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  if (!open) return null;

  // Group filtered by section, preserve original order
  const grouped: { section: string; items: Cmd[] }[] = [];
  filtered.forEach((c) => {
    const last = grouped[grouped.length - 1];
    if (last && last.section === c.section) last.items.push(c);
    else grouped.push({ section: c.section, items: [c] });
  });

  let flatIdx = 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(3,20,15,.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "12vh 16px 16px",
        animation: "fadein .18s var(--ease)",
      }}
    >
      <div
        style={{
          width: "min(640px, 100%)",
          background: "rgba(6,32,26,.96)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 40px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(94,255,177,.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
          <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 14 }}>◉</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search or navigate — pages, ventures, languages"
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              outline: "none",
              color: "var(--text)",
              fontFamily: "var(--font-inter)",
              fontSize: 16,
              letterSpacing: "-.01em",
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", color: "var(--muted-soft)", textTransform: "uppercase", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6 }}>
            ESC
          </span>
        </div>
        <div style={{ maxHeight: "52vh", overflowY: "auto", padding: 8 }}>
          {grouped.length === 0 ? (
            <div style={{ padding: "24px 16px", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>
              No matches
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.section} style={{ marginBottom: 4 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--muted-soft)", padding: "10px 12px 6px" }}>
                  {g.section}
                </div>
                {g.items.map((c) => {
                  const i = flatIdx++;
                  const isActive = i === active;
                  return (
                    <button
                      key={c.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={c.run}
                      style={{
                        display: "flex",
                        width: "100%",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: isActive ? "rgba(94,255,177,.08)" : "transparent",
                        color: isActive ? "var(--text)" : "var(--muted)",
                        border: isActive ? "1px solid rgba(94,255,177,.25)" : "1px solid transparent",
                        cursor: "pointer",
                        fontFamily: "var(--font-inter)",
                        fontSize: 14,
                        textAlign: "left",
                        transition: "background .15s",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: isActive ? "var(--accent)" : "var(--muted-soft)", fontFamily: "var(--font-mono)", fontSize: 10 }}>›</span>
                        {c.label}
                      </span>
                      {c.hint && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", color: "var(--muted-soft)" }}>
                          {c.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted-soft)" }}>
          <span>↑↓ Navigate · ↵ Select</span>
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
