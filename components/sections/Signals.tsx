"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getSignals } from "@/lib/signals";

export function Signals() {
  const { t, locale } = useLocale();
  const posts = getSignals(locale).slice(0, 3);
  return (
    <section id="signals">
      <div className="sec-head" data-reveal>
        <div>
          <div className="label">{t("signals.label")}</div>
          <h2>{t("signals.title.a")}<br />{t("signals.title.b").replace(/\.$/, "")}<em>.</em></h2>
        </div>
        <p>{t("signals.sub")}</p>
      </div>
      <div className="signals">
        {posts.map((p) => (
          <Link key={p.slug} href={`/signals/${p.slug}`} className="sig" data-reveal>
            <div className="date">— {p.dateLabel}</div>
            <h3>{p.title}</h3>
            <div className="tag">{t("signals.read")}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
