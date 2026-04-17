"use client";

import { useActionState } from "react";
import Link from "next/link";
import { subscribe, type SubscribeState } from "@/app/actions/subscribe";
import { useT } from "@/lib/i18n/useT";

const initial: SubscribeState = { status: "idle" };

export function CtaBig() {
  const [state, formAction, pending] = useActionState(subscribe, initial);
  const t = useT();

  return (
    <section className="cta-big" id="cta">
      <div className="label">{t("cta.label")}</div>
      <h2 data-reveal>
        {t("cta.title.a")} <em>{t("cta.title.b")}</em>
      </h2>
      <p className="lede" data-reveal>{t("cta.lede")}</p>
      <div className="btns" data-reveal>
        <Link className="btn primary btn-mag" href="/contact">
          {t("cta.primary")} <span className="arr">→</span>
        </Link>
        <Link className="btn ghost" href="/work">
          {t("cta.secondary")} <span className="arr">→</span>
        </Link>
      </div>
      <form className="news" data-reveal action={formAction}>
        <input
          type="email"
          name="email"
          placeholder={t("cta.news.placeholder")}
          required
          disabled={state.status === "ok"}
        />
        <input type="hidden" name="source" value="cta_landing" />
        <button type="submit" disabled={pending || state.status === "ok"}>
          {state.status === "ok" ? t("cta.news.submitted") : pending ? "..." : t("cta.news.submit")}
        </button>
      </form>
      {state.status !== "idle" && state.message && (
        <div
          className="news-hint"
          style={{ color: state.status === "ok" ? "var(--accent)" : "#FF9B9B" }}
        >
          {state.message}
        </div>
      )}
      {state.status === "idle" && (
        <div className="news-hint" data-reveal>{t("cta.news.hint")}</div>
      )}
    </section>
  );
}
