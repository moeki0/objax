/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { kv } from "@vercel/kv";

const WORLDS_ZSET = "worlds:z";
const worldKey = (id: string) => `world:${id}`;
const worldZSet = (id: string) => `world:${id}:z`;
const worldUrlKey = (url: string) => `world:url:${url}`;

function slugify(input: string): string {
  try {
    return input
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-._~]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  } catch {
    return "";
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 1000);
    const cursorStr = searchParams.get("cursor");
    const start = Math.max(0, parseInt(cursorStr || "0", 10) || 0);
    const end = start + limit - 1;
    const ids = (await kv.zrange(WORLDS_ZSET, start, end)) as string[];
    const items = await Promise.all(
      ids.map(async (id) => {
        try {
          const obj = await kv.get(worldKey(id));
          return obj as any;
        } catch {
          return null;
        }
      })
    );
    const nextCursor = ids.length === limit ? String(start + limit) : null;
    return NextResponse.json({ worlds: items.filter(Boolean), cursor: nextCursor });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ worlds: [], cursor: null }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const session: { user: any } = (await getServerSession(authOptions as any).catch(() => null)) as any;
    const actor = session?.user
      ? {
          name: (session.user as any)?.name ?? null,
          email: (session.user as any)?.email ?? null,
          id: (session.user as any)?.id ?? null,
          image: (session.user as any)?.image ?? null,
        }
      : null;
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "World name required" }, { status: 400 });
    }
    const id = Math.random().toString(32).slice(2);
    // Generate a random, URL-safe slug and ensure uniqueness
    let url = "";
    for (let i = 0; i < 5; i++) {
      const candidate = Math.random().toString(36).slice(2, 10);
      const exists = await kv.get(worldUrlKey(candidate));
      if (!exists) {
        url = candidate;
        break;
      }
    }
    if (!url) {
      // Fallback with timestamp if we somehow had collisions
      url = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    }
    const payload = {
      id,
      name,
      createdAt: Date.now(),
      creator: actor,
      url,
    };
    await kv.set(worldKey(id), payload);
    await kv.zadd(WORLDS_ZSET, { score: Date.now(), member: id });
    await kv.set(worldUrlKey(url), id);
    return NextResponse.json({ ok: true, world: payload });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create world" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    let world: any = null;
    try {
      world = await kv.get(worldKey(id));
    } catch {}
    // delete all things in world
    try {
      const ids = (await kv.zrange(worldZSet(id), 0, -1)) as string[];
      for (const tid of ids) {
        await kv.del(`world:${id}:object:${tid}`);
      }
      await kv.del(worldZSet(id));
    } catch {}
    await kv.del(worldKey(id));
    await kv.zrem(WORLDS_ZSET, id);
    if (world?.url) {
      await kv.del(worldUrlKey(world.url));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete world" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "");
    const name = String(body?.name || "").trim();
    if (!id || !name) {
      return NextResponse.json({ error: "id and name are required" }, { status: 400 });
    }
    const key = worldKey(id);
    const world = (await kv.get(key)) as any;
    if (!world) return NextResponse.json({ error: "world not found" }, { status: 404 });
    const next = { ...world, name };
    await kv.set(key, next);
    return NextResponse.json({ ok: true, world: next });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update world" }, { status: 500 });
  }
}
