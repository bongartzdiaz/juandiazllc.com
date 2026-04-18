"use client";

import { useActionState } from "react";
import { submitLead, type ContactState } from "@/app/actions/contact";
import { useT } from "@/lib/i18n/useT";

const initial: ContactState = { status: "idle" };

const SECTORS = ["Energy", "Real estate", "Hospitality", "Logistics", "Retail", "Other"];

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitLead, initial);
  const t = useT();

  return (
    <div className="auth-card" style={{ maxWidth: 720, padding: "40px 36px" }}>
      <h1>{t("contact.title.a")} <em>{t("contact.title.b")}</em></h1>
      <p>{t("contact.lede")}</p>

      <form className="auth-form" action={formAction}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label htmlFor="name">{t("contact.name")}</label>
            <input id="name" name="name" type="text" autoComplete="name" />
          </div>
          <div>
            <label htmlFor="email">{t("contact.email")} *</label>
            <input id="email" name="email" type="email" placeholder="you@domain.com" required autoComplete="email" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label htmlFor="company">{t("contact.company")}</label>
            <input id="company" name="company" type="text" autoComplete="organization" />
          </div>
          <div>
            <label htmlFor="sector">{t("contact.sector")}</label>
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
              <option value="" disabled>{t("contact.sector.pick")}</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="message">{t("contact.message")} *</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder={t("contact.message.placeholder")}
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
        {/* Honeypot: hidden from users via .hp-field, bots will fill. */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="website">Website (leave blank)</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <button type="submit" disabled={pending || state.status === "ok"}>
          {state.status === "ok"
            ? t("contact.sent")
            : pending
            ? t("contact.submitting")
            : t("contact.submit")}
        </button>

        {state.status !== "idle" && state.message && (
          <div className={`auth-msg ${state.status}`}>{state.message}</div>
        )}
      </form>

      <div className="auth-alt">
        {t("contact.alt")} <a href="mailto:juan@juandiazllc.com">juan@juandiazllc.com</a>
      </div>
    </div>
  );
}
