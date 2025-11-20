/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { list, put, del } from "@vercel/blob";
import { Thing } from "@/lib/objax";

function buildKey(id: string) {
  return `objects/${id}.json`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "200", 10),
      1000
    );
    const cursor = searchParams.get("cursor") || undefined;
    const prefix = "objects/";

    const { blobs, cursor: nextCursor } = await list({ prefix, limit, cursor });

    // Fetch each object's JSON content (bounded by limit)
    const items = await Promise.all(
      blobs.map(async (b) => {
        try {
          const r = await fetch(b.url, { cache: "no-store" });
          const json = await r.json();
          return json;
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      things: items.filter(Boolean),
      cursor: nextCursor || null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ things: [], cursor: null }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // Accept partial upserts to reduce payload; server merges onto existing
    const upserts: Partial<Thing>[] = Array.isArray(body?.upserts)
      ? body.upserts
      : [];
    const deletes: string[] = Array.isArray(body?.deletes) ? body.deletes : [];

    // Write upserts
    await Promise.all(
      upserts.map(async (obj) => {
        const id = (obj as any)?.id;
        if (!id || typeof id !== "string") return;

        // Try to fetch existing JSON (if any)
        let existing: any = {};
        try {
          const { blobs } = await list({ prefix: buildKey(id), limit: 1 });
          if (blobs.length) {
            const r = await fetch(blobs[0].url, { cache: "no-store" });
            if (r.ok) existing = await r.json();
          }
        } catch {}

        const merged = { ...existing, ...obj, id };
        const data = JSON.stringify(merged);
        await put(buildKey(id), data, {
          access: "public",
          contentType: "application/json",
          addRandomSuffix: false,
        });
      })
    );

    await Promise.all(
      deletes.map(async (id) => {
        if (!id || typeof id !== "string") return;
        await del(buildKey(id));
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
