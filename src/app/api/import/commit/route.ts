import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { readMappedRows, parseDateFlexible } from "@/lib/excel";
import { importCommitRequestSchema } from "@/lib/validations/incoming-invoice";
import { MONTHS_RO } from "@/lib/utils";

/**
 * POST /api/import/commit
 * Bulk insert mapped data using Prisma transactions.
 * Return success/error count.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = importCommitRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { fileData, sheetName, mapping, duplicateStrategy } = parsed.data;

    const buffer = Buffer.from(fileData, "base64");
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    const { rows, errors: parseErrors } = readMappedRows(workbook, sheetName, mapping);

    // Load locations and suppliers for lookup
    const locations = await prisma.location.findMany();
    const locationMap = new Map(
      locations.flatMap((l) => [
        [l.code.toUpperCase(), l.id],
        [l.name.toUpperCase(), l.id],
      ])
    );

    const existingSuppliers = await prisma.supplier.findMany();
    const supplierMap = new Map(
      existingSuppliers.map((s) => [s.name.toUpperCase(), s.id])
    );

    // Check for existing invoice numbers to handle duplicates
    const existingInvoices = await prisma.incomingInvoice.findMany({
      select: { invoiceNumber: true },
    });
    const existingNumbers = new Set(existingInvoices.map((i) => i.invoiceNumber));

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const importErrors: { row: number; message: string }[] = [...parseErrors];

    // Process rows individually (no wrapping transaction to avoid timeout on large imports)
    for (const row of rows) {
      const rowIdx = (row._rowIndex as number) || 0;

      try {
        // Invoice number — fallback to "NA" with unique suffix
        let invoiceNumber = String(row.invoiceNumber ?? "").trim();
        if (!invoiceNumber) {
          invoiceNumber = `NA-${rowIdx}`;
        }

        // Handle duplicate invoice numbers
        if (existingNumbers.has(invoiceNumber)) {
          if (duplicateStrategy === "skip") {
            skipCount++;
            continue;
          }
          // "rename" strategy: append suffix below
        }

        // Resolve location — fallback to first available location
        const locationStr = String(row.location ?? "").trim().toUpperCase();
        let locationId = locationMap.get(locationStr);
        if (!locationId) {
          for (const [key, id] of locationMap) {
            if (key.includes(locationStr) || locationStr.includes(key)) {
              locationId = id;
              break;
            }
          }
        }
        if (!locationId && locations.length > 0) {
          locationId = locations[0].id;
        }
        if (!locationId) {
          importErrors.push({
            row: rowIdx,
            message: `Locatia "${row.location}" nu a fost gasita`,
          });
          errorCount++;
          continue;
        }

        // Resolve or create supplier — fallback to "NA"
        const supplierName = String(row.supplierName ?? "").trim() || "NA";
        let supplierId = supplierMap.get(supplierName.toUpperCase());
        if (!supplierId) {
          const newSupplier = await prisma.supplier.create({
            data: { name: supplierName },
          });
          supplierId = newSupplier.id;
          supplierMap.set(supplierName.toUpperCase(), supplierId);
        }

        // Parse dates
        const issueDateRaw = row.issueDate;
        const parsedIssueDate = parseDateFlexible(issueDateRaw);
        const dueDateRaw = row.dueDate;
        const parsedDueDate = parseDateFlexible(dueDateRaw);

        // Use year/month from Excel, fallback to issue date, fallback to current
        let year = Number(row.year) || 0;
        if (!year && parsedIssueDate) {
          year = parsedIssueDate.getFullYear();
        }
        if (!year) {
          year = new Date().getFullYear();
        }

        let month = String(row.month ?? "").trim().toUpperCase();
        if (!month && parsedIssueDate) {
          const monthIdx = parsedIssueDate.getMonth();
          month = MONTHS_RO[monthIdx];
        }
        if (!month) {
          month = "NA";
        }

        // P&L fields — fallback to "NA"
        const plCategory = String(row.plCategory ?? "").trim().toUpperCase() || "NA";
        const category = String(row.category ?? "").trim().toUpperCase() || "NA";
        const subcategory = row.subcategory
          ? String(row.subcategory).trim()
          : "NA";

        // Parse amounts from Excel — use actual values
        const totalAmount = Number(row.totalAmount) || 0;
        let amountExVat = Number(row.amountExVat) || 0;
        let vatAmount = Number(row.vatAmount) || 0;

        // Fallback: calculate VAT only if both are 0 but total > 0
        if (amountExVat === 0 && vatAmount === 0 && totalAmount > 0) {
          const vatRate = 0.19;
          amountExVat = +(totalAmount / (1 + vatRate)).toFixed(2);
          vatAmount = +(totalAmount - amountExVat).toFixed(2);
        }

        // Use actual paid/remaining from Excel
        const paidAmount = Number(row.paidAmount) || 0;
        const remainingAmount = Number(row.remainingAmount) || 0;

        // Derive status from amounts
        let status = "UNPAID";
        if (paidAmount > 0 && paidAmount >= totalAmount) {
          status = "PAID";
        } else if (paidAmount > 0) {
          status = "PARTIAL";
        }

        // Payment date fields from Excel
        const paymentYear = Number(row.paymentYear) || null;
        const paymentMonth = row.paymentMonth
          ? String(row.paymentMonth).trim().toUpperCase()
          : null;
        const paymentDay = Number(row.paymentDay) || null;

        // Handle rename strategy for duplicates
        let finalInvoiceNumber = invoiceNumber;
        if (existingNumbers.has(invoiceNumber) && duplicateStrategy === "rename") {
          let suffix = 1;
          while (existingNumbers.has(`${invoiceNumber}-${suffix}`)) {
            suffix++;
          }
          finalInvoiceNumber = `${invoiceNumber}-${suffix}`;
        }

        await prisma.incomingInvoice.create({
          data: {
            locationId,
            year,
            month,
            plCategory,
            category,
            subcategory,
            invoiceNumber: finalInvoiceNumber,
            supplierId,
            issueDate: issueDateRaw != null ? String(issueDateRaw) : "NA",
            issueDateParsed: parsedIssueDate,
            dueDate: parsedDueDate,
            amountExVat,
            vatAmount,
            totalAmount,
            status,
            paidAmount,
            paymentYear,
            paymentMonth,
            paymentDay,
            remainingAmount,
            notes: row.notes ? String(row.notes) : "NA",
          },
        });

        existingNumbers.add(finalInvoiceNumber);
        successCount++;
      } catch (err) {
        importErrors.push({
          row: rowIdx,
          message: err instanceof Error ? err.message : "Eroare necunoscuta",
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: successCount,
      skipped: skipCount,
      errors: errorCount,
      totalProcessed: rows.length,
      errorDetails: importErrors,
    });
  } catch (error) {
    console.error("Import commit error:", error);
    return NextResponse.json(
      { error: "Eroare la importul datelor" },
      { status: 500 }
    );
  }
}
