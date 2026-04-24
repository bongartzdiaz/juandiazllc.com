import { translate, type Locale } from "@/lib/i18n/dict";

export function Marquee({ locale }: { locale: Locale }) {
  const html = translate(locale, "marquee.full");
  return (
    <div className="marquee">
      <div className="marquee-track">
        <span dangerouslySetInnerHTML={{ __html: html }} />
        <span dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
