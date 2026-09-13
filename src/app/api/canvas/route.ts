import { loadCanvas } from "@/lib/canvas/load";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await loadCanvas();
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load canvas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
