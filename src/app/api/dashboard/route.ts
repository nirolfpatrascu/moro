import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/dashboard?type=summary|cashflow|by-location|by-category|aging|recent|alerts
 * &period=month|quarter|year|custom&from=...&to=...&locationId=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "summary";
    const period = searchParams.get("period") || "month";
    const locationId = searchParams.get("locationId") || undefined;

    const now = new Date();
    const { from, to } = getDateRange(period, now, searchParams);

    switch (type) {
      case "summary":
        return NextResponse.json(await getSummary(from, to, locationId));
      case "cashflow":
        return NextResponse.json(await getCashFlow(locationId));
      case "by-location":
        return NextResponse.json(await getByLocation(from, to));
      case "by-category":
        return NextResponse.json(await getByCategory(from, to, locationId));
      case "aging":
        return NextResponse.json(await getAging());
      case "recent":
        return NextResponse.json(await getRecent(locationId));
      case "alerts":
        return NextResponse.json(await getAlerts());
      case "top-suppliers":
        return NextResponse.json(await getTopSuppliers(from, to, locationId));
      default:
        return NextResponse.json({ error: "Tip necunoscut" }, { status: 400 });
    }
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea dashboard-ului" },
      { status: 500 }
    );
  }
}

function getDateRange(
  period: string,
  now: Date,
  params: URLSearchParams
): { from: Date; to: Date } {
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  let from: Date;

  switch (period) {
    case "quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), qMonth, 1);
      break;
    }
    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom": {
      const customFrom = params.get("from");
      const customTo = params.get("to");
      from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
      if (customTo) {
        const cTo = new Date(customTo);
        cTo.setHours(23, 59, 59, 999);
        return { from, to: cTo };
      }
      break;
    }
    default: // month
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { from, to };
}

// ── Summary KPIs ──────────────────────────────────────────
async function getSummary(from: Date, to: Date, locationId?: string) {
  const locFilter = locationId ? { locationId } : {};
  const dateFilter = { gte: from, lte: to };

  // Revenue from receipts (SALE type)
  const revenueAgg = await prisma.receipt.aggregate({
    where: { ...locFilter, date: dateFilter, type: "SALE" },
    _sum: { amount: true },
    _count: true,
  });

  // Expenses from incoming invoices
  const expensesAgg = await prisma.incomingInvoice.aggregate({
    where: {
      ...locFilter,
      issueDateParsed: dateFilter,
    },
    _sum: { totalAmount: true },
  });

  // Outstanding payables (unpaid incoming)
  const payablesAgg = await prisma.incomingInvoice.aggregate({
    where: { ...locFilter, status: { in: ["UNPAID", "PARTIAL"] } },
    _sum: { remainingAmount: true },
    _count: true,
  });

  // Outstanding receivables (unpaid outgoing)
  const receivablesAgg = await prisma.outgoingInvoice.aggregate({
    where: {
      ...(locationId ? { locationId } : {}),
      unpaidAmount: { gt: 0 },
    },
    _sum: { unpaidAmount: true },
    _count: true,
  });

  // Previous period for trend calculation
  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = new Date(from.getTime() - 1);

  const prevRevenueAgg = await prisma.receipt.aggregate({
    where: { ...locFilter, date: { gte: prevFrom, lte: prevTo }, type: "SALE" },
    _sum: { amount: true },
  });

  const revenue = revenueAgg._sum.amount || 0;
  const prevRevenue = prevRevenueAgg._sum.amount || 0;
  const expenses = expensesAgg._sum.totalAmount || 0;
  const revenueTrend = prevRevenue > 0
    ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100)
    : 0;

  return {
    revenue,
    revenueTrend,
    receiptCount: revenueAgg._count,
    expenses,
    netProfit: revenue - expenses,
    outstandingPayables: payablesAgg._sum.remainingAmount || 0,
    outstandingPayablesCount: payablesAgg._count,
    outstandingReceivables: receivablesAgg._sum.unpaidAmount || 0,
    outstandingReceivablesCount: receivablesAgg._count,
  };
}

// ── Cash Flow (last 12 months) ────────────────────────────
async function getCashFlow(locationId?: string) {
  const locFilter = locationId ? { locationId } : {};
  const months: { month: string; inflow: number; outflow: number }[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthLabel = d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });

    const [inflow, outflow] = await Promise.all([
      prisma.receipt.aggregate({
        where: { ...locFilter, date: { gte: d, lte: monthEnd }, type: "SALE" },
        _sum: { amount: true },
      }),
      prisma.incomingInvoice.aggregate({
        where: { ...locFilter, issueDateParsed: { gte: d, lte: monthEnd } },
        _sum: { totalAmount: true },
      }),
    ]);

    months.push({
      month: monthLabel,
      inflow: inflow._sum.amount || 0,
      outflow: outflow._sum.totalAmount || 0,
    });
  }

  return months;
}

// ── Revenue by Location ───────────────────────────────────
async function getByLocation(from: Date, to: Date) {
  const locations = await prisma.location.findMany({
    select: { id: true, code: true, name: true },
  });

  const result = await Promise.all(
    locations.map(async (loc) => {
      const [revenue, expenses] = await Promise.all([
        prisma.receipt.aggregate({
          where: { locationId: loc.id, date: { gte: from, lte: to }, type: "SALE" },
          _sum: { amount: true },
        }),
        prisma.incomingInvoice.aggregate({
          where: { locationId: loc.id, issueDateParsed: { gte: from, lte: to } },
          _sum: { totalAmount: true },
        }),
      ]);

      return {
        location: loc.code,
        locationName: loc.name,
        revenue: revenue._sum.amount || 0,
        expenses: expenses._sum.totalAmount || 0,
      };
    })
  );

  return result;
}

