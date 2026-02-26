import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const createSupplierSchema = z.object({
  name: z.string().min(1, "Numele furnizorului este obligatoriu"),
});

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSupplierSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Check for existing supplier with same name (case-insensitive)
    const existing = await prisma.supplier.findFirst({
      where: { name: { equals: parsed.data.name, mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const supplier = await prisma.supplier.create({
      data: { name: parsed.data.name.trim() },
      select: { id: true, name: true },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Create supplier error:", error);
    return NextResponse.json(
      { error: "Eroare la crearea furnizorului" },
      { status: 500 }
    );
  }
}
