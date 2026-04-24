import { translate, type Locale } from "@/lib/i18n/dict";

export function Process({ locale }: { locale: Locale }) {
  const t = (k: string) => translate(locale, k);
  const steps = [1, 2, 3, 4, 5].map((i) => ({
    n: `0${i}`,
    name: t(`process.${i}.name`),
    titleA: t(`process.${i}.title.a`),
    titleB: t(`process.${i}.title.b`),
    body: t(`process.${i}.body`),
  }));

  return (
    <section className="process" id="process">
      <div className="proc-inner">
        <div className="sec-head" data-reveal style={{ marginBottom: 60 }}>
          <div>
            <div className="label">{t("process.label")}</div>
            <h2>
              {t("process.title.a")}<br />
              {t("process.title.b")} <em>{t("process.title.c")}</em>
            </h2>
          </div>
          <p>{t("process.sub")}</p>
        </div>

        <div className="proc-grid" data-reveal>
          {steps.map((s) => (
            <div key={s.n} className="proc-step">
              <div>
                <div className="n"><em>{s.n}</em> / {s.name}</div>
                <h5>{s.titleA} <em>{s.titleB}</em></h5>
                <p>{s.body}</p>
              </div>
              <div className="dot" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
