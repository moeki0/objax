/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getAblyRest } from "@/lib/ably/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rest = getAblyRest();
    const tokenRequest = await rest.auth.createTokenRequest({
      // Allow publish/subscribe on all world-scoped channels: things:<worldId>
      capability: { "things:*": ["publish", "subscribe"] },
      ttl: 60 * 60 * 1000, // 1 hour
    } as any);
    return NextResponse.json(tokenRequest);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
