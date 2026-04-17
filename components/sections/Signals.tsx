"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import { SIGNALS } from "@/lib/signals";

export function Signals() {
  const t = useT();
  const posts = SIGNALS.slice(0, 3);
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
            <h4>{p.title}</h4>
            <div className="tag">Read →</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
