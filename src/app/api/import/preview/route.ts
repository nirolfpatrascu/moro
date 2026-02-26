import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { readMappedRows } from "@/lib/excel";
import { importPreviewRequestSchema } from "@/lib/validations/incoming-invoice";

/**
 * POST /api/import/preview
 * Accept fileData (base64), sheet name, and column mapping.
 * Return first 10 rows transformed per the mapping.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = importPreviewRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { fileData, sheetName, mapping } = parsed.data;

    const buffer = Buffer.from(fileData, "base64");
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    const { rows, errors } = readMappedRows(workbook, sheetName, mapping, 10);

    return NextResponse.json({
      rows,
      errors,
      totalPreview: rows.length,
    });
  } catch (error) {
    console.error("Import preview error:", error);
    return NextResponse.json(
      { error: "Eroare la previzualizare" },
      { status: 500 }
    );
  }
}