// ── Expenses by P&L Category ──────────────────────────────
async function getByCategory(from: Date, to: Date, locationId?: string) {
  const locFilter = locationId ? { locationId } : {};

  const invoices = await prisma.incomingInvoice.groupBy({
    by: ["plCategory"],
    where: {
      ...locFilter,
      issueDateParsed: { gte: from, lte: to },
    },
    _sum: { totalAmount: true },
    _count: true,
  });

  return invoices.map((g) => ({
    category: g.plCategory,
    amount: g._sum.totalAmount || 0,
    count: g._count,
  }));
}

// ── Aging Report ──────────────────────────────────────────
async function getAging() {
  const now = new Date();
  const buckets = [
    { label: "0-30 zile", min: 0, max: 30 },
    { label: "31-60 zile", min: 31, max: 60 },
    { label: "61-90 zile", min: 61, max: 90 },
    { label: "90+ zile", min: 91, max: 9999 },
  ];

  // Payables aging
  const unpaidInvoices = await prisma.incomingInvoice.findMany({
    where: { status: { in: ["UNPAID", "PARTIAL"] } },
    select: { dueDate: true, remainingAmount: true, issueDateParsed: true },
  });

  const payables = buckets.map((bucket) => {
    let total = 0;
    for (const inv of unpaidInvoices) {
      const refDate = inv.dueDate || inv.issueDateParsed || now;
      const daysPast = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPast >= bucket.min && daysPast <= bucket.max) {
        total += inv.remainingAmount;
      }
    }
    return { bucket: bucket.label, payables: total };
  });

  // Receivables aging
  const unpaidOutgoing = await prisma.outgoingInvoice.findMany({
    where: { unpaidAmount: { gt: 0 } },
    select: { dueDate: true, issueDate: true, unpaidAmount: true },
  });

  const receivables = buckets.map((bucket) => {
    let total = 0;
    for (const inv of unpaidOutgoing) {
      const refDate = inv.dueDate || inv.issueDate || now;
      const daysPast = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPast >= bucket.min && daysPast <= bucket.max) {
        total += inv.unpaidAmount;
      }
    }
    return { bucket: bucket.label, receivables: total };
  });

  return buckets.map((b, i) => ({
    bucket: b.label,
    payables: payables[i].payables,
    receivables: receivables[i].receivables,
  }));
}

// ── Recent Transactions ───────────────────────────────────
async function getRecent(locationId?: string) {
  const locFilter = locationId ? { locationId } : {};

  const [receipts, incomingInv, outgoingInv] = await Promise.all([
    prisma.receipt.findMany({
      where: locFilter,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { location: { select: { code: true } } },
    }),
    prisma.incomingInvoice.findMany({
      where: locFilter,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        location: { select: { code: true } },
        supplier: { select: { name: true } },
      },
    }),
    prisma.outgoingInvoice.findMany({
      where: locationId ? { locationId } : {},
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        location: { select: { code: true } },
        customer: { select: { name: true } },
      },
    }),
  ]);

  type TxItem = {
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
    location: string;
  };

  const items: TxItem[] = [
    ...receipts.map((r) => ({
      id: r.id,
      type: r.type === "SALE" ? "receipt" : r.type === "REFUND" ? "refund" : "expense",
      description: r.description || r.category || "Incasare",
      amount: r.amount,
      date: r.createdAt.toISOString(),
      location: r.location.code,
    })),
    ...incomingInv.map((i) => ({
      id: i.id,
      type: "payable",
      description: `Factura ${i.invoiceNumber} — ${i.supplier.name}`,
      amount: i.totalAmount,
      date: i.createdAt.toISOString(),
      location: i.location.code,
    })),
    ...outgoingInv.map((o) => ({
      id: o.id,
      type: "receivable",
      description: `Factura ${o.invoiceNumber} — ${o.customer.name}`,
      amount: o.totalAmount,
      date: o.createdAt.toISOString(),
      location: o.location?.code || "—",
    })),
  ];

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items.slice(0, 20);
}

// ── Alerts ────────────────────────────────────────────────
async function getAlerts() {
  const now = new Date();

  const overduePayables = await prisma.incomingInvoice.count({
    where: {
      status: { in: ["UNPAID", "PARTIAL"] },
      dueDate: { lt: now },
    },
  });

  const overdueReceivables = await prisma.outgoingInvoice.count({
    where: {
      unpaidAmount: { gt: 0 },
      dueDate: { lt: now },
    },
  });

  const highValueUnpaid = await prisma.incomingInvoice.findMany({
    where: { status: "UNPAID", totalAmount: { gte: 5000 } },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      dueDate: true,
      supplier: { select: { name: true } },
    },
    orderBy: { totalAmount: "desc" },
    take: 5,
  });

  return {
    overduePayables,
    overdueReceivables,
    totalOverdue: overduePayables + overdueReceivables,
    highValueUnpaid,
  };
}

// ── Top Suppliers ─────────────────────────────────────────
async function getTopSuppliers(from: Date, to: Date, locationId?: string) {
  const locFilter = locationId ? { locationId } : {};

  const grouped = await prisma.incomingInvoice.groupBy({
    by: ["supplierId"],
    where: {
      ...locFilter,
      issueDateParsed: { gte: from, lte: to },
    },
    _sum: { totalAmount: true },
    _count: true,
    orderBy: { _sum: { totalAmount: "desc" } },
    take: 8,
  });

  const supplierIds = grouped.map((g) => g.supplierId);
  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true },
  });
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

  return grouped.map((g) => ({
    supplier: supplierMap.get(g.supplierId) || "Necunoscut",
    amount: g._sum.totalAmount || 0,
    count: g._count,
  }));
}
