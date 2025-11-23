/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db, migrationsReady, things as thingsTable } from "@/lib/db/client";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    await migrationsReady;
    const session: { user?: any } | null = (await getServerSession(
      authOptions as any
    ).catch(() => null)) as any;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id ?? null;
    const userEmail = (session.user as any)?.email ?? null;
    if (!userId && !userEmail) {
      return NextResponse.json(
        { error: "Missing user identity" },
        { status: 400 }
      );
    }

    const rows = await db.select().from(thingsTable);
    let deleted = 0;
    let updated = 0;
    const now = new Date();

    for (const row of rows) {
      const users: any[] = Array.isArray((row as any).users)
        ? ((row as any).users as any[])
        : [];
      const filtered = users.filter((u) => {
        const matchId = userId && u?.id === userId;
        const matchEmail = userEmail && u?.email === userEmail;
        return !matchId && !matchEmail;
      });

      if (filtered.length === users.length) {
        continue; // no match, skip
      }

      if (filtered.length === 0) {
        await db.delete(thingsTable).where(eq(thingsTable.id, row.id));
        deleted += 1;
      } else {
        await db
          .update(thingsTable)
          .set({ users: filtered, updatedAt: now })
          .where(eq(thingsTable.id, row.id));
        updated += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      deleted,
      updated,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete account data" },
      { status: 500 }
    );
  }
}
