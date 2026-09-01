"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/useT";
import {
  leesToestemming,
  schrijfToestemming,
  TOESTEMMING_EVENT,
  type Keuze,
} from "@/lib/toestemming";

/* De intrekknop op /privacy. AVG art. 7 lid 3 eist dat intrekken net zo
   makkelijk is als geven -- de banner is een klik, dus dit moet dat ook zijn.
   Vandaar een knop en geen formulier, geen bevestigingsdialoog, geen
   "weet je het zeker".

   Hij schrijft alleen de keuze weg. Wat er daarna met GA4 gebeurt -- laden of
   Google's ga-disable-vlag zetten -- doet components/Toestemming.tsx, dat op
   hetzelfde event luistert. Een tweede plek die het script aanraakt zou een
   tweede lijst zijn die uit elkaar loopt. */
export function ToestemmingKnop() {
  const t = useT();
  const [keuze, setKeuze] = useState<Keuze | null | undefined>(undefined);

  useEffect(() => {
    const lees = () => setKeuze(leesToestemming());
    lees();
    window.addEventListener(TOESTEMMING_EVENT, lees);
    return () => window.removeEventListener(TOESTEMMING_EVENT, lees);
  }, []);

  if (keuze === undefined) {
    /* Zelfde laadvak als AnalyticsOptOut. Zonder dit verschilt de server-HTML
       van de eerste client-render en klaagt React over hydratie. */
    return (
      <div
        style={{
          padding: "18px 20px",
          border: "1px solid var(--line)",
          borderRadius: 12,
          background: "rgba(10,36,24,.4)",
          fontSize: 14,
          color: "var(--muted-soft)",
        }}
      >
        {t("priv.optout.loading")}
      </div>
    );
  }

  const aan = keuze === "ja";

  return (
    <div
      style={{
        padding: "20px 22px",
        border: "1px solid var(--line)",
        borderRadius: 12,
        background: "rgba(10,36,24,.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 260px" }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>
          {aan ? t("consent.state.on") : t("consent.state.off")}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>
          {t("consent.state.body")}
        </div>
      </div>
      <button
        type="button"
        onClick={() => schrijfToestemming(aan ? "nee" : "ja")}
        className="btn"
        style={{ whiteSpace: "nowrap" }}
        aria-pressed={aan}
      >
        {aan ? t("consent.state.btn.off") : t("consent.state.btn.on")}
      </button>
    </div>
  );
}
