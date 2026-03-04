import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { requireAuth } from "@/lib/auth-guard";

const updateSupplierSchema = z.object({
  name: z.string().min(1, "Numele furnizorului este obligatoriu"),
});

type RouteParams = { params: Promise<{ id: string }> };

/** PUT /api/suppliers/[id] */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSupplierSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Furnizorul nu a fost gasit" },
        { status: 404 }
      );
    }

    // Check for duplicate name (case-insensitive, excludes self)
    const duplicate = await prisma.supplier.findFirst({
      where: {
        name: { equals: parsed.data.name, mode: "insensitive" },
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Exista deja un furnizor cu acest nume" },
        { status: 409 }
      );
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name: parsed.data.name.trim() },
      select: { id: true, name: true },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Update supplier error:", error);
    return NextResponse.json(
      { error: "Eroare la actualizarea furnizorului" },
      { status: 500 }
    );
  }
}

/** DELETE /api/suppliers/[id] */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { invoices: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Furnizorul nu a fost gasit" },
        { status: 404 }
      );
    }

    if (existing._count.invoices > 0) {
      return NextResponse.json(
        { error: `Furnizorul are ${existing._count.invoices} facturi asociate. Sterge mai intai facturile.` },
        { status: 409 }
      );
    }

    await prisma.supplier.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete supplier error:", error);
    return NextResponse.json(
      { error: "Eroare la stergerea furnizorului" },
      { status: 500 }
    );
  }
}
