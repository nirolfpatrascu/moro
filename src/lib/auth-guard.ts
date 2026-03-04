import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Check auth session. Returns null if authenticated, or a 401 Response if not.
 * Usage: const denied = await requireAuth(); if (denied) return denied;
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }
  return null;
}
