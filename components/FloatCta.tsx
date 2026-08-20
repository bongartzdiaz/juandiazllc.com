"use client";

import { usePathname } from "next/navigation";
import { LocaleLink } from "@/components/LocaleLink";
import { useT } from "@/lib/i18n/useT";

// Zwevende knop naar de eerste stap, op elke pagina — behalve op /contact zelf.
//
// Daar wees hij naar de pagina waar de bezoeker al staat, tweehonderd pixels
// boven de échte boekknop en met precies dezelfde tekst. Zolang die twee
// verschillend heetten viel dat niet op; sinds beide `cta.book` dragen is het
// een knop die niets doet naast een knop die alles doet.
export function FloatCta() {
  const t = useT();
  const pad = usePathname();

  if (pad?.replace(/\/$/, "").endsWith("/contact")) return null;

  return (
    <LocaleLink className="float-cta" id="floatCta" href="/contact">
      ◉ {t("cta.book")} <span className="arr">→</span>
    </LocaleLink>
  );
}
