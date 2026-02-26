import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("List suppliers error:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea furnizorilor" },
      { status: 500 }
    );
  }
}
