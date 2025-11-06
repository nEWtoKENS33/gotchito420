// app/api/pet/state/route.ts
import { NextResponse } from "next/server";
import { getPetState } from "@/lib/pet/state";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await getPetState();
    return NextResponse.json(res);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "state_error" }, { status: 500 });
  }
}
