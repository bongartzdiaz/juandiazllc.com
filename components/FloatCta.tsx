"use client";

import { LocaleLink } from "@/components/LocaleLink";
import { useT } from "@/lib/i18n/useT";

export function FloatCta() {
  const t = useT();
  return (
    <LocaleLink className="float-cta" id="floatCta" href="/contact">
      ◉ {t("cta.float")} <span className="arr">→</span>
    </LocaleLink>
  );
}
