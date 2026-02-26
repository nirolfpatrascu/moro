import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { incomingInvoiceUpdateSchema, invoiceStatusUpdateSchema } from "@/lib/validations/incoming-invoice";
import { parseDateFlexible } from "@/lib/excel";
import { MONTHS_RO } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/incoming-invoices/[id]
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const invoice = await prisma.incomingInvoice.findUnique({
      where: { id },
      include: {
        location: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Factura nu a fost gasita" },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Get incoming invoice error:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea facturii" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/incoming-invoices/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = incomingInvoiceUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.incomingInvoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Factura nu a fost gasita" },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.supplierId !== undefined) updateData.supplierId = data.supplierId;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.itemDescription !== undefined) updateData.itemDescription = data.itemDescription || null;
    if (data.qty !== undefined) updateData.qty = data.qty;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.plCategory !== undefined) updateData.plCategory = data.plCategory;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.subcategory !== undefined) updateData.subcategory = data.subcategory || null;
    if (data.paymentYear !== undefined) updateData.paymentYear = data.paymentYear || null;
    if (data.paymentMonth !== undefined) updateData.paymentMonth = data.paymentMonth || null;
    if (data.paymentDay !== undefined) updateData.paymentDay = data.paymentDay || null;

    if (data.issueDate !== undefined) {
      updateData.issueDate = data.issueDate || null;
      const parsedDate = data.issueDate ? parseDateFlexible(data.issueDate) : null;
      updateData.issueDateParsed = parsedDate;
      if (parsedDate) {
        updateData.year = data.year || parsedDate.getFullYear();
        updateData.month = data.month || MONTHS_RO[parsedDate.getMonth()];
      }
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? parseDateFlexible(data.dueDate) : null;
    }

    if (data.totalAmount !== undefined) {
      updateData.totalAmount = data.totalAmount;
      updateData.amountExVat = data.amountExVat || +(data.totalAmount / 1.19).toFixed(2);
      updateData.vatAmount = data.vatAmount || +(data.totalAmount - (updateData.amountExVat as number)).toFixed(2);
    }

    if (data.paidAmount !== undefined || data.status !== undefined) {
      const total = (data.totalAmount ?? existing.totalAmount) || 0;
      const status = data.status ?? existing.status;
      const paidAmount = data.paidAmount ?? (status === "PAID" ? total : existing.paidAmount);
      updateData.paidAmount = paidAmount;
      updateData.remainingAmount = data.remainingAmount ?? total - paidAmount;
    }

    const invoice = await prisma.incomingInvoice.update({
      where: { id },
      data: updateData,
      include: {
        location: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Update incoming invoice error:", error);
    return NextResponse.json(
      { error: "Eroare la actualizarea facturii" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/incoming-invoices/[id]
 * Update invoice status (mark as paid/unpaid/partial).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = invoiceStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.incomingInvoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Factura nu a fost gasita" },
        { status: 404 }
      );
    }

    const { status, paidAmount, paymentYear, paymentMonth, paymentDay } = parsed.data;

    const now = new Date();
    const resolvedPaidAmount =
      paidAmount ?? (status === "PAID" ? existing.totalAmount : status === "UNPAID" ? 0 : existing.paidAmount);
    const remainingAmount = existing.totalAmount - resolvedPaidAmount;

    const invoice = await prisma.incomingInvoice.update({
      where: { id },
      data: {
        status,
        paidAmount: resolvedPaidAmount,
        remainingAmount,
        paymentYear: paymentYear ?? (status === "PAID" ? now.getFullYear() : existing.paymentYear),
        paymentMonth: paymentMonth ?? (status === "PAID" ? MONTHS_RO[now.getMonth()] : existing.paymentMonth),
        paymentDay: paymentDay ?? (status === "PAID" ? now.getDate() : existing.paymentDay),
      },
      include: {
        location: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Patch incoming invoice status error:", error);
    return NextResponse.json(
      { error: "Eroare la actualizarea statusului" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/incoming-invoices/[id]
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existing = await prisma.incomingInvoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Factura nu a fost gasita" },
        { status: 404 }
      );
    }

    await prisma.incomingInvoice.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete incoming invoice error:", error);
    return NextResponse.json(
      { error: "Eroare la stergerea facturii" },
      { status: 500 }
    );
  }
}
