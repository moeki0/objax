/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
    const deletes: string[] = Array.isArray(body?.deletes) ? body.deletes : [];

    await Promise.all(
      upserts.map(async (obj) => {
        const id = (obj as any)?.id;
        if (!id || typeof id !== "string") return;
        const key = objectKey(id);
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

        console.log(toSave.users)
        await kv.set(key, toSave);
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
