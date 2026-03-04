import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { readIncomeRows } from "@/lib/excel";
import { incomeImportRequestSchema } from "@/lib/validations/daily-income";
import { requireAuth } from "@/lib/auth-guard";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/import/commit-income
 * Read all income rows, upsert into DailyIncome.
 * Uses upsert on (locationId, date) to handle re-imports.
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    if (rateLimit(`import:${ip}`, 5, 60_000)) {
      return NextResponse.json({ error: "Prea multe cereri" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = incomeImportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { fileData, sheetName } = parsed.data;

    const buffer = Buffer.from(fileData, "base64");
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      cellNF: true,
      cellText: true,
      raw: true,
    });

    const { rows, errors: parseErrors } = readIncomeRows(workbook, sheetName);

    // Load locations for lookup
    const locations = await prisma.location.findMany();
    const locationMap = new Map(
      locations.map((l) => [l.code.toUpperCase(), l.id])
    );

    let successCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const importErrors: { row: number; message: string }[] = [...parseErrors];

    // Process rows individually with upsert (no wrapping transaction to avoid timeout)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const locationId = locationMap.get(row.locationCode);
        if (!locationId) {
          importErrors.push({
            row: i + 2,
            message: `Locatia "${row.locationCode}" nu a fost gasita`,
          });
          errorCount++;
          continue;
        }

        // Normalize date to midnight UTC for consistent unique key
        const dateNorm = new Date(
          Date.UTC(
            row.date.getUTCFullYear(),
            row.date.getUTCMonth(),
            row.date.getUTCDate()
          )
        );

        const data = {
          dayOfWeek: row.dayOfWeek,
          month: row.month,
          week: row.week,
          year: row.year,
          totalSales: row.totalSales,
          tva: row.tva,
          salesExVat: row.salesExVat,
          receiptCount: Math.round(row.receiptCount),
          avgReceipt: row.avgReceipt,
          barSales: row.barSales,
          barProductCount: Math.round(row.barProductCount),
          kitchenSales: row.kitchenSales,
          kitchenProductCount: Math.round(row.kitchenProductCount),
          cashAmount: row.cashAmount,
          cardAmount: row.cardAmount,
          transferAmount: row.transferAmount,
          accountAmount: row.accountAmount,
          deliveryAmount: row.deliveryAmount,
          tipsFiscal: row.tipsFiscal,
          tipsTotal: row.tipsTotal,
        };

        await prisma.dailyIncome.upsert({
          where: {
            locationId_date: {
              locationId,
              date: dateNorm,
            },
          },
          update: data,
          create: {
            locationId,
            date: dateNorm,
            ...data,
          },
        });

        // Check if it was an update by seeing if record existed before
        // (upsert doesn't tell us, so count all as success)
        successCount++;
      } catch (err) {
        importErrors.push({
          row: i + 2,
          message: err instanceof Error ? err.message : "Eroare necunoscuta",
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: successCount,
      updated: updatedCount,
      errors: errorCount,
      totalProcessed: rows.length,
      errorDetails: importErrors,
    });
  } catch (error) {
    console.error("Income commit error:", error);
    return NextResponse.json(
      { error: "Eroare la importul incasarilor" },
      { status: 500 }
    );
  }
}
