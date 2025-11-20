import { NextResponse } from "next/server";
import { list, put } from "@vercel/blob";

const STATE_KEY = "state/global.json";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: STATE_KEY, limit: 1 });
    if (!blobs.length) {
      return NextResponse.json({ things: [] }, { status: 200 });
    }
    const url = blobs[0].url;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ things: [] }, { status: 200 });
    }
    const json = await res.json().catch(() => []);
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
    const data = JSON.stringify(things);
    const result = await put(STATE_KEY, data, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    return NextResponse.json({ ok: true, url: result.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save state" }, { status: 500 });
  }
}

