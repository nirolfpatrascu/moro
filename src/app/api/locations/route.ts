import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(locations);
  } catch (error) {
    console.error("List locations error:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea locatiilor" },
      { status: 500 }
    );
  }
}
