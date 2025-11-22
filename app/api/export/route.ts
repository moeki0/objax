/* eslint-disable @typescript-eslint/no-explicit-any */
import { db, migrationsReady, things as thingsTable } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { load } from "@/lib/objax/runtime/load";

export async function GET() {
  try {
    await migrationsReady;
    const rows = await db
      .select()
      .from(thingsTable)
      .orderBy(desc(thingsTable.updatedAt));
    const all = rows.map((row) => ({
      id: row.id,
      code: row.code,
      users: row.users ?? [],
      ...load(row.code),
    }));

    const body = JSON.stringify(all, null, 2);
    const filename = `objax.json`;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to export" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
