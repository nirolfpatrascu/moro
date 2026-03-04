import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDecimal } from "@/lib/prisma";
import { receiptCreateSchema } from "@/lib/validations/receipt";
import { parseDateFlexible } from "@/lib/excel";
import { requireAuth } from "@/lib/auth-guard";

/**
 * GET /api/receipts
 * List receipts with filters: date range, location, type, payment method.
 */
export async function GET(request: NextRequest) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const type = searchParams.get("type");
    const paymentMethod = searchParams.get("paymentMethod");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const sortBy = searchParams.get("sortBy") || "date";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Record<string, unknown> = {};
    if (locationId) where.locationId = locationId;
    if (type) where.type = type;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        dateFilter.lte = to;
      }
      where.date = dateFilter;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { receiptNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        include: {
          location: { select: { id: true, code: true, name: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.receipt.count({ where }),
    ]);

    // Compute daily totals for the current page results
    const dailyTotals: Record<string, { sales: number; refunds: number; expenses: number; net: number }> = {};
    for (const r of receipts) {
      const dateKey = r.date.toISOString().split("T")[0];
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { sales: 0, refunds: 0, expenses: 0, net: 0 };
      }
      const amt = Number(r.amount);
      if (r.type === "SALE") {
        dailyTotals[dateKey].sales += amt;
        dailyTotals[dateKey].net += amt;
      } else if (r.type === "REFUND") {
        dailyTotals[dateKey].refunds += amt;
        dailyTotals[dateKey].net -= amt;
      } else {
        dailyTotals[dateKey].expenses += amt;
        dailyTotals[dateKey].net -= amt;
      }
    }

    return NextResponse.json(serializeDecimal({
      data: receipts,
      dailyTotals,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }));
  } catch (error) {
    console.error("List receipts error:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea incasarilor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/receipts
 * Create a new receipt. Supports both full and quick create.
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const body = await request.json();
    const parsed = receiptCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const parsedDate = parseDateFlexible(data.date) || new Date();

    const receipt = await prisma.receipt.create({
      data: {
        locationId: data.locationId,
        date: parsedDate,
        type: data.type || "SALE",
        description: data.description || null,
        category: data.category || null,
        amount: data.amount,
        paymentMethod: data.paymentMethod || "CASH",
        receiptNumber: data.receiptNumber || null,
        notes: data.notes || null,
      },
      include: {
        location: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(serializeDecimal(receipt), { status: 201 });
  } catch (error) {
    console.error("Create receipt error:", error);
    return NextResponse.json(
      { error: "Eroare la crearea incasarii" },
      { status: 500 }
    );
  }
}
