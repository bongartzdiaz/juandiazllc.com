"use client";

import { useT } from "@/lib/i18n/useT";

export function Marquee() {
  const t = useT();
  const html = t("marquee.full");
  return (
    <div className="marquee">
      <div className="marquee-track">
        <span dangerouslySetInnerHTML={{ __html: html }} />
        <span dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
