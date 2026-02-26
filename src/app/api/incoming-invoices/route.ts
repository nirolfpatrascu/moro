import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { incomingInvoiceCreateSchema, bulkStatusUpdateSchema } from "@/lib/validations/incoming-invoice";
import { parseDateFlexible } from "@/lib/excel";
import { MONTHS_RO } from "@/lib/utils";

/**
 * GET /api/incoming-invoices
 * List incoming invoices with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Record<string, unknown> = {};
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (year) where.year = Number(year);
    if (month) where.month = month;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { itemDescription: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.incomingInvoice.findMany({
        where,
        include: {
          location: { select: { id: true, code: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.incomingInvoice.count({ where }),
    ]);

    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("List incoming invoices error:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea facturilor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/incoming-invoices
 * Create a new incoming invoice.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = incomingInvoiceCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Parse issue date
    const parsedIssueDate = data.issueDate
      ? parseDateFlexible(data.issueDate)
      : null;

    // Derive year/month if not provided
    const year =
      data.year || (parsedIssueDate ? parsedIssueDate.getFullYear() : new Date().getFullYear());
    const monthIdx = parsedIssueDate ? parsedIssueDate.getMonth() : new Date().getMonth();
    const month = data.month || MONTHS_RO[monthIdx];

    // Parse due date
    const parsedDueDate = data.dueDate ? parseDateFlexible(data.dueDate) : null;

    // Auto-calculate amounts if not provided
    const totalAmount = data.totalAmount || 0;
    const amountExVat = data.amountExVat || +(totalAmount / 1.19).toFixed(2);
    const vatAmount = data.vatAmount || +(totalAmount - amountExVat).toFixed(2);
    const paidAmount =
      data.paidAmount || (data.status === "PAID" ? totalAmount : 0);
    const remainingAmount = data.remainingAmount ?? totalAmount - paidAmount;

    const invoice = await prisma.incomingInvoice.create({
      data: {
        locationId: data.locationId,
        year,
        month,
        plCategory: data.plCategory || "COGS",
        category: data.category || "GENERAL",
        subcategory: data.subcategory || null,
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        issueDate: data.issueDate || null,
        issueDateParsed: parsedIssueDate,
        dueDate: parsedDueDate,
        itemDescription: data.itemDescription || null,
        qty: data.qty || 0,
        unitPrice: data.unitPrice || 0,
        amountExVat,
        vatAmount,
        totalAmount,
        status: data.status || "UNPAID",
        paidAmount,
        paymentYear: data.paymentYear || null,
        paymentMonth: data.paymentMonth || null,
        paymentDay: data.paymentDay || null,
        remainingAmount,
        notes: data.notes || null,
      },
      include: {
        location: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Create incoming invoice error:", error);
    return NextResponse.json(
      { error: "Eroare la crearea facturii" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/incoming-invoices
 * Bulk status update — mark multiple invoices as paid/unpaid.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bulkStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { ids, status } = parsed.data;
    const now = new Date();

    // Fetch all invoices to calculate paid amounts
    const invoices = await prisma.incomingInvoice.findMany({
      where: { id: { in: ids } },
    });

    await prisma.$transaction(
      invoices.map((inv) =>
        prisma.incomingInvoice.update({
          where: { id: inv.id },
          data: {
            status,
            paidAmount: status === "PAID" ? inv.totalAmount : status === "UNPAID" ? 0 : inv.paidAmount,
            remainingAmount: status === "PAID" ? 0 : status === "UNPAID" ? inv.totalAmount : inv.remainingAmount,
            paymentYear: status === "PAID" ? now.getFullYear() : null,
            paymentMonth: status === "PAID" ? MONTHS_RO[now.getMonth()] : null,
            paymentDay: status === "PAID" ? now.getDate() : null,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      updated: ids.length,
    });
  } catch (error) {
    console.error("Bulk status update error:", error);
    return NextResponse.json(
      { error: "Eroare la actualizarea in masa" },
      { status: 500 }
    );
  }
}
