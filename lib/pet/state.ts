// lib/pet/state.ts
import { env } from "@/lib/config";
import { fetchFromDexTools } from "@/lib/price/dextools";

const safeNum = (x: unknown) =>
  typeof x === "number" && Number.isFinite(x as number) ? (x as number) : null;

// --- In-memory EMA & pet ---
let emaUsdMem: number | null = null;
const EMA_ALPHA = 0.2;

type Mood = "idle" | "happy" | "hungry" | "playing" | "healing";

type Pet = {
  health: number;
  hunger: number;
  joy: number;
  mood: Mood;
  lastUpdated: number;
};

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

// Estado inicial
let petMem: Pet = {
  health: 100,
  hunger: 20, // arranca con algo de hambre para que se note el tick
  joy: 60,
  mood: "idle",
  lastUpdated: Date.now(),
};

let lastStepMem: number | null = null;
let lastMcapMem: number | null = null;

/* =========================
   Parámetros del “tick” de vida
   ========================= */
const HUNGER_RATE_PER_SEC = 0.02;      // +1% cada ~50s
const MARKET_STRESS_PER_SEC = 0.003;   // extra si price < EMA
const JOY_DECAY_PER_SEC = 0.003;       // -1% cada ~333s
const HEALTH_DECAY_HUNGER80 = 0.004;   // cae salud si hambre >= 80

// Acciones
const HUNGER_FEED_DELTA = 35;
const JOY_PLAY_DELTA = 18;
const HEALTH_HEAL_DELTA = 15;

/* =========================
   Helpers
   ========================= */
function updateEma(current: number | null): number | null {
  if (current == null) return emaUsdMem;
  emaUsdMem =
    emaUsdMem == null ? current : EMA_ALPHA * current + (1 - EMA_ALPHA) * emaUsdMem;
  return emaUsdMem;
}

function computeStepIndex(valUsd: number | null, stepUsd = env.STEP_USD): number | null {
  if (valUsd == null) return null;
  return Math.floor(valUsd / Math.max(1, stepUsd));
}

function computeMood(p: Pet, priceTokenUSD?: number | null, emaUSD?: number | null): Mood {
  if (p.hunger >= 60) return "hungry";
  if (p.health < 35) return "healing";
  if (p.joy >= 75) return "happy";
  if (
    priceTokenUSD != null &&
    emaUSD != null &&
    priceTokenUSD > emaUSD * 1.02 &&
    p.joy >= 60
  ) {
    return "playing";
  }
  return "idle";
}

function tickPet(
  p: Pet,
  priceTokenUSD?: number | null,
  emaUSD?: number | null
) {
  const now = Date.now();
  const dtSec = Math.max(0, (now - p.lastUpdated) / 1000);

  if (dtSec > 0) {
    // Hambre sube con el tiempo
    let hungerDelta = HUNGER_RATE_PER_SEC * dtSec;

    // Estrés de mercado si el precio está por debajo de la EMA
    if (
      priceTokenUSD != null &&
      emaUSD != null &&
      priceTokenUSD < emaUSD
    ) {
      hungerDelta += MARKET_STRESS_PER_SEC * dtSec;
    }

    p.hunger = clamp(p.hunger + hungerDelta);

    // Decaimiento suave de joy
    p.joy = clamp(p.joy - JOY_DECAY_PER_SEC * dtSec);

    // Salud cae muy leve si hambre muy alta
    if (p.hunger >= 80) p.health = clamp(p.health - HEALTH_DECAY_HUNGER80 * dtSec);

    p.lastUpdated = now;
  }

  // Recalcula mood con los datos actuales
  p.mood = computeMood(p, priceTokenUSD, emaUSD);
}

/* =========================
   Estado público
   ========================= */
export async function getPetState() {
  const market = await fetchFromDexTools();

  // Usa market cap directo si viene; si no, usa price como proxy
  const mcUSD = market.marketCapUSD ?? market.priceTokenUSD ?? null;

  // Calcula EMA de MC (o del proxy)
  const emaUSD = updateEma(mcUSD);
  const stepIndex = computeStepIndex(mcUSD, env.STEP_USD);

  // Tiquea al pet (hambre tiempo + estrés mercado + decaimientos)
  tickPet(petMem, market.priceTokenUSD, emaUSD);

  // Reacciones por STEP y % MC (pequeños “impulsos” de mood/joy)
  (() => {
    if (stepIndex != null) {
      if (lastStepMem != null && stepIndex > lastStepMem) {
        petMem.mood = "happy";
        petMem.joy = clamp(petMem.joy + 8);
      } else if (lastStepMem != null && stepIndex < lastStepMem) {
        petMem.mood = "hungry";
        petMem.joy = clamp(petMem.joy - 6);
      }
      lastStepMem = stepIndex;
    }

    if (mcUSD != null && lastMcapMem != null) {
      const pct = (mcUSD - lastMcapMem) / Math.max(1, lastMcapMem);
      if (pct >= 0.02) {
        petMem.mood = "happy";
        petMem.joy = clamp(petMem.joy + 3);
      } else if (pct <= -0.02) {
        petMem.mood = "hungry";
        petMem.joy = clamp(petMem.joy - 3);
      }
    }
    if (mcUSD != null) lastMcapMem = mcUSD;

    // Si quedó activo mucho tiempo, volver suavemente a idle
    const AGE_MS = Date.now() - petMem.lastUpdated;
    if (["happy", "hungry", "playing", "healing"].includes(petMem.mood) && AGE_MS > 60_000) {
      petMem.mood = "idle";
    }
  })();

  const panel = {
    priceTokenUSD: safeNum(market.priceTokenUSD),
    priceETHUSD: safeNum(market.priceETHUSD),
    priceTokenETH: safeNum(market.priceTokenETH),
    marketCapUSD: safeNum(market.marketCapUSD),
    liquidityUSD: safeNum(market.liquidityUSD),
    emaUSD: safeNum(emaUSD),
    stepIndex,
    stepSizeUSD: env.STEP_USD,
  };

  return { ok: true, pet: petMem, panel };
}

/* =========================
   Acciones
   ========================= */
export async function applyAction(action: string) {
  const now = Date.now();

  switch (action) {
    case "feed":
      petMem.hunger = clamp(petMem.hunger - HUNGER_FEED_DELTA);
      petMem.health = clamp(petMem.health + 5);
      petMem.joy = clamp(petMem.joy + 2);
      petMem.mood = "happy"; // corregido (antes ponía "hungry")
      break;

    case "play":
      petMem.joy = clamp(petMem.joy + JOY_PLAY_DELTA);
      petMem.health = clamp(petMem.health - 2);
      petMem.mood = "playing";
      break;

    case "heal":
      petMem.health = clamp(petMem.health + HEALTH_HEAL_DELTA);
      petMem.mood = "healing";
      break;

    case "pet":
      petMem.joy = clamp(petMem.joy + 5);
      petMem.mood = "happy";
      break;

    default:
      petMem.mood = "idle";
      break;
  }

  petMem.lastUpdated = now;
  return await getPetState();
}
