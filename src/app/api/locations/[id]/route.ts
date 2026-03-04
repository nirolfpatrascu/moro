import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { requireAuth } from "@/lib/auth-guard";

const updateLocationSchema = z.object({
  name: z.string().min(1, "Numele locatiei este obligatoriu").optional(),
  code: z.string().min(1, "Codul locatiei este obligatoriu").optional(),
  address: z.string().optional().nullable(),
});

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/locations/[id] — location with summary stats */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const location = await prisma.location.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, address: true },
    });

    if (!location) {
      return NextResponse.json({ error: "Locatia nu a fost gasita" }, { status: 404 });
    }

    // Get current month stats
    const now = new Date();
    const year = now.getFullYear();
    const monthStart = new Date(year, now.getMonth(), 1);
    const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);

    const [revenueAgg, expenseAgg] = await Promise.all([
      // Revenue from receipts (SALE type)
      prisma.receipt.aggregate({
        where: {
          locationId: id,
          type: "SALE",
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      // Expenses from incoming invoices
      prisma.incomingInvoice.aggregate({
        where: {
          locationId: id,
          year,
          month: now.toLocaleString("ro-RO", { month: "long" }).toUpperCase(),
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const revenue = Number(revenueAgg._sum.amount) || 0;
    const expenses = Number(expenseAgg._sum.totalAmount) || 0;

    return NextResponse.json({
      ...location,
      stats: {
        revenue,
        expenses,
        net: revenue - expenses,
      },
    });
  } catch (error) {
    console.error("Get location error:", error);
    return NextResponse.json({ error: "Eroare la incarcarea locatiei" }, { status: 500 });
  }
}

/** PUT /api/locations/[id] */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Locatia nu a fost gasita" }, { status: 404 });
    }

    // Check for duplicate name (case-insensitive, excludes self)
    if (parsed.data.name) {
      const duplicate = await prisma.location.findFirst({
        where: {
          name: { equals: parsed.data.name, mode: "insensitive" },
          NOT: { id },
        },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Exista deja o locatie cu acest nume" }, { status: 409 });
      }
    }

    // Check for duplicate code (case-insensitive, excludes self)
    if (parsed.data.code) {
      const duplicate = await prisma.location.findFirst({
        where: {
          code: { equals: parsed.data.code, mode: "insensitive" },
          NOT: { id },
        },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Exista deja o locatie cu acest cod" }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
    if (parsed.data.code !== undefined) updateData.code = parsed.data.code.trim();
    if (parsed.data.address !== undefined) updateData.address = parsed.data.address?.trim() || null;

    const location = await prisma.location.update({
      where: { id },
      data: updateData,
      select: { id: true, code: true, name: true, address: true },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("Update location error:", error);
    return NextResponse.json({ error: "Eroare la actualizarea locatiei" }, { status: 500 });
  }
}

/** DELETE /api/locations/[id] */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            dailyIncomes: true,
            incomingInvoices: true,
            receipts: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Locatia nu a fost gasita" }, { status: 404 });
    }

    const totalRelated =
      existing._count.dailyIncomes + existing._count.incomingInvoices + existing._count.receipts;

    if (totalRelated > 0) {
      return NextResponse.json(
        {
          error: `Locatia are date asociate (${existing._count.incomingInvoices} facturi, ${existing._count.receipts} incasari). Sterge mai intai datele.`,
        },
        { status: 409 },
      );
    }

    await prisma.location.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete location error:", error);
    return NextResponse.json({ error: "Eroare la stergerea locatiei" }, { status: 500 });
  }
}
