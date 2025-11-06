// lib/config.ts
export const env = {
  DEXTOOLS_BASE_URL: (process.env.DEXTOOLS_BASE_URL || "").replace(/\/+$/,""),
  DEXTOOLS_API_KEY: process.env.DEXTOOLS_API_KEY || "",
  DEXTOOLS_CHAIN: process.env.DEXTOOLS_CHAIN || "base",
  DEXTOOLS_TOKEN: process.env.DEXTOOLS_TOKEN || "",
  DEXTOOLS_POOL: process.env.DEXTOOLS_POOL || "",

  STEP_USD: Number(process.env.STEP_USD || "5000"),
} as const;
