import { translate, type Locale } from "@/lib/i18n/dict";

export function Contact({ locale }: { locale: Locale }) {
  const t = (k: string) => translate(locale, k);
  return (
    <section className="contact" id="contact">
      <div className="label">{t("contact.section.label")}</div>
      <a className="mail" href="mailto:juan@juandiazllc.com">
        juan<em>@</em>juandiazllc.com
      </a>
      <div className="subs">
        <a href="https://linkedin.com/in/juanstefan" target="_blank" rel="noopener noreferrer">
          LinkedIn — /juanstefan
        </a>
        <a href="https://instagram.com/diazelcazador" target="_blank" rel="noopener noreferrer">
          Instagram — @diazelcazador
        </a>
        <a href="https://kompasagency.nl" target="_blank" rel="noopener noreferrer">
          Kompas Agency
        </a>
      </div>
    </section>
  );
}
