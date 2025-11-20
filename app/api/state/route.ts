import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const STATE_KEY = "state:global";

export async function GET() {
  try {
    const json = (await kv.get(STATE_KEY)) as unknown;
    return NextResponse.json({ things: Array.isArray(json) ? json : [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ things: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const things = body?.things;
    if (!Array.isArray(things)) {
      return NextResponse.json(
        { error: "Invalid payload: 'things' must be an array" },
        { status: 400 }
      );
    }
    await kv.set(STATE_KEY, things);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save state" }, { status: 500 });
  }
}
