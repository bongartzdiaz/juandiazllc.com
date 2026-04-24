"use client";

import { useActionState, useState } from "react";
import { submitLead, type ContactState } from "@/app/actions/contact";
import { useT } from "@/lib/i18n/useT";

// 3-step progressive intake.
// 1) Sector (visual choice — micro-commitment, no typing)
// 2) Stage in the build (same pattern, one tap)
// 3) Name + email + optional note (the only step that takes typing)
//
// Steps 1 and 2 feed the existing `sector` and `source` fields on the
// server action so no backend change is needed. The stage is appended
// to `source` as "contact_page:stage=<value>" — readable in Supabase
// without a migration.

const initial: ContactState = { status: "idle" };

const SECTORS: Array<{ value: string; key: string }> = [
  { value: "Energy", key: "contact.sector.energy" },
  { value: "Real estate", key: "contact.sector.realestate" },
  { value: "Hospitality", key: "contact.sector.hospitality" },
  { value: "Logistics", key: "contact.sector.logistics" },
  { value: "Retail", key: "contact.sector.retail" },
  { value: "Other", key: "contact.sector.other" },
];

const STAGES: Array<{ value: string; key: string }> = [
  { value: "survey", key: "form.step2.survey" },
  { value: "blueprint", key: "form.step2.blueprint" },
  { value: "build", key: "form.step2.build" },
  { value: "operate", key: "form.step2.operate" },
];

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitLead, initial);
  const t = useT();
  const [step, setStep] = useState(1);
  const [sector, setSector] = useState("");
  const [stage, setStage] = useState("");
  const totalSteps = 3;
  const canAdvanceFrom1 = sector !== "";
  const canAdvanceFrom2 = stage !== "";
  const progress = state.status === "ok" ? 100 : Math.round(((step - 1) / totalSteps) * 100 + 33);

  return (
    <div className="auth-card progressive-form" style={{ maxWidth: 720, padding: "40px 36px" }}>
      <div className="pf-progress" aria-hidden>
        <div className="pf-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="pf-step-label">
        {t("form.step")} {Math.min(step, totalSteps)} {t("form.of")} {totalSteps}
      </div>

      <h1>
        {t("contact.title.a")} <em>{t("contact.title.b")}</em>
      </h1>
      <p>{t("contact.lede")}</p>

      <form className="auth-form" action={formAction}>
        {/* Step 1 — sector */}
        {step === 1 && state.status !== "ok" && (
          <div className="pf-step">
            <h2 className="pf-h2">{t("form.step1.title")}</h2>
            <p className="pf-sub">{t("form.step1.sub")}</p>
            <div className="pf-choices">
              {SECTORS.map((s) => (
                <button
                  type="button"
                  key={s.value}
                  onClick={() => setSector(s.value)}
                  className={`pf-choice ${sector === s.value ? "is-selected" : ""}`}
                  aria-pressed={sector === s.value}
                >
                  {t(s.key)}
                </button>
              ))}
            </div>
            <div className="pf-actions">
              <button
                type="button"
                className="pf-next"
                onClick={() => canAdvanceFrom1 && setStep(2)}
                disabled={!canAdvanceFrom1}
              >
                {t("form.next")} →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — stage */}
        {step === 2 && state.status !== "ok" && (
          <div className="pf-step">
            <h2 className="pf-h2">{t("form.step2.title")}</h2>
            <p className="pf-sub">{t("form.step2.sub")}</p>
            <div className="pf-choices pf-choices-stack">
              {STAGES.map((s) => (
                <button
                  type="button"
                  key={s.value}
                  onClick={() => setStage(s.value)}
                  className={`pf-choice ${stage === s.value ? "is-selected" : ""}`}
                  aria-pressed={stage === s.value}
                >
                  {t(s.key)}
                </button>
              ))}
            </div>
            <div className="pf-actions">
              <button type="button" className="pf-back" onClick={() => setStep(1)}>
                ← {t("form.back")}
              </button>
              <button
                type="button"
                className="pf-next"
                onClick={() => canAdvanceFrom2 && setStep(3)}
                disabled={!canAdvanceFrom2}
              >
                {t("form.next")} →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — details + submit */}
        {step === 3 && state.status !== "ok" && (
          <div className="pf-step">
            <h2 className="pf-h2">{t("form.step3.title")}</h2>
            <p className="pf-sub">{t("form.step3.sub")}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label htmlFor="name">{t("form.step3.name")}</label>
                <input id="name" name="name" type="text" autoComplete="name" />
              </div>
              <div>
                <label htmlFor="email">{t("form.step3.email")} *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@domain.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="company">{t("contact.company")}</label>
              <input id="company" name="company" type="text" autoComplete="organization" />
            </div>

            <label htmlFor="message">{t("form.step3.note")}</label>
            <textarea
              id="message"
              name="message"
              rows={4}
              placeholder={t("contact.message.placeholder")}
              required
              minLength={10}
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                background: "rgba(3,20,15,.6)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontFamily: "var(--font-inter)",
                fontSize: 15,
                lineHeight: 1.55,
                outline: "none",
                resize: "vertical",
                minHeight: 100,
              }}
            />

            <input type="hidden" name="sector" value={sector} />
            <input type="hidden" name="source" value={`contact_page:stage=${stage}`} />
            {/* Honeypot */}
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="website">Website (leave blank)</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="pf-actions">
              <button type="button" className="pf-back" onClick={() => setStep(2)}>
                ← {t("form.back")}
              </button>
              <button type="submit" disabled={pending}>
                {pending ? t("contact.submitting") : t("form.submit")}
              </button>
            </div>

            {state.status === "err" && state.message && (
              <div className="auth-msg err">{state.message}</div>
            )}
          </div>
        )}

        {state.status === "ok" && (
          <div className="pf-done">
            <div className="pf-done-icon" aria-hidden>✓</div>
            <h2 className="pf-h2">{t("contact.sent")}</h2>
            <p className="pf-sub">{state.message}</p>
          </div>
        )}
      </form>

      <div className="auth-alt">
        {t("contact.alt")} <a href="mailto:juan@juandiazllc.com">juan@juandiazllc.com</a>
      </div>
    </div>
  );
}
