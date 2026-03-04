import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { requireAuth } from "@/lib/auth-guard";

const createCustomerSchema = z.object({
  name: z.string().min(1, "Numele clientului este obligatoriu"),
});

export async function GET() {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const customers = await prisma.customer.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(customers);
  } catch (error) {
    console.error("List customers error:", error);
    return NextResponse.json({ error: "Eroare la incarcarea clientilor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const body = await request.json();
    const parsed = createCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.customer.findFirst({
      where: { name: { equals: parsed.data.name, mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const customer = await prisma.customer.create({
      data: { name: parsed.data.name.trim() },
      select: { id: true, name: true },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json({ error: "Eroare la crearea clientului" }, { status: 500 });
  }
}
