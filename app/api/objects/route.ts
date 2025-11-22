/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { kv } from "@vercel/kv";
import { Thing } from "@/lib/objax/runtime/get-transition";

const worldZSet = (worldId: string) => `world:${worldId}:z`;
const objectKey = (worldId: string, id: string) =>
  `world:${worldId}:object:${id}`;
const DEFAULT_WORLD_ID = "default";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const worldId = searchParams.get("worldId") || DEFAULT_WORLD_ID;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "200", 10),
      1000
    );
    const cursorStr = searchParams.get("cursor");
    const start = Math.max(0, parseInt(cursorStr || "0", 10) || 0);
    const end = start + limit - 1;
    const ids = (await kv.zrange(worldZSet(worldId), start, end)) as string[];
    const items = await Promise.all(
      ids.map(async (id) => {
        try {
          const obj = await kv.get(objectKey(worldId, id));
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
    const { searchParams } = new URL(req.url);
    const worldId = searchParams.get("worldId") || DEFAULT_WORLD_ID;
    const session: { user: any } = (await getServerSession(
      authOptions as any
    ).catch(() => null)) as any;
    const actor = session?.user
      ? {
          name: (session.user as any)?.name ?? null,
          email: (session.user as any)?.email ?? null,
          id: (session.user as any)?.id ?? null,
        }
      : null;
    const body = await req.json().catch(() => ({}));
    const upserts: Partial<Thing>[] = Array.isArray(body?.upserts)
      ? body.upserts
      : [];
    const deletes: Partial<Thing>[] = Array.isArray(body?.deletes)
      ? body.deletes
      : [];

    await Promise.all(
      upserts.map(async (obj) => {
        const id = (obj as any)?.id;
        if (!id || typeof id !== "string") return;
        const key = objectKey(worldId, id);
        // Load previous to compare code
        let prev: any = null;
        try {
          prev = await kv.get(key);
        } catch {}
        const prevCode = String(prev?.code ?? "");
        const nextCode = String((obj as any)?.code ?? "");
        const isCreate = !prev;
        const codeChanged = isCreate || prevCode !== nextCode;

        // Build object to persist: always persist all fields, but update users only when code changed
        const toSave: any = { ...(prev || {}), ...(obj as any) };
        if (!codeChanged) {
          // Preserve previous users list when code didn't change
          toSave.users = prev?.users ?? toSave.users ?? [];
        } else {
          // Merge users only when code changes (include session actor if present)
          const fallbackUser = Array.isArray((obj as any)?.users)
            ? (obj as any).users[0]
            : null;
          const who = actor ?? fallbackUser ?? null;
          const existing: any[] = Array.isArray(prev?.users) ? prev.users : [];
          const incoming: any[] = Array.isArray((obj as any)?.users)
            ? (obj as any).users
            : [];
          const merged = [...existing, ...incoming, ...(who ? [who] : [])];
          const byEmail = new Map<string | null, any>();
          for (const u of merged) {
            const key = (u?.email as any) ?? null;
            if (!byEmail.has(key)) byEmail.set(key, u);
          }
          toSave.users = Array.from(byEmail.values());

          // Log only when code changed
          try {
            console.log("[objects] upsert(code)", {
              id,
              name: (obj as any)?.name ?? null,
              user: who,
              code: nextCode,
            });
          } catch {}
        }
        // Enforce per-world 1000 thing limit on create
        if (!prev) {
          const count = ((await kv.zcard(worldZSet(worldId))) as number) || 0;
          if (count >= 1000) {
            throw new Error("World limit reached (1000 things)");
          }
        }
        await kv.set(key, { ...toSave, worldId });
        await kv.zadd(worldZSet(worldId), { score: Date.now(), member: id });
      })
    );

    await Promise.all(
      deletes.map(async (object) => {
        const id = object.id!;
        await kv.del(objectKey(worldId, id));
        await kv.zrem(worldZSet(worldId), id);
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    const msg = String(e || "");
    const status = msg.includes("World limit") ? 400 : 500;
    return NextResponse.json(
      { error: msg || "Failed to write objects" },
      { status }
    );
  }
}
