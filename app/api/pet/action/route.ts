// app/api/pet/action/route.ts
import { NextRequest, NextResponse } from "next/server";
import { applyAction, getPetState } from "@/lib/pet/state";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    if (!["feed", "play", "heal"].includes(action)) {
      return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }

    applyAction(action);                 // muta el estado en memoria
    const data = await getPetState();    // tick + panel + mood
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "action_failed" }, { status: 500 });
  }
}
