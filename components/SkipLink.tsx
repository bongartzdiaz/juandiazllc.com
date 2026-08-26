"use client";

import { useT } from "@/lib/i18n/useT";

/**
 * De skip-link van de wortel-layout.
 *
 * Waarom een eigen component: app/layout.tsx staat BUITEN het [locale]-segment
 * en heeft dus geen params.locale om translate(l, ...) mee te voeden. Wat er wel
 * is, is LocaleProvider — die leidt de taal af uit useParams() en staat in
 * diezelfde wortel-layout om de skip-link heen. Een client component kan hem
 * daarom gewoon consumeren.
 *
 * Dit is de eerste landmark die een toetsenbordgebruiker raakt. Onvertaald is
 * hij op /nl, /de en /es een echt gebrek, geen cosmetisch.
 */
export function SkipLink() {
  const t = useT();
  return (
    <a href="#main" className="skip">
      {t("nav.skip")}
    </a>
  );
}
