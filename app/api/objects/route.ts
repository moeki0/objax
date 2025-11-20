/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { Thing } from "@/lib/objax";

const OBJECTS_ZSET = "objects:z";
const objectKey = (id: string) => `objects:${id}`;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "200", 10),
      1000
    );
    const cursorStr = searchParams.get("cursor");
    const start = Math.max(0, parseInt(cursorStr || "0", 10) || 0);
    const end = start + limit - 1;
    const ids = (await kv.zrange(OBJECTS_ZSET, start, end)) as string[];
    const items = await Promise.all(
      ids.map(async (id) => {
        try {
          const obj = await kv.get(objectKey(id));
          return obj as any;
        } catch {
          return null;
        }
      })
    );
    const nextCursor = ids.length === limit ? String(start + limit) : null;
    return NextResponse.json({
      things: items.filter(Boolean),
      cursor: nextCursor,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ things: [], cursor: null }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const upserts: Partial<Thing>[] = Array.isArray(body?.upserts)
      ? body.upserts
      : [];
    const deletes: string[] = Array.isArray(body?.deletes) ? body.deletes : [];

    await Promise.all(
      upserts.map(async (obj) => {
        const id = (obj as any)?.id;
        if (!id || typeof id !== "string") return;
        const key = objectKey(id);
        await kv.set(key, obj);
        await kv.zadd(OBJECTS_ZSET, { score: Date.now(), member: id });
      })
    );

    await Promise.all(
      deletes.map(async (id) => {
        if (!id || typeof id !== "string") return;
        await kv.del(objectKey(id));
        await kv.zrem(OBJECTS_ZSET, id);
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to write objects" },
      { status: 500 }
    );
  }
}
