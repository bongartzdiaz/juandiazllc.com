"use client";

import { useActionState } from "react";
import { submitLead, type ContactState } from "@/app/actions/contact";

const initial: ContactState = { status: "idle" };

const SECTORS = ["Energy", "Real estate", "Hospitality", "Logistics", "Retail", "Other"];

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitLead, initial);

  return (
    <div className="auth-card" style={{ maxWidth: 720, padding: "40px 36px" }}>
      <h1>Tell me what you&apos;re <em>building.</em></h1>
      <p>All fields except email + message are optional. Shorter is better. I read every one.</p>

      <form className="auth-form" action={formAction}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" placeholder="Your name" autoComplete="name" />
          </div>
          <div>
            <label htmlFor="email">Email *</label>
            <input id="email" name="email" type="email" placeholder="you@domain.com" required autoComplete="email" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label htmlFor="company">Company</label>
            <input id="company" name="company" type="text" placeholder="Your company" autoComplete="organization" />
          </div>
          <div>
            <label htmlFor="sector">Sector</label>
            <select
              id="sector"
              name="sector"
              defaultValue=""
              style={{
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
              }}
            >
              <option value="" disabled>Pick one</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="message">What are you trying to solve? *</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Two or three sentences is plenty."
          required
          minLength={10}
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            background: "rgba(3,20,15,.6)",
            border: "1px solid var(--line)",
            color: "var(--text)",
            fontFamily: "'Inter'",
            fontSize: 15,
            lineHeight: 1.55,
            outline: "none",
            resize: "vertical",
            minHeight: 120,
          }}
        />

        <input type="hidden" name="source" value="contact_page" />

        <button type="submit" disabled={pending || state.status === "ok"}>
          {state.status === "ok"
            ? "✓ Sent"
            : pending
            ? "Sending..."
            : "Send it"}
        </button>

        {state.status !== "idle" && state.message && (
          <div className={`auth-msg ${state.status}`}>
            {state.message}
          </div>
        )}
      </form>

      <div className="auth-alt">
        Prefer email directly? <a href="mailto:juan@juandiazllc.com">juan@juandiazllc.com</a>
      </div>
    </div>
  );
}
