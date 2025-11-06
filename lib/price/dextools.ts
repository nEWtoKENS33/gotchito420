// lib/price/dextools.ts
import { env } from "@/lib/config";

/** Lo que consume el panel */
export type DexToolsPrice = {
  priceTokenUSD: number | null;   // $/TOKEN
  priceETHUSD: number | null;     // $/ETH
  priceTokenETH: number | null;   // ETH/TOKEN
  marketCapUSD: number | null;    // /token/.../info -> mcap
  liquidityUSD: number | null;    // /pool/.../liquidity -> liquidity
};

type Json = Record<string, any>;
const asNum = (v: any): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const pickNum = (...xs: any[]) => {
  for (const v of xs) {
    const n = asNum(v);
    if (n != null) return n;
  }
  return null;
};

async function hit(url: string): Promise<{ ok: boolean; json?: Json; status: number; text?: string; url: string; }> {
  const res = await fetch(url, {
    headers: { "X-API-KEY": env.DEXTOOLS_API_KEY, accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, text, url };
  }
  const json = (await res.json().catch(() => null)) as Json | null;
  if (!json) return { ok: false, status: res.status, text: "invalid_json", url };
  return { ok: true, json, status: res.status, url };
}

/** Liquidez del pool (USD) */
async function readPoolLiquidityUSD(base: string, chain: string, pool: string): Promise<number | null> {
  const u = `${base}/v2/pool/${encodeURIComponent(chain)}/${encodeURIComponent(pool)}/liquidity`;
  const r = await hit(u);
  if (!r.ok || !r.json) return null;
  const j = r.json as any;
  // variantes comunes
  return (
    asNum(j?.liquidity) ??
    asNum(j?.data?.liquidity) ??
    asNum(j?.liquidityUsd) ??
    asNum(j?.reserves?.usd) ??
    null
  );
}

/** Info del token para Market Cap (mcap) y otros */
async function readTokenInfo(base: string, chain: string, token: string): Promise<{ mcap: number | null }> {
  const u = `${base}/v2/token/${encodeURIComponent(chain)}/${encodeURIComponent(token)}/info`;
  const r = await hit(u);
  if (!r.ok || !r.json) return { mcap: null };
  const j = r.json as any;
  return {
    mcap: pickNum(j?.mcap, j?.data?.mcap, j?.token?.mcap),
  };
}

export async function fetchFromDexTools(): Promise<DexToolsPrice> {
  if (!env.DEXTOOLS_BASE_URL) throw new Error("DEXTOOLS_BASE_URL missing");
  if (!env.DEXTOOLS_API_KEY)  throw new Error("DEXTOOLS_API_KEY missing");

  const baseUrl = env.DEXTOOLS_BASE_URL.replace(/\/+$/,"");
  const chain   = (env.DEXTOOLS_CHAIN || "base").trim();
  const token   = (env.DEXTOOLS_TOKEN || "").trim(); // necesario para /token/.../info
  const pool    = (env.DEXTOOLS_POOL  || "").trim(); // recomendado para /price

  if (!token && !pool) throw new Error("Provide DEXTOOLS_TOKEN or DEXTOOLS_POOL in env");

  // ---- Precio (pool preferido; si no, token)
  const priceUrls: string[] = [];
  if (pool) {
    priceUrls.push(`${baseUrl}/v2/pool/${chain}/${pool}/price`);
    priceUrls.push(`${baseUrl}/v2/pair/${chain}/${pool}/price`); // algunas cuentas usan 'pair'
  }
  if (token) priceUrls.push(`${baseUrl}/v2/token/${chain}/${token}/price`);

  let payloadPrice: Json | null = null;
  for (const u of priceUrls) {
    const r = await hit(u);
    if (r.ok && r.json) { payloadPrice = r.json; break; }
  }

  const priceTokenUSD = payloadPrice
    ? pickNum(payloadPrice?.price, payloadPrice?.data?.price, payloadPrice?.pair?.priceUsd, payloadPrice?.token?.priceUsd)
    : null;

  const priceTokenETH = payloadPrice
    ? pickNum(payloadPrice?.priceChain, payloadPrice?.data?.priceChain, payloadPrice?.pair?.priceNative, payloadPrice?.token?.priceNative)
    : null;

  const priceETHUSD =
    priceTokenUSD != null && priceTokenETH != null && priceTokenETH > 0
      ? priceTokenUSD / priceTokenETH
      : null;

  // ---- Market Cap vía /token/.../info (requiere TOKEN)
  let marketCapUSD: number | null = null;
  if (token) {
    const info = await readTokenInfo(baseUrl, chain, token);
    marketCapUSD = info.mcap;
  }

  // ---- Liquidez vía /pool/.../liquidity (requiere POOL)
  let liquidityUSD: number | null = null;
  if (pool) {
    liquidityUSD = await readPoolLiquidityUSD(baseUrl, chain, pool);
  }

  return { priceTokenUSD, priceETHUSD, priceTokenETH, marketCapUSD, liquidityUSD };
}
