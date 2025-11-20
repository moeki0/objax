/* eslint-disable @typescript-eslint/no-explicit-any */
import { list } from "@vercel/blob";

export async function GET() {
  try {
    const all: any[] = [];
    let cursor: string | undefined = undefined;
    const prefix = "objects/";
    const limit = 1000;

    do {
      const res: any = await list({ prefix, limit, cursor });
      const blobs = res.blobs;
      const next = res.cursor;
      cursor = next || undefined;
      for (const b of blobs) {
        try {
          const r = await fetch(b.url, { cache: "no-store" });
          if (!r.ok) continue;
          const json = await r.json();
          all.push(json);
        } catch {}
      }
    } while (cursor);

    const body = JSON.stringify(all, null, 2);
    const filename = `objax-world-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to export" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
