"use client";

import { useActionState, useEffect } from "react";
import { LocaleLink } from "@/components/LocaleLink";
import { subscribe, type SubscribeState } from "@/app/actions/subscribe";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Eén plek voor de bron, zodat het verborgen veld en het doel niet uit
// elkaar kunnen lopen: de database en Plausible dragen dezelfde waarde.
const BRON = "cta_landing";

const initial: SubscribeState = { status: "idle" };

export function CtaBig() {
  const [state, formAction, pending] = useActionState(subscribe, initial);
  const { t, locale } = useLocale();

  // Vuurt zodra de opt-in is geslaagd, niet bij een klik -- net als
  // `Contact Submitted`. Zonder dit doel was een inschrijving alleen in
  // `marketing.subscribers` te zien en nergens in het dashboard.
  //
  // `typeof`, geen `?.()`: die vorm valt alleen terug op null en undefined, en
  // een truthy niet-functie werpt hier binnen een effect. Zie
  // lib/plausible-aanroep.test.ts.
  useEffect(() => {
    if (state.status !== "ok") return;
    const w = window as unknown as {
      plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
    };
    if (typeof w.plausible === "function") {
      w.plausible("Nieuwsbrief", { props: { bron: BRON } });
    }
  }, [state.status]);

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
        <input type="hidden" name="source" value={BRON} />
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
