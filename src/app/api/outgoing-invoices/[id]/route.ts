import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDecimal } from "@/lib/prisma";
import {
  outgoingInvoiceUpdateSchema,
  outgoingStatusUpdateSchema,
} from "@/lib/validations/outgoing-invoice";
import { parseDateFlexible } from "@/lib/excel";
import { MONTHS_RO } from "@/lib/utils";
import { VAT_MULTIPLIER } from "@/lib/constants";
import { requireAuth } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { invalidateCache } from "@/lib/cache";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/outgoing-invoices/[id]
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const invoice = await prisma.outgoingInvoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Factura nu a fost gasita" }, { status: 404 });
    }

    return NextResponse.json(serializeDecimal(invoice));
  } catch (error) {
    logger.error("Get outgoing invoice error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Eroare la incarcarea facturii" }, { status: 500 });
  }
}

/**
 * PUT /api/outgoing-invoices/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const parsed = outgoingInvoiceUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.outgoingInvoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Factura nu a fost gasita" }, { status: 404 });
    }

    const data = parsed.data;

    // Bounds check: paidAmount cannot exceed totalAmount
    if (data.paidAmount !== undefined && data.totalAmount !== undefined) {
      if (data.paidAmount > data.totalAmount) {
        return NextResponse.json(
          { error: "Suma achitata nu poate depasi suma totala" },
          { status: 400 },
        );
      }
    } else if (data.paidAmount !== undefined && data.paidAmount > Number(existing.totalAmount)) {
      return NextResponse.json(
        { error: "Suma achitata nu poate depasi suma totala" },
        { status: 400 },
      );
    }

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
      updateData.amountExVat = data.amountExVat || +(data.totalAmount / VAT_MULTIPLIER).toFixed(2);
    }

    if (data.paidAmount !== undefined || data.status !== undefined) {
      const total = Number(data.totalAmount ?? existing.totalAmount) || 0;
      const status = data.status ?? existing.status;
      const paidAmount =
        data.paidAmount ?? (status === "PAID" ? total : Number(existing.paidAmount));
      updateData.paidAmount = paidAmount;
      updateData.unpaidAmount = data.unpaidAmount ?? total - Number(paidAmount);
    }

    const invoice = await prisma.outgoingInvoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    invalidateCache("dashboard:");
    return NextResponse.json(serializeDecimal(invoice));
  } catch (error) {
    logger.error("Update outgoing invoice error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Eroare la actualizarea facturii" }, { status: 500 });
  }
}

/**
 * PATCH /api/outgoing-invoices/[id]
 * Update invoice status (mark as paid/unpaid/partial).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const parsed = outgoingStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.outgoingInvoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Factura nu a fost gasita" }, { status: 404 });
    }

    const { status, paidAmount, paymentYear, paymentMonth, paymentDay } = parsed.data;

    const now = new Date();
    const resolvedPaidAmount =
      paidAmount ??
      (status === "PAID"
        ? Number(existing.totalAmount)
        : status === "UNPAID"
          ? 0
          : Number(existing.paidAmount));
    const unpaidAmount = Number(existing.totalAmount) - Number(resolvedPaidAmount);

    const invoice = await prisma.outgoingInvoice.update({
      where: { id },
      data: {
        status,
        paidAmount: resolvedPaidAmount,
        unpaidAmount,
        paymentYear: paymentYear ?? (status === "PAID" ? now.getFullYear() : existing.paymentYear),
        paymentMonth:
          paymentMonth ?? (status === "PAID" ? MONTHS_RO[now.getMonth()] : existing.paymentMonth),
        paymentDay: paymentDay ?? (status === "PAID" ? now.getDate() : existing.paymentDay),
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    invalidateCache("dashboard:");
    return NextResponse.json(serializeDecimal(invoice));
  } catch (error) {
    logger.error("Patch outgoing invoice status error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Eroare la actualizarea statusului" }, { status: 500 });
  }
}

/**
 * DELETE /api/outgoing-invoices/[id]
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.outgoingInvoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Factura nu a fost gasita" }, { status: 404 });
    }

    await prisma.outgoingInvoice.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Delete outgoing invoice error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Eroare la stergerea facturii" }, { status: 500 });
  }
}
