/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const worldKey = (id: string) => `world:${id}`;
const worldUrlKey = (url: string) => `world:url:${url}`;

export async function GET(
  _req: Request,
  context: { params: Promise<{ url: string }> | { url: string } }
) {
  try {
    const params = (typeof (context as any).params?.then === "function")
      ? await (context as any).params
      : (context as any).params;
    const url = params?.url as string | undefined;
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
    const worldId = (await kv.get(worldUrlKey(url))) as string | null;
    if (!worldId) return NextResponse.json({ world: null }, { status: 200 });
    const world = await kv.get(worldKey(worldId));
    return NextResponse.json({ world });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to get world" }, { status: 500 });
  }
}
