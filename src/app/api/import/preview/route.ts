import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { readMappedRows } from "@/lib/excel";
import { importPreviewRequestSchema } from "@/lib/validations/incoming-invoice";
import { requireAuth } from "@/lib/auth-guard";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/import/preview
 * Accept fileData (base64), sheet name, and column mapping.
 * Return first 10 rows transformed per the mapping.
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
