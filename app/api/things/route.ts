/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Thing } from "@/lib/objax/type";
import { db, migrationsReady, things as thingsTable } from "@/lib/db/client";
import { desc, inArray } from "drizzle-orm";
import { load } from "@/lib/objax/runtime/load";

export async function GET(req: Request) {
  try {
    await migrationsReady;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "200", 10),
      1000
    );
    const cursorStr = searchParams.get("cursor");
    const start = Math.max(0, parseInt(cursorStr || "0", 10) || 0);
    const rows = await db
      .select()
      .from(thingsTable)
      .orderBy(desc(thingsTable.updatedAt))
      .limit(limit + 1)
      .offset(start);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const things = items.map((row) => {
      return {
        id: row.id,
        code: row.code,
      } as Thing;
    });
    const nextCursor = hasMore ? String(start + limit) : null;
    return NextResponse.json({
      things,
      cursor: nextCursor,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ things: [], cursor: null }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    await migrationsReady;
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

    const upsertIds = upserts
      .map((o) => (typeof (o as any)?.id === "string" ? (o as any).id : null))
      .filter(Boolean) as string[];
    const existing = upsertIds.length
      ? await db
          .select()
          .from(thingsTable)
          .where(inArray(thingsTable.id, upsertIds))
      : [];
    const byId = new Map(existing.map((row) => [row.id, row]));

    const savedUpserts: Partial<Thing>[] = [];

    for (const obj of upserts) {
      const id = (obj as any)?.id;
      if (!id || typeof id !== "string") continue;
      const prev = byId.get(id);
      const prevCode = String(prev?.code ?? "");
      const nextCode = String((obj as any)?.code ?? "");
      const isCreate = !prev;
      const codeChanged = isCreate || prevCode !== nextCode;

      const fallbackUser = Array.isArray((obj as any)?.users)
        ? (obj as any).users[0]
        : null;
      const who = actor ?? fallbackUser ?? null;
      const existingUsers: any[] = Array.isArray(prev?.users)
        ? (prev as any).users
        : [];
      const incoming: any[] = Array.isArray((obj as any)?.users)
        ? (obj as any).users
        : [];
      const merged = codeChanged
        ? [...existingUsers, ...incoming, ...(who ? [who] : [])]
        : existingUsers.length
        ? existingUsers
        : incoming;
      const byEmail = new Map<string | null, any>();
      for (const u of merged) {
        const key = (u?.email as any) ?? null;
        if (!byEmail.has(key)) byEmail.set(key, u);
      }
      const users = Array.from(byEmail.values());

      try {
        if (codeChanged) {
          console.log("[objects] upsert(code)", {
            id,
            name: (obj as any)?.name ?? null,
            user: who,
            code: nextCode,
          });
        }
      } catch {}

      const now = new Date();
      await db
        .insert(thingsTable)
        .values({
          id,
          code: nextCode,
          users: users.length ? users : null,
          createdAt: prev?.createdAt ?? now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: thingsTable.id,
          set: {
            code: nextCode,
            users: users.length ? users : null,
            updatedAt: now,
          },
        });

      const loaded = load(nextCode);
      savedUpserts.push({
        id,
        code: nextCode,
        users,
        ...loaded,
      });
    }

    const deleteIds = deletes
      .map((o) => (typeof o?.id === "string" ? o.id : null))
      .filter(Boolean) as string[];
    if (deleteIds.length) {
      await db.delete(thingsTable).where(inArray(thingsTable.id, deleteIds));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    const msg = String(e || "");
    const status = 500;
    return NextResponse.json(
      { error: msg || "Failed to write objects" },
      { status }
    );
  }
}
