// app/components/HowItWorks.tsx
import React from "react";

type Props = {
  feedUsd: number;
  playUsd: number;
  healUsd: number;
  stepUsd?: number; // market-cap step that nudges mood (default: 5000)
};

const fmtUSD = (n: number, digits = 2) =>
  `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
    useGrouping: true,
  }).format(n)}`;

const fmtUSDint = (n: number) =>
  `$${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(n)}`;

export default function HowItWorks({
  feedUsd,
  playUsd,
  healUsd,
  stepUsd = 5000,
}: Props) {
  const item = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );

  return (
    <section
      style={{
        border: "1px solid #33365e",
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 14 }}>How it works</h2>

      <p style={{ fontSize: 12, lineHeight: 1.8, margin: 0 }}>
        <strong>Gotchi 402</strong> is a market-aware pet. Its mood and stats can
        change based on your actions and on-chain market moves fetched from
        DEXTools. Payments use the{" "}
        <strong>402 “pay-per-action”</strong> model: each button triggers a tiny
        one-off payment that is verified on our server before applying the
        action.
      </p>

  

      <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
        <div style={{ opacity: 0.9, fontWeight: 600 }}>Market reactions:</div>
        <p style={{ margin: 0 }}>
          We track token data (price, liquidity, market cap). Every{" "}
          <strong>{fmtUSDint(stepUsd)}</strong> step in <em>Market Cap</em>{" "}
          crossed up/down can nudge the pet to <em>happy</em> or{" "}
          <em>hungry</em>. Small swings may also adjust <em>joy</em>.
        </p>
      </div>

    
    </section>
  );
}
