"use client";

import { useMemo, useState } from "react";

// Deal-cycle ROI — sector-agnostic. The operator question: "our sales
// cycle is N days. What's one working week worth if we compress it?"
// Works for real-estate deals, C&I solar quotes, SaaS enterprise,
// hospitality group bookings — anywhere the pipeline has a value and
// a cycle time.
//
// Math:
//   deals closed per year = (dealsPerRep * reps) [given]
//   velocity multiplier = baselineCycleDays / newCycleDays
//   new deals closed per year = closed * velocity multiplier
//   extra revenue = (new - baseline) * avgDealValue * winRate
//   extra gross margin = extra revenue * grossMarginPct
//   minus CRM investment → net year-one
//   payback months = crmInvestment / (extra gross margin / 12)

export type DealCycleLabels = {
  inputs: string;
  reps: string;
  dealsPerRep: string;
  avgDealValue: string;
  grossMarginPct: string;
  winRate: string;
  baselineCycleDays: string;
  newCycleDays: string;
  crmInvestment: string;
  results: string;
  baselineRevenue: string;
  newRevenue: string;
  extraRevenue: string;
  extraMargin: string;
  netYearOne: string;
  paybackMonths: string;
  months: string;
  velocityLine: string;
  smallprint: string;
};

type Props = { labels: DealCycleLabels };

function eur(n: number): string {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function months(n: number): string {
  if (!isFinite(n) || n <= 0) return "—";
  return n.toFixed(1);
}

export function DealCycleRoi({ labels }: Props) {
  const [reps, setReps] = useState(6);
  const [dealsPerRep, setDealsPerRep] = useState(40);
  const [avgDealValue, setAvgDealValue] = useState(18000);
  const [grossMarginPct, setGrossMarginPct] = useState(0.35);
  const [winRate, setWinRate] = useState(0.28);
  const [baselineCycleDays, setBaselineCycleDays] = useState(52);
  const [newCycleDays, setNewCycleDays] = useState(36);
  const [crmInvestment, setCrmInvestment] = useState(45000);

  const r = useMemo(() => {
    const baselineDeals = reps * dealsPerRep;
    const velocity = baselineCycleDays / Math.max(newCycleDays, 1);
    const newDeals = baselineDeals * velocity;
    const extraDeals = Math.max(newDeals - baselineDeals, 0);

    const baselineRevenue = baselineDeals * winRate * avgDealValue;
    const newRevenue = newDeals * winRate * avgDealValue;
    const extraRevenue = extraDeals * winRate * avgDealValue;
    const extraMargin = extraRevenue * grossMarginPct;
    const netYearOne = extraMargin - crmInvestment;
    const paybackMonths = crmInvestment / Math.max(extraMargin / 12, 1);

    return {
      baselineDeals,
      newDeals,
      velocity,
      baselineRevenue,
      newRevenue,
      extraRevenue,
      extraMargin,
      netYearOne,
      paybackMonths,
    };
  }, [reps, dealsPerRep, avgDealValue, grossMarginPct, winRate, baselineCycleDays, newCycleDays, crmInvestment]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(10,36,24,.4)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    color: "var(--fg)",
    fontFamily: "var(--font-mono)",
    fontSize: 14,
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--font-mono)",
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
              fontFamily: "var(--font-mono)",
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
            {numberField(labels.reps, reps, setReps, 1)}
            {numberField(labels.dealsPerRep, dealsPerRep, setDealsPerRep, 5)}
            {numberField(labels.avgDealValue, avgDealValue, setAvgDealValue, 1000)}
            {numberField(labels.grossMarginPct, grossMarginPct, setGrossMarginPct, 0.05)}
            {numberField(labels.winRate, winRate, setWinRate, 0.05)}
            {numberField(labels.baselineCycleDays, baselineCycleDays, setBaselineCycleDays, 1)}
            {numberField(labels.newCycleDays, newCycleDays, setNewCycleDays, 1)}
            {numberField(labels.crmInvestment, crmInvestment, setCrmInvestment, 5000)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
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
            <ResultCard title={labels.baselineRevenue} value={eur(r.baselineRevenue)} muted />
            <ResultCard title={labels.newRevenue} value={eur(r.newRevenue)} />
            <ResultCard title={labels.extraRevenue} value={eur(r.extraRevenue)} />
            <ResultCard title={labels.extraMargin} value={eur(r.extraMargin)} highlight />
            <ResultCard title={labels.netYearOne} value={eur(r.netYearOne)} />
            <ResultCard title={labels.paybackMonths} value={`${months(r.paybackMonths)} ${labels.months}`} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--muted-soft)",
              marginTop: 20,
            }}
          >
            {labels.velocityLine.replace("{mult}", r.velocity.toFixed(2))}
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginTop: 16 }}>{labels.smallprint}</p>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ title, value, highlight, muted }: { title: string; value: string; highlight?: boolean; muted?: boolean }) {
  return (
    <div
      style={{
        padding: "14px 18px",
        border: `1px solid ${highlight ? "var(--accent)" : "var(--line)"}`,
        borderRadius: 12,
        background: muted ? "rgba(10,36,24,.25)" : "rgba(10,36,24,.55)",
        opacity: muted ? 0.75 : 1,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--muted-soft)",
        }}
      >
        {title}
      </div>
      <div style={{ fontFamily: "var(--font-inter)", fontSize: 22, fontWeight: 400, letterSpacing: "-.02em" }}>{value}</div>
    </div>
  );
}
