"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

export function FloatCta() {
  const t = useT();
  return (
    <Link className="float-cta" id="floatCta" href="/contact">
      ◉ {t("cta.float")} <span className="arr">→</span>
    </Link>
  );
}
