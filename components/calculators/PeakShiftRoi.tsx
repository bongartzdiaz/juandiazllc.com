"use client";

import { useMemo, useState } from "react";

// Peak-demand-charge arbitrage for C&I sites with solar + battery.
// The operator question: we pay a demand charge (€/kW) on our highest
// 15-min peak each month. How much battery capacity do we need, and
// how much € does that battery shave per year?
//
// Math (intentionally plain):
//   peak reduction kW = min(batteryKw, currentPeakKw * reductionPct)
//   annual demand-charge savings = peak_reduction_kW * demandCharge * 12
//   energy-arbitrage savings = cyclesPerYear * batteryKwh *
//       (peakEnergyPrice - offPeakEnergyPrice) * roundTripEff
//   total = demand + arbitrage
//   payback = batteryCapex / total
//
// Defaults reflect a mid-size NL C&I site on a grootverbruik tariff.

export type PeakShiftLabels = {
  inputs: string;
  peakKw: string;
  reductionPct: string;
  demandCharge: string;
  batteryKw: string;
  batteryKwh: string;
  batteryPrice: string;
  cyclesPerYear: string;
  peakPrice: string;
  offPeakPrice: string;
  roundTrip: string;
  results: string;
  demandSavings: string;
  arbitrageSavings: string;
  totalAnnual: string;
  payback: string;
  years: string;
  smallprint: string;
  assumptionsLine: string;
};

type Props = { labels: PeakShiftLabels };

function eur(n: number): string {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function years(n: number): string {
  if (!isFinite(n) || n <= 0) return "—";
  return n.toFixed(1);
}

export function PeakShiftRoi({ labels }: Props) {
  const [peakKw, setPeakKw] = useState(300);
  const [reductionPct, setReductionPct] = useState(0.35);
  const [demandCharge, setDemandCharge] = useState(5.5);
  const [batteryKw, setBatteryKw] = useState(120);
  const [batteryKwh, setBatteryKwh] = useState(240);
  const [batteryPrice, setBatteryPrice] = useState(120000);
  const [cyclesPerYear, setCyclesPerYear] = useState(300);
  const [peakPrice, setPeakPrice] = useState(0.28);
  const [offPeakPrice, setOffPeakPrice] = useState(0.09);
  const [roundTrip, setRoundTrip] = useState(0.9);

  const r = useMemo(() => {
    const peakReduction = Math.min(batteryKw, peakKw * reductionPct);
    const demandSavings = peakReduction * demandCharge * 12;
    const arbitrageSavings =
      cyclesPerYear * batteryKwh * Math.max(peakPrice - offPeakPrice, 0) * roundTrip;
    const total = demandSavings + arbitrageSavings;
    const payback = batteryPrice / total;
    return { peakReduction, demandSavings, arbitrageSavings, total, payback };
  }, [peakKw, reductionPct, demandCharge, batteryKw, batteryKwh, batteryPrice, cyclesPerYear, peakPrice, offPeakPrice, roundTrip]);

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
  const numberField = (label: string, value: number, setter: (n: number) => void, step = 1) => (
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
            {numberField(labels.peakKw, peakKw, setPeakKw, 10)}
            {numberField(labels.reductionPct, reductionPct, setReductionPct, 0.05)}
            {numberField(labels.demandCharge, demandCharge, setDemandCharge, 0.5)}
            {numberField(labels.batteryKw, batteryKw, setBatteryKw, 10)}
            {numberField(labels.batteryKwh, batteryKwh, setBatteryKwh, 10)}
            {numberField(labels.batteryPrice, batteryPrice, setBatteryPrice, 1000)}
            {numberField(labels.cyclesPerYear, cyclesPerYear, setCyclesPerYear, 10)}
            {numberField(labels.peakPrice, peakPrice, setPeakPrice, 0.01)}
            {numberField(labels.offPeakPrice, offPeakPrice, setOffPeakPrice, 0.01)}
            {numberField(labels.roundTrip, roundTrip, setRoundTrip, 0.01)}
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
            <ResultCard title={labels.demandSavings} value={eur(r.demandSavings)} />
            <ResultCard title={labels.arbitrageSavings} value={eur(r.arbitrageSavings)} />
            <ResultCard title={labels.totalAnnual} value={eur(r.total)} highlight />
            <ResultCard title={labels.payback} value={`${years(r.payback)} ${labels.years}`} />
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 11,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--muted-soft)",
              marginTop: 20,
            }}
          >
            {labels.assumptionsLine.replace("{kw}", r.peakReduction.toFixed(0))}
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginTop: 16 }}>{labels.smallprint}</p>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ title, value, highlight }: { title: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: "14px 18px",
        border: `1px solid ${highlight ? "var(--accent)" : "var(--line)"}`,
        borderRadius: 12,
        background: "rgba(10,36,24,.55)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono'",
          fontSize: 11,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--muted-soft)",
        }}
      >
        {title}
      </div>
      <div style={{ fontFamily: "'Inter'", fontSize: 22, fontWeight: 400, letterSpacing: "-.02em" }}>{value}</div>
    </div>
  );
}
