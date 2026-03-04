import { NextRequest, NextResponse } from "next/server";
import { parseExcelSheets } from "@/lib/excel";
import { requireAuth } from "@/lib/auth-guard";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/import
 * Accept multipart/form-data with .xlsx file.
 * Parse with xlsx and return sheet names, column headers, and file data as base64.
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    if (rateLimit(`import:${ip}`, 5, 60_000)) {
      return NextResponse.json({ error: "Prea multe cereri" }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fisierul lipseste" }, { status: 400 });
    }

    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls") &&
      !file.type.includes("spreadsheet")
    ) {
      return NextResponse.json(
        { error: "Format invalid. Acceptam doar fisiere .xlsx sau .xls" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { sheets } = parseExcelSheets(buffer);

    // Return sheet info + file as base64 for subsequent requests
    const fileData = buffer.toString("base64");

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      sheets,
      fileData,
    });
  } catch (error) {
    console.error("Import upload error:", error);
    return NextResponse.json({ error: "Eroare la procesarea fisierului" }, { status: 500 });
  }
}
