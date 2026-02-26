import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { receiptUpdateSchema } from "@/lib/validations/receipt";
import { parseDateFlexible } from "@/lib/excel";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/receipts/[id]
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        location: { select: { id: true, code: true, name: true } },
      },
    });

    if (!receipt) {
      return NextResponse.json(
        { error: "Incasarea nu a fost gasita" },
        { status: 404 }
      );
    }

    return NextResponse.json(receipt);
  } catch (error) {
    console.error("Get receipt error:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea incasarii" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/receipts/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = receiptUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.receipt.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Incasarea nu a fost gasita" },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.category !== undefined) updateData.category = data.category || null;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.receiptNumber !== undefined) updateData.receiptNumber = data.receiptNumber || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.date !== undefined) {
      const parsedDate = parseDateFlexible(data.date);
      if (parsedDate) updateData.date = parsedDate;
    }

    const receipt = await prisma.receipt.update({
      where: { id },
      data: updateData,
      include: {
        location: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(receipt);
  } catch (error) {
    console.error("Update receipt error:", error);
    return NextResponse.json(
      { error: "Eroare la actualizarea incasarii" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/receipts/[id]
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existing = await prisma.receipt.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Incasarea nu a fost gasita" },
        { status: 404 }
      );
    }

    await prisma.receipt.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete receipt error:", error);
    return NextResponse.json(
      { error: "Eroare la stergerea incasarii" },
      { status: 500 }
    );
  }
}
