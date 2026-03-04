import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { readIncomeRows } from "@/lib/excel";
import { incomeImportRequestSchema } from "@/lib/validations/daily-income";
import { requireAuth } from "@/lib/auth-guard";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/import/preview-income
 * Accept fileData (base64) and sheet name.
 * Return first 10 income rows via readIncomeRows.
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

    const { rows, errors } = readIncomeRows(workbook, sheetName, 20);

    // Serialize dates for JSON
    const serialized = rows.map((r) => ({
      ...r,
      date: r.date.toISOString(),
    }));

    return NextResponse.json({
      rows: serialized,
      errors,
      totalPreview: rows.length,
    });
  } catch (error) {
    console.error("Income preview error:", error);
    return NextResponse.json(
      { error: "Eroare la previzualizare incasari" },
      { status: 500 }
    );
  }
}
