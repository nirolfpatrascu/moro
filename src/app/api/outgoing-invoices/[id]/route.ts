import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { outgoingInvoiceUpdateSchema, outgoingStatusUpdateSchema } from "@/lib/validations/outgoing-invoice";
import { parseDateFlexible } from "@/lib/excel";
import { MONTHS_RO } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/outgoing-invoices/[id]
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const invoice = await prisma.outgoingInvoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
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
    console.error("Get outgoing invoice error:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea facturii" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/outgoing-invoices/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = outgoingInvoiceUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.outgoingInvoice.findUnique({
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

    if (data.locationId !== undefined) updateData.locationId = data.locationId || null;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.paymentYear !== undefined) updateData.paymentYear = data.paymentYear || null;
    if (data.paymentMonth !== undefined) updateData.paymentMonth = data.paymentMonth || null;
    if (data.paymentDay !== undefined) updateData.paymentDay = data.paymentDay || null;

    if (data.issueDate !== undefined) {
      const parsedDate = data.issueDate ? parseDateFlexible(data.issueDate) : null;
      updateData.issueDate = parsedDate;
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
    }

    if (data.paidAmount !== undefined || data.status !== undefined) {
      const total = (data.totalAmount ?? existing.totalAmount) || 0;
      const status = data.status ?? existing.status;
      const paidAmount = data.paidAmount ?? (status === "PAID" ? total : existing.paidAmount);
      updateData.paidAmount = paidAmount;
      updateData.unpaidAmount = data.unpaidAmount ?? total - paidAmount;
    }

    const invoice = await prisma.outgoingInvoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Update outgoing invoice error:", error);
    return NextResponse.json(
      { error: "Eroare la actualizarea facturii" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/outgoing-invoices/[id]
 * Update invoice status (mark as paid/unpaid/partial).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = outgoingStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.outgoingInvoice.findUnique({
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
    const unpaidAmount = existing.totalAmount - resolvedPaidAmount;

    const invoice = await prisma.outgoingInvoice.update({
      where: { id },
      data: {
        status,
        paidAmount: resolvedPaidAmount,
        unpaidAmount,
        paymentYear: paymentYear ?? (status === "PAID" ? now.getFullYear() : existing.paymentYear),
        paymentMonth: paymentMonth ?? (status === "PAID" ? MONTHS_RO[now.getMonth()] : existing.paymentMonth),
        paymentDay: paymentDay ?? (status === "PAID" ? now.getDate() : existing.paymentDay),
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Patch outgoing invoice status error:", error);
    return NextResponse.json(
      { error: "Eroare la actualizarea statusului" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/outgoing-invoices/[id]
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existing = await prisma.outgoingInvoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Factura nu a fost gasita" },
        { status: 404 }
      );
    }

    await prisma.outgoingInvoice.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete outgoing invoice error:", error);
    return NextResponse.json(
      { error: "Eroare la stergerea facturii" },
      { status: 500 }
    );
  }
}
