// app/api/market/route.ts
import { NextResponse } from "next/server";
import { env } from "@/lib/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  const base = env.DEXTOOLS_BASE_URL.replace(/\/+$/,"");
  const chain = env.DEXTOOLS_CHAIN;
  const pool = (process.env.DEXTOOLS_POOL || "").trim();
  const token = (process.env.DEXTOOLS_TOKEN || "").trim();

  const urls: string[] = [];
  if (pool) {
    urls.push(`${base}/v2/pool/${chain}/${pool}/price`);
    urls.push(`${base}/v2/pair/${chain}/${pool}/price`);
  }
  if (token) urls.push(`${base}/v2/token/${chain}/${token}/price`);

  const out: any[] = [];
  for (const u of urls) {
    const r = await fetch(u, { headers: { "X-API-KEY": env.DEXTOOLS_API_KEY, accept: "application/json" }, cache: "no-store" });
    out.push({ url: u, status: r.status, body: await r.text() });
  }
  return NextResponse.json({ ok: true, tries: out });
}
