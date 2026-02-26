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

    // Process in a transaction
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const rowIdx = (row._rowIndex as number) || 0;

        try {
          const invoiceNumber = String(row.invoiceNumber ?? "").trim();
          if (!invoiceNumber) {
            importErrors.push({ row: rowIdx, message: "Nr. factura lipseste" });
            errorCount++;
            continue;
          }

          // Handle duplicate invoice numbers
          if (existingNumbers.has(invoiceNumber)) {
            if (duplicateStrategy === "skip") {
              skipCount++;
              continue;
            }
            // "rename" strategy: append suffix
            // Will be handled by finding a unique name
          }

          // Resolve location
          const locationStr = String(row.location ?? "").trim().toUpperCase();
          let locationId = locationMap.get(locationStr);
          if (!locationId) {
            // Try partial match
            for (const [key, id] of locationMap) {
              if (key.includes(locationStr) || locationStr.includes(key)) {
                locationId = id;
                break;
              }
            }
          }
          if (!locationId) {
            importErrors.push({
              row: rowIdx,
              message: `Locatia "${row.location}" nu a fost gasita`,
            });
            errorCount++;
            continue;
          }

          // Resolve or create supplier
          const supplierName = String(row.supplierName ?? "").trim();
          let supplierId = supplierMap.get(supplierName.toUpperCase());
          if (!supplierId && supplierName) {
            const newSupplier = await tx.supplier.create({
              data: { name: supplierName },
            });
            supplierId = newSupplier.id;
            supplierMap.set(supplierName.toUpperCase(), supplierId);
          }
          if (!supplierId) {
            importErrors.push({
              row: rowIdx,
              message: "Furnizor lipseste",
            });
            errorCount++;
            continue;
          }

          // Parse dates
          const issueDateRaw = row.date;
          const parsedIssueDate = parseDateFlexible(issueDateRaw);
          const dueDateRaw = row.dueDate;
          const parsedDueDate = parseDateFlexible(dueDateRaw);

          // Derive year/month from issue date
          const year = parsedIssueDate
            ? parsedIssueDate.getFullYear()
            : new Date().getFullYear();
          const monthIdx = parsedIssueDate ? parsedIssueDate.getMonth() : 0;
          const month = MONTHS_RO[monthIdx];

          // Parse amounts
          const totalAmount = Number(row.total) || 0;
          const qty = Number(row.qty) || 0;
          const unitPrice = Number(row.unitPrice) || 0;

          // Derive financial fields
          const vatRate = 0.19;
          const amountExVat = +(totalAmount / (1 + vatRate)).toFixed(2);
          const vatAmount = +(totalAmount - amountExVat).toFixed(2);

          // Derive status
          const statusRaw = String(row.status ?? "Unpaid").trim().toUpperCase();
          let status = "UNPAID";
          let paidAmount = 0;
          if (statusRaw.includes("PAID") && !statusRaw.includes("UN")) {
            status = "PAID";
            paidAmount = totalAmount;
          } else if (statusRaw.includes("PARTIAL")) {
            status = "PARTIAL";
            paidAmount = totalAmount / 2; // best guess
          }
          const remainingAmount = totalAmount - paidAmount;

          // Handle rename strategy for duplicates
          let finalInvoiceNumber = invoiceNumber;
          if (existingNumbers.has(invoiceNumber) && duplicateStrategy === "rename") {
            let suffix = 1;
            while (existingNumbers.has(`${invoiceNumber}-${suffix}`)) {
              suffix++;
            }
            finalInvoiceNumber = `${invoiceNumber}-${suffix}`;
          }

          await tx.incomingInvoice.create({
            data: {
              locationId,
              year,
              month,
              plCategory: "COGS",
              category: "GENERAL",
              invoiceNumber: finalInvoiceNumber,
              supplierId,
              issueDate: issueDateRaw != null ? String(issueDateRaw) : null,
              issueDateParsed: parsedIssueDate,
              dueDate: parsedDueDate,
              itemDescription: row.itemDescription
                ? String(row.itemDescription)
                : null,
              qty,
              unitPrice,
              amountExVat,
              vatAmount,
              totalAmount,
              status,
              paidAmount,
              remainingAmount,
              notes: row.notes ? String(row.notes) : null,
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
    });

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
