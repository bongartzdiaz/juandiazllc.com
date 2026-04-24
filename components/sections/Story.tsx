import { Countdown } from "./Countdown";
import { translate, type Locale } from "@/lib/i18n/dict";

const TIMELINE = [
  "amsterdam",
  "construction",
  "crossover",
  "voltafy",
  "hmb",
  "philly",
  "now",
] as const;

const BODY_KEYS = [
  "story.body.p1",
  "story.body.p2",
  "story.body.p3",
  "story.body.p4",
  "story.body.p5",
] as const;

export function Story({ locale }: { locale: Locale }) {
  const t = (k: string) => translate(locale, k);
  return (
    <section className="story" id="story">
      <div data-reveal>
        <div className="label" style={{ marginBottom: 40 }}>{t("story.label")}</div>
        <h2 className="story-lead">
          <span className="q">&ldquo;</span>{t("story.lead.a")}
          <br />
          {t("story.lead.b").split("blueprint").map((part, i, arr) =>
            i < arr.length - 1 ? (
              <span key={i}>{part}<em>blueprint</em></span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
          <span className="q" style={{ marginLeft: ".1em", marginRight: 0 }}>
            &rdquo;
          </span>
        </h2>
      </div>

      <div className="story-grid">
        <aside className="timeline" data-reveal>
          {TIMELINE.map((slug, i) => (
            <div key={slug} className={`tl-item${i < TIMELINE.length - 1 ? " on" : ""}`}>
              <div className="y">{t(`story.tl.${slug}.y`)}</div>
              <div className="t">{t(`story.tl.${slug}.t`)}</div>
            </div>
          ))}
        </aside>

        <div className="story-body" data-reveal>
          {BODY_KEYS.map((k, i) => (
            <p
              key={k}
              className={i === 0 ? "lead" : undefined}
              dangerouslySetInnerHTML={{ __html: t(k) }}
            />
          ))}

          <div className="story-sign">
            <div className="sig-mark">Juan</div>
            <div className="who">
              <b>Juan Stefan Diaz</b>
              {t("story.sign.role")}
            </div>
          </div>
        </div>
      </div>

      <Countdown />
    </section>
  );
}
