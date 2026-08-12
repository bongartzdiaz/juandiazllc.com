"use client";

import { useT } from "@/lib/i18n/useT";

export function Contact() {
  const t = useT();
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
        {/*
          Hier stond een link "Kompas Agency" naar kompasagency.nl. Weg op
          2026-08-12: dit werk valt onder Juans eigen naam, niet onder dat
          bureau, dus de link noemde een ander bedrijf als zijn kanaal.

          Hij was bovendien stuk. Gemeten dezelfde dag: kompasagency.nl
          serveert een certificaat op naam van CN=*.hostnetbv.nl — het
          standaard-wildcard van de hoster, niet van het domein zelf. DNS
          klopt en de server antwoordt, maar elke browser toont eerst een
          schermvullende beveiligingswaarschuwing. Deze link stond op de
          homepage in alle vier de talen.

          Zet hier niets terug zonder te controleren dat het adres een geldig
          certificaat op de eigen naam heeft.
        */}
      </div>
    </section>
  );
}
