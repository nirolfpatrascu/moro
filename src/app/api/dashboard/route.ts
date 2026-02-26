import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MONTHS_RO } from "@/lib/utils";

// ── Category constants for P&L breakdown ──────────────────
const COGS_CATS = ["BAR", "BUCATARIE", "CONSUMABILE", "TRANSPORT", "LIVRARE", "DIVERSE"];
const PEOPLE_CATS = ["SALARII", "COLABORATORI", "TAXE SALARIU", "TICHETE MASA", "BONUSURI", "UNIFORME", "TRAINING"];
const OPEX_CATS = ["LICENTE", "CONSULTING", "CONTABILITATE", "AUTORIZATII", "MARKETING", "DIVERSE", "INVENTAR OBIECTE"];
const COSTFIX_CATS = ["CHIRII", "UTILITATI", "BANCA", "DIVERSE"];
const TAXE_CATS = ["IMPOZIT VENIT", "TVA", "ALTE TAXE"];

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
      case "pnl": {
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
        return NextResponse.json(await getPnl(year, locationId));
      }
      case "cashflow-detail": {
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
        return NextResponse.json(await getCashFlowDetail(year, locationId));
      }
      case "cogs-detail": {
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
        return NextResponse.json(await getCogsDetail(year, locationId));
      }
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

  // Revenue from DailyIncome
  const revenueAgg = await prisma.dailyIncome.aggregate({
    where: { ...locFilter, date: dateFilter },
    _sum: { totalSales: true, receiptCount: true },
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

  const prevRevenueAgg = await prisma.dailyIncome.aggregate({
    where: { ...locFilter, date: { gte: prevFrom, lte: prevTo } },
    _sum: { totalSales: true },
  });

  const revenue = revenueAgg._sum.totalSales || 0;
  const prevRevenue = prevRevenueAgg._sum.totalSales || 0;
  const expenses = expensesAgg._sum.totalAmount || 0;
  const revenueTrend = prevRevenue > 0
    ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100)
    : 0;

  return {
    revenue,
    revenueTrend,
    receiptCount: revenueAgg._sum.receiptCount || 0,
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
      prisma.dailyIncome.aggregate({
        where: { ...locFilter, date: { gte: d, lte: monthEnd } },
        _sum: { totalSales: true },
      }),
      prisma.incomingInvoice.aggregate({
        where: { ...locFilter, issueDateParsed: { gte: d, lte: monthEnd } },
        _sum: { totalAmount: true },
      }),
    ]);

    months.push({
      month: monthLabel,
      inflow: inflow._sum.totalSales || 0,
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
        prisma.dailyIncome.aggregate({
          where: { locationId: loc.id, date: { gte: from, lte: to } },
          _sum: { totalSales: true },
        }),
        prisma.incomingInvoice.aggregate({
          where: { locationId: loc.id, issueDateParsed: { gte: from, lte: to } },
          _sum: { totalAmount: true },
        }),
      ]);

      return {
        location: loc.code,
        locationName: loc.name,
        revenue: revenue._sum.totalSales || 0,
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

  const [dailyIncomes, incomingInv, outgoingInv] = await Promise.all([
    prisma.dailyIncome.findMany({
      where: locFilter,
      orderBy: { date: "desc" },
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
    ...dailyIncomes.map((d) => ({
      id: d.id,
      type: "receipt" as const,
      description: `Incasari ${new Date(d.date).toLocaleDateString("ro-RO")}`,
      amount: d.totalSales,
      date: d.date.toISOString(),
      location: d.location.code,
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

// ── Helper: zero-filled 12-element array ─────────────────
function zeros(): number[] {
  return new Array(12).fill(0);
}

function monthIndex(monthStr: string): number {
  const idx = MONTHS_RO.indexOf(monthStr.toUpperCase() as typeof MONTHS_RO[number]);
  return idx >= 0 ? idx : -1;
}

// ── P&L Detail ───────────────────────────────────────────
async function getPnl(year: number, locationId?: string) {
  const locFilter = locationId ? { locationId } : {};

  // Revenue from DailyIncome grouped by month
  const dailyIncomes = await prisma.dailyIncome.findMany({
    where: { ...locFilter, year },
    select: { month: true, totalSales: true },
  });

  const income = zeros();
  for (const d of dailyIncomes) {
    if (d.month >= 1 && d.month <= 12) {
      income[d.month - 1] += d.totalSales;
    }
  }

  // Incoming invoices for the year grouped by plCategory + category + month
  const invoices = await prisma.incomingInvoice.findMany({
    where: { ...locFilter, year },
    select: { month: true, plCategory: true, category: true, totalAmount: true },
  });

  // Build category breakdowns
  type CatMap = Record<string, number[]>;
  const buildCatMap = (plCat: string, cats: string[]): CatMap => {
    const map: CatMap = {};
    for (const c of cats) map[c] = zeros();
    map.total = zeros();
    for (const inv of invoices) {
      if (inv.plCategory !== plCat) continue;
      const m = monthIndex(inv.month);
      if (m < 0) continue;
      const cat = inv.category.toUpperCase();
      if (!map[cat]) map[cat] = zeros();
      map[cat][m] += inv.totalAmount;
      map.total[m] += inv.totalAmount;
    }
    return map;
  };

  const cogs = buildCatMap("COGS", COGS_CATS);
  const people = buildCatMap("PEOPLE", PEOPLE_CATS);
  const opex = buildCatMap("OPEX", OPEX_CATS);
  const costfix = buildCatMap("COSTFIX", COSTFIX_CATS);
  const taxe = buildCatMap("TAXE", TAXE_CATS);

  // Computed metrics
  const grossProfit = income.map((v, i) => v - cogs.total[i]);
  const operatingProfit = grossProfit.map((v, i) => v - people.total[i] - opex.total[i] - costfix.total[i]);
  const netProfit = operatingProfit.map((v, i) => v - taxe.total[i]);
  const grossMargin = income.map((v, i) => (v > 0 ? ((grossProfit[i] / v) * 100) : 0));
  const operatingMargin = income.map((v, i) => (v > 0 ? ((operatingProfit[i] / v) * 100) : 0));
  const netMargin = income.map((v, i) => (v > 0 ? ((netProfit[i] / v) * 100) : 0));

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const totalIncome = sum(income);
  const totalExpenses = sum(cogs.total) + sum(people.total) + sum(opex.total) + sum(costfix.total) + sum(taxe.total);

  return {
    income,
    cogs,
    people,
    opex,
    costfix,
    taxe,
    grossProfit,
    operatingProfit,
    netProfit,
    grossMargin,
    operatingMargin,
    netMargin,
    totals: {
      income: totalIncome,
      expenses: totalExpenses,
      netProfit: sum(netProfit),
      netMargin: totalIncome > 0 ? (sum(netProfit) / totalIncome) * 100 : 0,
    },
  };
}

// ── Cash Flow Detail ─────────────────────────────────────
async function getCashFlowDetail(year: number, locationId?: string) {
  const locFilter = locationId ? { locationId } : {};

  // Inflows: DailyIncome by payment method and month
  const dailyIncomes = await prisma.dailyIncome.findMany({
    where: { ...locFilter, year },
    select: { month: true, cashAmount: true, cardAmount: true, transferAmount: true },
  });

  const cashSales = zeros();
  const cardSales = zeros();
  const transferSales = zeros();
  for (const d of dailyIncomes) {
    if (d.month >= 1 && d.month <= 12) {
      const m = d.month - 1;
      cashSales[m] += d.cashAmount;
      cardSales[m] += d.cardAmount;
      transferSales[m] += d.transferAmount;
    }
  }

  // Inflows: outgoing invoice collections (cash basis)
  const outgoingInvoices = await prisma.outgoingInvoice.findMany({
    where: {
      ...(locationId ? { locationId } : {}),
      paymentYear: year,
      paidAmount: { gt: 0 },
    },
    select: { paymentMonth: true, paidAmount: true },
  });

  const invoiceCollections = zeros();
  for (const inv of outgoingInvoices) {
    if (inv.paymentMonth) {
      const m = monthIndex(inv.paymentMonth);
      if (m >= 0) invoiceCollections[m] += inv.paidAmount;
    }
  }

  const totalInflows = zeros().map((_, i) => cashSales[i] + cardSales[i] + transferSales[i] + invoiceCollections[i]);

  // Outflows: incoming invoices paid (cash basis) grouped by plCategory
  const paidInvoices = await prisma.incomingInvoice.findMany({
    where: {
      ...locFilter,
      paymentYear: year,
      paidAmount: { gt: 0 },
    },
    select: { paymentMonth: true, paidAmount: true, plCategory: true },
  });

  const outCogs = zeros();
  const outPeople = zeros();
  const outOpex = zeros();
  const outCostfix = zeros();
  const outTaxe = zeros();
  for (const inv of paidInvoices) {
    if (!inv.paymentMonth) continue;
    const m = monthIndex(inv.paymentMonth);
    if (m < 0) continue;
    switch (inv.plCategory) {
      case "COGS": outCogs[m] += inv.paidAmount; break;
      case "PEOPLE": outPeople[m] += inv.paidAmount; break;
      case "OPEX": outOpex[m] += inv.paidAmount; break;
      case "COSTFIX": outCostfix[m] += inv.paidAmount; break;
      case "TAXE": outTaxe[m] += inv.paidAmount; break;
    }
  }

  const totalOutflows = zeros().map((_, i) => outCogs[i] + outPeople[i] + outOpex[i] + outCostfix[i] + outTaxe[i]);
  const netCashFlow = totalInflows.map((v, i) => v - totalOutflows[i]);
  const cumulativeCashFlow = zeros();
  netCashFlow.forEach((v, i) => {
    cumulativeCashFlow[i] = (i > 0 ? cumulativeCashFlow[i - 1] : 0) + v;
  });

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  return {
    inflows: { cashSales, cardSales, transferSales, invoiceCollections, totalInflows },
    outflows: { cogs: outCogs, people: outPeople, opex: outOpex, costfix: outCostfix, taxe: outTaxe, totalOutflows },
    netCashFlow,
    cumulativeCashFlow,
    totals: {
      inflows: sum(totalInflows),
      outflows: sum(totalOutflows),
      net: sum(netCashFlow),
      monthlyAvg: sum(netCashFlow) / 12,
    },
  };
}

// ── COGS Detail ──────────────────────────────────────────
async function getCogsDetail(year: number, locationId?: string) {
  const locFilter = locationId ? { locationId } : {};

  // COGS invoices grouped by category and month
  const cogsInvoices = await prisma.incomingInvoice.findMany({
    where: { ...locFilter, year, plCategory: "COGS" },
    select: { month: true, category: true, totalAmount: true, supplierId: true },
  });

  const categories: Record<string, number[]> = {};
  for (const cat of COGS_CATS) categories[cat] = zeros();
  const totalCogs = zeros();

  // Also track suppliers
  const supplierTotals: Record<string, { total: number; monthly: number[] }> = {};

  for (const inv of cogsInvoices) {
    const m = monthIndex(inv.month);
    if (m < 0) continue;
    const cat = inv.category.toUpperCase();
    if (!categories[cat]) categories[cat] = zeros();
    categories[cat][m] += inv.totalAmount;
    totalCogs[m] += inv.totalAmount;

    // Track supplier
    if (!supplierTotals[inv.supplierId]) {
      supplierTotals[inv.supplierId] = { total: 0, monthly: zeros() };
    }
    supplierTotals[inv.supplierId].total += inv.totalAmount;
    supplierTotals[inv.supplierId].monthly[m] += inv.totalAmount;
  }

  // Revenue for COGS % calculation from DailyIncome
  const dailyIncomesForCogs = await prisma.dailyIncome.findMany({
    where: { ...locFilter, year },
    select: { month: true, totalSales: true },
  });

  const revenue = zeros();
  for (const d of dailyIncomesForCogs) {
    if (d.month >= 1 && d.month <= 12) {
      revenue[d.month - 1] += d.totalSales;
    }
  }

  const cogsPercent = revenue.map((v, i) => (v > 0 ? (totalCogs[i] / v) * 100 : 0));

  // Top 10 suppliers
  const topSupplierIds = Object.entries(supplierTotals)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([id]) => id);

  const supplierNames = await prisma.supplier.findMany({
    where: { id: { in: topSupplierIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(supplierNames.map((s) => [s.id, s.name]));

  const topSuppliers = topSupplierIds.map((id) => ({
    name: nameMap.get(id) || "Necunoscut",
    total: supplierTotals[id].total,
    monthly: supplierTotals[id].monthly,
  }));

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  return {
    categories,
    totalCogs,
    revenue,
    cogsPercent,
    topSuppliers,
    totals: {
      cogs: sum(totalCogs),
      revenue: sum(revenue),
      cogsPercent: sum(revenue) > 0 ? (sum(totalCogs) / sum(revenue)) * 100 : 0,
      monthlyAvgCogs: sum(totalCogs) / 12,
    },
  };
}
