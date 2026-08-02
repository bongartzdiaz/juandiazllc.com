import { translate, type Locale } from "@/lib/i18n/dict";

// Honest live signals. Numbers below reflect real portfolio state.
// Update when reality changes. Do not fabricate.
const SIGNALS = [
  { id: "0", n: "5", kind: "ventures" },
  { id: "1", n: "4", kind: "sectors" },
  { id: "2", n: "€0", kind: "kickbacks" },
  { id: "3", n: "1", kind: "founder" },
] as const;

type Props = { locale: Locale };

export function LiveSignals({ locale }: Props) {
  const t = (k: string) => translate(locale, k);

  return (
    <section className="livesignals" aria-labelledby="ls-title">
      <div className="livesignals-head">
        <span className="livesignals-eyebrow">
          <span className="livesignals-dot" aria-hidden />
          {t("fomo.proof.eyebrow")}
        </span>
        {/* fomo.proof.title bevat <em>. Met {t(...)} kwam die tag als tekst op
            het scherm ("in <em>echte cijfers</em>."), in alle vier de talen.
            Inhoud komt uit dict.ts en is dus door onszelf geschreven — dit is
            hetzelfde patroon als de andere <em>-dragende koppen op de site. */}
        <h2
          id="ls-title"
          className="livesignals-title"
          dangerouslySetInnerHTML={{ __html: t("fomo.proof.title") }}
        />
      </div>
      <div className="livesignals-grid">
        {SIGNALS.map((s) => (
          <div key={s.id} className="livesignals-cell">
            <span className="livesignals-num">{s.n}</span>
            <span className="livesignals-label">{t(`fomo.proof.${s.id}.l`)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
