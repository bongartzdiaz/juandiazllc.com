"use client";

import { useMemo, useState } from "react";

// Energy ROI calculator — honest math under the Dutch 2027 salderings-
// regeling phase-out. Three scenarios: pre-2027 baseline, post-2027 no
// battery, post-2027 with battery. Everything is pure math in the
// browser — no backend, no tracking. The numbers are conservative by
// default so readers leave with a believable payback, not a pitch.
//
// Defaults reflect a typical Dutch rowhouse:
//   3500 kWh/year consumption, 4 kWp system, €0.30/kWh consumer price,
//   €0.05/kWh post-2027 feed-in, €5000 installed system price.
// Self-consumption jumps from ~30% (no battery) to ~65% (10 kWh battery).

export type RoiLabels = {
  inputs: string;
  consumption: string;
  systemSize: string;
  systemPrice: string;
  consumerPrice: string;
  feedInPrice: string;
  yield: string;
  addBattery: string;
  batterySize: string;
  batteryPrice: string;
  selfConsumptionNoBat: string;
  selfConsumptionWithBat: string;
  results: string;
  scenarioSaldering: string;
  scenarioNoBat: string;
  scenarioWithBat: string;
  saldSub: string;
  noBatSub: string;
  withBatSub: string;
  annualSavings: string;
  payback: string;
  deltaLabel: string;
  productionLine: string;
  years: string;
  smallprint: string;
};

type Props = { labels: RoiLabels; localeCode?: string };

