import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { requireAuth } from "@/lib/auth-guard";

const updateCustomerSchema = z.object({
  name: z.string().min(1, "Numele clientului este obligatoriu"),
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PUT /api/customers/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Clientul nu a fost gasit" }, { status: 404 });
    }

    // Check for duplicate name
    const duplicate = await prisma.customer.findFirst({
      where: {
        name: { equals: parsed.data.name, mode: "insensitive" },
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json({ error: "Exista deja un client cu acest nume" }, { status: 409 });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { name: parsed.data.name.trim() },
      select: { id: true, name: true },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json({ error: "Eroare la actualizarea clientului" }, { status: 500 });
  }
}

/**
 * DELETE /api/customers/[id]
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { invoices: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Clientul nu a fost gasit" }, { status: 404 });
    }

    if (existing._count.invoices > 0) {
      return NextResponse.json(
        {
          error: `Clientul are ${existing._count.invoices} facturi asociate. Sterge mai intai facturile.`,
        },
        { status: 409 },
      );
    }

    await prisma.customer.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json({ error: "Eroare la stergerea clientului" }, { status: 500 });
  }
}
