import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDecimal } from "@/lib/prisma";
import { dailyIncomeCreateSchema } from "@/lib/validations/daily-income";
import { requireAuth } from "@/lib/auth-guard";

/**
 * GET /api/daily-income
 * List DailyIncome records with pagination, filtering, sorting.
 */
export async function GET(request: NextRequest) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const sortBy = searchParams.get("sortBy") || "date";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Record<string, unknown> = {};
    if (locationId) where.locationId = locationId;

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

    const orderBy =
      sortBy === "totalSales"
        ? { totalSales: sortDir as "asc" | "desc" }
        : { date: sortDir as "asc" | "desc" };

    const [records, total] = await Promise.all([
      prisma.dailyIncome.findMany({
        where,
        include: {
          location: { select: { id: true, code: true, name: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.dailyIncome.count({ where }),
    ]);

    // Summary for filtered set
    const summary = await prisma.dailyIncome.aggregate({
      where,
      _sum: { totalSales: true, salesExVat: true },
      _count: true,
    });

    return NextResponse.json(serializeDecimal({
      data: records,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        totalRevenue: summary._sum.totalSales || 0,
        totalRevenueExVat: summary._sum.salesExVat || 0,
        totalDays: summary._count,
      },
    }));
  } catch (error) {
    console.error("List daily income error:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea incasarilor zilnice" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/daily-income
 * Create a new DailyIncome record.
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const body = await request.json();
    const parsed = dailyIncomeCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: data.locationId },
    });
    if (!location) {
      return NextResponse.json(
        { error: "Locatie invalida" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(data.date);
    const dayNames = ["D", "L", "Ma", "Mi", "J", "V", "S"];

    const record = await prisma.dailyIncome.create({
      data: {
        locationId: data.locationId,
        date: parsedDate,
        dayOfWeek: dayNames[parsedDate.getDay()],
        month: parsedDate.getMonth() + 1,
        year: parsedDate.getFullYear(),
        week: Math.ceil(parsedDate.getDate() / 7),
        totalSales: data.totalSales,
        tva: data.tva,
        salesExVat: data.salesExVat,
        receiptCount: data.receiptCount,
        avgReceipt: data.avgReceipt,
        barSales: data.barSales,
        barProductCount: data.barProductCount,
        kitchenSales: data.kitchenSales,
        kitchenProductCount: data.kitchenProductCount,
        cashAmount: data.cashAmount,
        cardAmount: data.cardAmount,
        transferAmount: data.transferAmount,
        accountAmount: data.accountAmount,
        deliveryAmount: data.deliveryAmount,
        tipsFiscal: data.tipsFiscal,
        tipsTotal: data.tipsTotal,
      },
      include: {
        location: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(serializeDecimal(record), { status: 201 });
  } catch (error: unknown) {
    console.error("Create daily income error:", error);
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
      { error: "Eroare la crearea inregistrarii" },
      { status: 500 }
    );
  }
}