// Currency + number formatting follows the user's locale. EUR stays
// the unit (the calculator is Dutch-market specific — Salderingsregeling
// 2027 only applies in NL), but the thousands/decimal separators and
// currency-symbol placement track en-US / nl-NL / de-DE / es-ES.
function eur(n: number, localeCode: string): string {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat(localeCode, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function years(n: number): string {
  if (!isFinite(n) || n <= 0) return "—";
  return n.toFixed(1);
}

export function EnergyRoi({ labels, localeCode = "nl-NL" }: Props) {
  const [consumption, setConsumption] = useState(3500);
  const [systemSize, setSystemSize] = useState(4);
  const [systemPrice, setSystemPrice] = useState(5000);
  const [consumerPrice, setConsumerPrice] = useState(0.3);
  const [feedInPrice, setFeedInPrice] = useState(0.05);
  const [yieldPerKwp, setYieldPerKwp] = useState(900);
  const [withBattery, setWithBattery] = useState(false);
  const [batterySize, setBatterySize] = useState(10);
  const [batteryPrice, setBatteryPrice] = useState(6000);
  const [scNoBat, setScNoBat] = useState(0.3);
  const [scWithBat, setScWithBat] = useState(0.65);

  const r = useMemo(() => {
    const production = systemSize * yieldPerKwp;
    const directNoBat = Math.min(production * scNoBat, consumption);
    const directWithBat = Math.min(production * scWithBat, consumption);
    const feedInFromNoBat = Math.max(production - directNoBat, 0);
    const feedInFromWithBat = Math.max(production - directWithBat, 0);

    const savingsSald = production * consumerPrice;
    const savingsNoBat = directNoBat * consumerPrice + feedInFromNoBat * feedInPrice;
    const savingsWithBat = directWithBat * consumerPrice + feedInFromWithBat * feedInPrice;

    const paybackSald = systemPrice / savingsSald;
    const paybackNoBat = systemPrice / savingsNoBat;
    const paybackWithBat = (systemPrice + batteryPrice) / savingsWithBat;

    const deltaNoBat = savingsNoBat - savingsSald;
    const deltaWithBat = savingsWithBat - savingsSald;

    return {
      production,
      savingsSald,
      savingsNoBat,
      savingsWithBat,
      paybackSald,
      paybackNoBat,
      paybackWithBat,
      deltaNoBat,
      deltaWithBat,
    };
  }, [
    consumption,
    systemSize,
    systemPrice,
    consumerPrice,
    feedInPrice,
    yieldPerKwp,
    batterySize,
    batteryPrice,
    scNoBat,
    scWithBat,
  ]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(10,36,24,.4)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    color: "var(--fg)",
    fontFamily: "'JetBrains Mono'",
    fontSize: 14,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "'JetBrains Mono'",
    fontSize: 11,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: "var(--muted-soft)",
    marginBottom: 8,
  };

  const numberField = (
    label: string,
    value: number,
    setter: (n: number) => void,
    step = 1,
  ) => (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setter(Number.isFinite(v) ? v : 0);
        }}
        style={inputStyle}
      />
    </label>
  );

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 18,
        background: "linear-gradient(180deg, var(--panel), var(--bg-2))",
        padding: 28,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 12,
              letterSpacing: ".14em",
              color: "var(--accent)",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            ◉ {labels.inputs}
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {numberField(labels.consumption, consumption, setConsumption, 100)}
            {numberField(labels.systemSize, systemSize, setSystemSize, 0.5)}
            {numberField(labels.systemPrice, systemPrice, setSystemPrice, 100)}
            {numberField(labels.consumerPrice, consumerPrice, setConsumerPrice, 0.01)}
            {numberField(labels.feedInPrice, feedInPrice, setFeedInPrice, 0.01)}
            {numberField(labels.yield, yieldPerKwp, setYieldPerKwp, 50)}
            <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={withBattery}
                onChange={(e) => setWithBattery(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
              />
              <span style={{ fontSize: 14 }}>{labels.addBattery}</span>
            </label>
            {withBattery && (
              <>
                {numberField(labels.batterySize, batterySize, setBatterySize, 1)}
                {numberField(labels.batteryPrice, batteryPrice, setBatteryPrice, 100)}
                {numberField(labels.selfConsumptionWithBat, scWithBat, setScWithBat, 0.05)}
              </>
            )}
            {!withBattery && numberField(labels.selfConsumptionNoBat, scNoBat, setScNoBat, 0.05)}
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 12,
              letterSpacing: ".14em",
              color: "var(--accent)",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            ◉ {labels.results}
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <ScenarioCard
              title={labels.scenarioSaldering}
              subtitle={labels.saldSub}
              annual={r.savingsSald}
              payback={r.paybackSald}
              delta={null}
              labels={labels}
              localeCode={localeCode}
              muted
            />
            <ScenarioCard
              title={labels.scenarioNoBat}
              subtitle={labels.noBatSub}
              annual={r.savingsNoBat}
              payback={r.paybackNoBat}
              delta={r.deltaNoBat}
              labels={labels}
              localeCode={localeCode}
            />
            {withBattery && (
              <ScenarioCard
                title={labels.scenarioWithBat}
                subtitle={labels.withBatSub}
                annual={r.savingsWithBat}
                payback={r.paybackWithBat}
                delta={r.deltaWithBat}
                labels={labels}
                localeCode={localeCode}
                highlight
              />
            )}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted-soft)", marginTop: 20 }}>
            {labels.productionLine.replace("{kwh}", Math.round(r.production).toLocaleString(localeCode))}
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginTop: 16 }}>{labels.smallprint}</p>
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({
  title,
  subtitle,
  annual,
  payback,
  delta,
  labels,
  localeCode,
  muted,
  highlight,
}: {
  title: string;
  subtitle: string;
  annual: number;
  payback: number;
  delta: number | null;
  labels: RoiLabels;
  localeCode: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        border: `1px solid ${highlight ? "var(--accent)" : "var(--line)"}`,
        borderRadius: 12,
        background: muted ? "rgba(10,36,24,.25)" : "rgba(10,36,24,.55)",
        opacity: muted ? 0.75 : 1,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--muted-soft)", marginBottom: 14 }}>{subtitle}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 4 }}>{labels.annualSavings}</div>
          <div style={{ fontFamily: "'Inter'", fontSize: 22, fontWeight: 400, letterSpacing: "-.02em" }}>{eur(annual, localeCode)}</div>
          {delta !== null && (
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: delta < 0 ? "#ff8b7a" : "var(--accent)", marginTop: 4 }}>
              {labels.deltaLabel.replace("{amount}", eur(delta, localeCode))}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 4 }}>{labels.payback}</div>
          <div style={{ fontFamily: "'Inter'", fontSize: 22, fontWeight: 400, letterSpacing: "-.02em" }}>
            {years(payback)} <span style={{ fontSize: 14, color: "var(--muted)" }}>{labels.years}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
