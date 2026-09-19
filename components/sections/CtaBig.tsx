"use client";

import { useActionState } from "react";
import { LocaleLink } from "@/components/LocaleLink";
import { subscribe, type SubscribeState } from "@/app/actions/subscribe";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initial: SubscribeState = { status: "idle" };

export function CtaBig() {
  const [state, formAction, pending] = useActionState(subscribe, initial);
  const { t, locale } = useLocale();

  return (
    <section className="cta-big" id="cta">
      <div className="label">{t("cta.label")}</div>
      <h2 data-reveal>
        {t("cta.title.a")} <em>{t("cta.title.b")}</em>
      </h2>
      <p className="lede" data-reveal>{t("cta.lede")}</p>
      <div className="btns" data-reveal>
        <LocaleLink className="btn primary btn-mag" href="/contact">
          {t("cta.book")} <span className="arr">→</span>
        </LocaleLink>
        <LocaleLink className="btn ghost" href="/work">
          {t("cta.secondary")} <span className="arr">→</span>
        </LocaleLink>
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
        {/* Zonder dit veld antwoordt `subscribe` in het Engels, ook op
            /nl, /de en /es. NewsletterForm stuurde hem al mee. */}
        <input type="hidden" name="locale" value={locale} />
        {/* Honeypot -- zelfde truc als NewsletterForm; subscribe.ts leest
            `website` sinds 2026-09-19 en antwoordt een bot met nep-ok. */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="cta-website">Website</label>
          <input id="cta-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
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
