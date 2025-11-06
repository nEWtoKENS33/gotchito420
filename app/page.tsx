"use client";

import { useEffect, useMemo, useState } from "react";
import PetAvatar from "@/app/components/PetAvatar";
import HowItWorks from "./components/HowItWorks";

/* ---------- Tipos/Utils ---------- */

type Mood = "idle" | "happy" | "hungry" | "playing" | "healing";

const moodToValue = (mood?: string) => {
  switch (mood) {
    case "happy":   return 100;
    case "playing": return 85;
    case "healing": return 90;
    case "idle":    return 60;
    case "hungry":  return 25;
    default:        return 60;
  }
};

type Panel = {
  priceTokenUSD: number | null;
  priceETHUSD: number | null;
  priceTokenETH: number | null;
  marketCapUSD: number | null;
  liquidityUSD: number | null;
  emaUSD: number | null;
  stepIndex: number | null;
  stepSizeUSD: number | null;
};

type Pet = {
  health: number;
  hunger: number;
  joy: number;
  mood: Mood;
  lastUpdated: number;
};

type StateRes =
  | { ok: true; pet: Pet; panel: Panel }
  | { ok: false; error: string };

const fmt = (n: number | null | undefined, d = 2) =>
  typeof n === "number" && Number.isFinite(n) ? n.toFixed(d) : "—";

const prettyUsd = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "—";

function Bar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ width: "100%", height: 12, background: "#111", border: "1px solid #3b3b6b" }}>
      <div
        style={{
          width: `${v}%`,
          height: "100%",
          background: "#7c7ce6",
          transition: "width 400ms ease",
        }}
      />
    </div>
  );
}

/* ---------- Iconos SVG ---------- */

function IconX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M17.53 3H21l-8.19 9.36L22 21h-6.15l-4.8-5.58L5.6 21H2l8.78-10.02L2 3h6.26l4.45 5.16L17.53 3z"/>
    </svg>
  );
}

function IconFarcaster(props: React.SVGProps<SVGSVGElement>) {
  // arco minimalista
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4 20h4V9c0-2.2 1.8-4 4-4s4 1.8 4 4v11h4V8.5C20 4.9 17.1 2 13.5 2h-3C6.9 2 4 4.9 4 8.5V20z"/>
      <rect x="10" y="14" width="4" height="6" rx="1" />
    </svg>
  );
}

function IconClanker(props: React.SVGProps<SVGSVGElement>) {
  // barras dentro de un círculo
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.15"/>
      <rect x="6"  y="13" width="2.8" height="5"  rx="0.6" fill="currentColor"/>
      <rect x="10.6" y="11" width="2.8" height="7"  rx="0.6" fill="currentColor"/>
      <rect x="15.2" y="8"  width="2.8" height="10" rx="0.6" fill="currentColor"/>
    </svg>
  );
}

