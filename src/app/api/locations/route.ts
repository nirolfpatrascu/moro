import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const locations = await prisma.location.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(locations);
  } catch (error) {
    logger.error("List locations error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Eroare la incarcarea locatiilor" }, { status: 500 });
  }
}
