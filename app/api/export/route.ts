/* eslint-disable @typescript-eslint/no-explicit-any */
import { kv } from "@vercel/kv";

const OBJECTS_ZSET = "objects:z";
const objectKey = (id: string) => `objects:${id}`;

export async function GET() {
  try {
    const all: any[] = [];
    // Get all ids from the zset
    const ids = (await kv.zrange(OBJECTS_ZSET, 0, -1)) as string[];
    for (const id of ids) {
      try {
        const obj = await kv.get(objectKey(id));
        if (obj) all.push(obj);
      } catch {}
    }

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
