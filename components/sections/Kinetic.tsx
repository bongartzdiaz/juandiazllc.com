import { translate, type Locale } from "@/lib/i18n/dict";

export function Kinetic({ locale }: { locale: Locale }) {
  const t = (k: string) => translate(locale, k);
  const body = t("kinetic.body");
  return (
    <div className="kinetic">
      <div className="sub">
        <span>{t("kinetic.transmission")}</span>
        <span>{t("kinetic.subtitle")}</span>
      </div>
      <div className="big">
        <span dangerouslySetInnerHTML={{ __html: body }} />
        <span dangerouslySetInnerHTML={{ __html: body }} />
      </div>
    </div>
  );
}
