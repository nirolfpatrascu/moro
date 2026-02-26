import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { readMappedRows, parseDateFlexible } from "@/lib/excel";
import { importCommitRequestSchema } from "@/lib/validations/incoming-invoice";
import { MONTHS_RO } from "@/lib/utils";

// Allow up to 5 minutes for large imports
export const maxDuration = 300;

/**
 * POST /api/import/commit
 * Bulk insert mapped data using Prisma createMany for speed.
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

    let skipCount = 0;
    let errorCount = 0;
    const importErrors: { row: number; message: string }[] = [...parseErrors];

    // --- Pass 1: create any missing suppliers upfront ---
    const newSupplierNames = new Set<string>();
    for (const row of rows) {
      const name = String(row.supplierName ?? "").trim() || "NA";
      if (!supplierMap.has(name.toUpperCase())) {
        newSupplierNames.add(name);
      }
    }
    for (const name of newSupplierNames) {
      const newSupplier = await prisma.supplier.create({
        data: { name },
      });
      supplierMap.set(name.toUpperCase(), newSupplier.id);
    }

    // --- Pass 2: prepare all records in memory ---
    interface InvoiceRecord {
      locationId: string;
      year: number;
      month: string;
      plCategory: string;
      category: string;
      subcategory: string | null;
      invoiceNumber: string;
      supplierId: string;
      issueDate: string | null;
      issueDateParsed: Date | null;
      dueDate: Date | null;
      amountExVat: number;
      vatAmount: number;
      totalAmount: number;
      status: string;
      paidAmount: number;
      paymentYear: number | null;
      paymentMonth: string | null;
      paymentDay: number | null;
      remainingAmount: number;
      notes: string | null;
    }

    const recordsToInsert: InvoiceRecord[] = [];

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
          // "rename" strategy: append suffix
          if (duplicateStrategy === "rename") {
            let suffix = 1;
            while (existingNumbers.has(`${invoiceNumber}-${suffix}`)) {
              suffix++;
            }
            invoiceNumber = `${invoiceNumber}-${suffix}`;
          }
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

        // Resolve supplier
        const supplierName = String(row.supplierName ?? "").trim() || "NA";
        const supplierId = supplierMap.get(supplierName.toUpperCase());
        if (!supplierId) {
          importErrors.push({ row: rowIdx, message: "Furnizor lipseste" });
          errorCount++;
          continue;
        }

        // Parse dates
        const issueDateRaw = row.issueDate;
        const parsedIssueDate = parseDateFlexible(issueDateRaw);
        const parsedDueDate = parseDateFlexible(row.dueDate);

        // Year/month from Excel, fallback to issue date, fallback to current
        let year = Number(row.year) || 0;
        if (!year && parsedIssueDate) year = parsedIssueDate.getFullYear();
        if (!year) year = new Date().getFullYear();

        let month = String(row.month ?? "").trim().toUpperCase();
        if (!month && parsedIssueDate) {
          month = MONTHS_RO[parsedIssueDate.getMonth()];
        }
        if (!month) month = "NA";

        // P&L fields — fallback to "NA"
        const plCategory = String(row.plCategory ?? "").trim().toUpperCase() || "NA";
        const category = String(row.category ?? "").trim().toUpperCase() || "NA";
        const subcategory = row.subcategory ? String(row.subcategory).trim() : "NA";

        // Amounts
        const totalAmount = Number(row.totalAmount) || 0;
        let amountExVat = Number(row.amountExVat) || 0;
        let vatAmount = Number(row.vatAmount) || 0;

        if (amountExVat === 0 && vatAmount === 0 && totalAmount > 0) {
          const vatRate = 0.19;
          amountExVat = +(totalAmount / (1 + vatRate)).toFixed(2);
          vatAmount = +(totalAmount - amountExVat).toFixed(2);
        }

        const paidAmount = Number(row.paidAmount) || 0;
        const remainingAmount = Number(row.remainingAmount) || 0;

        let status = "UNPAID";
        if (paidAmount > 0 && paidAmount >= totalAmount) {
          status = "PAID";
        } else if (paidAmount > 0) {
          status = "PARTIAL";
        }

        const paymentYear = Number(row.paymentYear) || null;
        const paymentMonth = row.paymentMonth
          ? String(row.paymentMonth).trim().toUpperCase()
          : null;
        const paymentDay = Number(row.paymentDay) || null;

        existingNumbers.add(invoiceNumber);

        recordsToInsert.push({
          locationId,
          year,
          month,
          plCategory,
          category,
          subcategory,
          invoiceNumber,
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
        });
      } catch (err) {
        importErrors.push({
          row: rowIdx,
          message: err instanceof Error ? err.message : "Eroare necunoscuta",
        });
        errorCount++;
      }
    }

    // --- Pass 3: batch insert in chunks of 500 ---
    const BATCH_SIZE = 500;
    let successCount = 0;

    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
      try {
        const result = await prisma.incomingInvoice.createMany({
          data: batch,
          skipDuplicates: true,
        });
        successCount += result.count;
      } catch (err) {
        // If batch fails, fall back to individual inserts for this batch
        for (const record of batch) {
          try {
            await prisma.incomingInvoice.create({ data: record });
            successCount++;
          } catch (innerErr) {
            importErrors.push({
              row: 0,
              message: `${record.invoiceNumber}: ${innerErr instanceof Error ? innerErr.message : "Eroare"}`,
            });
            errorCount++;
          }
        }
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
