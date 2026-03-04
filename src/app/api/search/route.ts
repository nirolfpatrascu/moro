import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDecimal } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [incomingInvoices, outgoingInvoices, receipts, suppliers, customers] =
      await Promise.all([
        // Incoming invoices
        prisma.incomingInvoice.findMany({
          where: {
            OR: [
              { invoiceNumber: { contains: q, mode: "insensitive" } },
              { supplier: { name: { contains: q, mode: "insensitive" } } },
              { notes: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            supplier: { select: { name: true } },
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        }),
        // Outgoing invoices
        prisma.outgoingInvoice.findMany({
          where: {
            OR: [
              { invoiceNumber: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
              { notes: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            customer: { select: { name: true } },
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        }),
        // Receipts
        prisma.receipt.findMany({
          where: {
            OR: [
              { receiptNumber: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            receiptNumber: true,
            description: true,
            amount: true,
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        }),
        // Suppliers
        prisma.supplier.findMany({
          where: {
            name: { contains: q, mode: "insensitive" },
          },
          select: { id: true, name: true },
          take: 5,
          orderBy: { name: "asc" },
        }),
        // Customers
        prisma.customer.findMany({
          where: {
            name: { contains: q, mode: "insensitive" },
          },
          select: { id: true, name: true },
          take: 5,
          orderBy: { name: "asc" },
        }),
      ]);

    return NextResponse.json(serializeDecimal({
      results: {
        incomingInvoices: incomingInvoices.map((inv) => ({
          id: inv.id,
          label: `${inv.invoiceNumber} — ${inv.supplier.name}`,
          sublabel: `${inv.totalAmount} RON`,
          href: "/incoming",
        })),
        outgoingInvoices: outgoingInvoices.map((inv) => ({
          id: inv.id,
          label: `${inv.invoiceNumber} — ${inv.customer.name}`,
          sublabel: `${inv.totalAmount} RON`,
          href: "/outgoing",
        })),
        receipts: receipts.map((r) => ({
          id: r.id,
          label: r.receiptNumber || r.description || "Incasare",
          sublabel: `${r.amount} RON`,
          href: "/income",
        })),
        suppliers: suppliers.map((s) => ({
          id: s.id,
          label: s.name,
          href: "/suppliers",
        })),
        customers: customers.map((c) => ({
          id: c.id,
          label: c.name,
          href: "/customers",
        })),
      },
    }));
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Eroare la cautare" },
      { status: 500 }
    );
  }
}
