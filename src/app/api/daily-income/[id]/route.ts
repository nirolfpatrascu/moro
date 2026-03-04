import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDecimal } from "@/lib/prisma";
import { dailyIncomeUpdateSchema } from "@/lib/validations/daily-income";
import { requireAuth } from "@/lib/auth-guard";

/**
 * GET /api/daily-income/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const record = await prisma.dailyIncome.findUnique({
      where: { id },
      include: {
        location: { select: { id: true, code: true, name: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Inregistrare negasita" }, { status: 404 });
    }

    return NextResponse.json(serializeDecimal(record));
  } catch (error) {
    console.error("Get daily income error:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea inregistrarii" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/daily-income/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const parsed = dailyIncomeUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.dailyIncome.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Inregistrare negasita" }, { status: 404 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};
    const numericFields = [
      "totalSales", "tva", "salesExVat", "receiptCount", "avgReceipt",
      "barSales", "barProductCount", "kitchenSales", "kitchenProductCount",
      "cashAmount", "cardAmount", "transferAmount", "accountAmount",
      "deliveryAmount", "tipsFiscal", "tipsTotal",
    ] as const;

    for (const field of numericFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (data.locationId) updateData.locationId = data.locationId;

    if (data.date) {
      const parsedDate = new Date(data.date);
      const dayNames = ["D", "L", "Ma", "Mi", "J", "V", "S"];
      updateData.date = parsedDate;
      updateData.dayOfWeek = dayNames[parsedDate.getDay()];
      updateData.month = parsedDate.getMonth() + 1;
      updateData.year = parsedDate.getFullYear();
      updateData.week = Math.ceil(parsedDate.getDate() / 7);
    }

    const record = await prisma.dailyIncome.update({
      where: { id },
      data: updateData,
      include: {
        location: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(serializeDecimal(record));
  } catch (error: unknown) {
    console.error("Update daily income error:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Exista deja o inregistrare pentru aceasta data si locatie" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Eroare la actualizarea inregistrarii" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/daily-income/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;

    const existing = await prisma.dailyIncome.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Inregistrare negasita" }, { status: 404 });
    }

    await prisma.dailyIncome.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete daily income error:", error);
    return NextResponse.json(
      { error: "Eroare la stergerea inregistrarii" },
      { status: 500 }
    );
  }
}
