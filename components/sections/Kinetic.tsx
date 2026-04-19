"use client";

import { useT } from "@/lib/i18n/useT";

export function Kinetic() {
  const t = useT();
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