/* ---------- Página ---------- */

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await fetch("/api/pet/state", { cache: "no-store" });
      const j: StateRes = await r.json();
      if ("ok" in j && j.ok) {
        setPanel(j.panel);
        setPet(j.pet);
        setErr(null);
      } else {
        setErr((j as any)?.error || "state_error");
      }
    } catch (e: any) {
      setErr(e?.message || "network_error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    let t: any;
    const tick = async () => {
      await refresh();
      t = setTimeout(tick, 5000);
    };
    t = setTimeout(tick, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepLine = useMemo(() => {
    if (!panel) return "—";
    const step = panel.stepIndex ?? null;
    const size = panel.stepSizeUSD ?? null;
    if (step == null || size == null) return "—";
    return `${step} (each $${size.toLocaleString()})`;
  }, [panel]);

  async function doAction(action: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/pet/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j: StateRes = await r.json();
      if ("ok" in j && j.ok) {
        setPanel(j.panel);
        setPet(j.pet);
        setErr(null);
      } else {
        setErr((j as any)?.error || "action_error");
      }
    } catch (e: any) {
      setErr(e?.message || "network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0a0a0a",
        color: "#d9d9ff",
        padding: 24,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        display: "grid",
        gridTemplateRows: "1fr auto", // contenido + footer
        gap: 24,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: 16, marginBottom: 16 }}>Gotchi 420</h1>

        {/* GRID principal: barras a la izquierda, avatar a la derecha */}
        <section style={{ border: "1px solid #33365e", padding: 16, marginBottom: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: 24,
              alignItems: "center",
            }}
          >
            {/* Izquierda: barras */}
            <div>
              <div style={{ fontSize: 14, marginBottom: 8, color: "#cfd1ff" }}>Pet</div>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>Mood</span>
                    <span style={{ color: "#9fa8ff" }}>{pet?.mood ?? "—"}</span>
                  </div>
                  <Bar value={moodToValue(pet?.mood)} />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>Health</span>
                    <span>{pet ? `${pet.health}%` : "—"}</span>
                  </div>
                  <Bar value={pet?.health ?? 0} />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>Hunger</span>
                    <span>{pet ? `${pet.hunger}%` : "—"}</span>
                  </div>
                  <Bar value={pet?.hunger ?? 0} />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>Joy</span>
                    <span>{pet ? `${pet.joy}%` : "—"}</span>
                  </div>
                  <Bar value={pet?.joy ?? 0} />
                </div>
              </div>
            </div>

            {/* Derecha: avatar */}
            <div style={{ display: "grid", placeItems: "center" }}>
              <PetAvatar mood={(pet?.mood ?? "idle") as Mood} size={256} />
              <div style={{ fontSize: 12, color: "#9fa8ff", marginTop: 8 }}>
                mood: {pet?.mood ?? "idle"}
              </div>
            </div>
          </div>
        </section>

        {/* Token Panel */}
        <section style={{ border: "1px solid #33365e", padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Token Panel</div>
          {loading ? (
            <p>Loading…</p>
          ) : (
            <div style={{ fontSize: 12, lineHeight: "1.8" }}>
              <p>Price (USD): {fmt(panel?.priceTokenUSD, 8)}</p>
              <p>ETH (USD): {fmt(panel?.priceETHUSD, 2)}</p>
              <p>Token/ETH: {fmt(panel?.priceTokenETH, 8)}</p>
              <p>Market Cap (USD): {prettyUsd(panel?.marketCapUSD)}</p>
              <p>Liquidity (USD): {prettyUsd(panel?.liquidityUSD)}</p>
              <p>EMA (USD): {prettyUsd(panel?.emaUSD)}</p>
              <p>Step: {stepLine}</p>
            </div>
          )}
          {err && <p style={{ color: "#ffb2b2", marginTop: 8 }}>Error: {err}</p>}
        </section>

          <HowItWorks  feedUsd={0.05} playUsd={0.05} healUsd={0.07} stepUsd={5000} />
      </div>

      {/* Footer social */}
      <footer
        style={{
          borderTop: "1px solid #2b2b4c",
          paddingTop: 14,
          paddingBottom: 8,
          display: "flex",
          justifyContent: "center",
          gap: 18,
          color: "#b7b9ff",
        }}
      >
        <a href="https://x.com/Gotchix420" target="_blank" rel="noreferrer" title="Twitter / X"
           style={{ color: "#b7b9ff" }}>
          <IconX width={22} height={22} />
        </a>
        <a href="https://farcaster.xyz/Gotchix420" target="_blank" rel="noreferrer" title="Farcaster"
           style={{ color: "#b7b9ff" }}>
          <IconFarcaster width={22} height={22} />
        </a>
        <a href="https://clanker.world" target="_blank" rel="noreferrer" title="Clanker"
           style={{ color: "#b7b9ff" }}>
          <IconClanker width={22} height={22} />
        </a>
      </footer>
    </main>
  );
}
