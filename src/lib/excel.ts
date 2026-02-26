import * as XLSX from "xlsx";
import type { ColumnMapping } from "@/lib/validations/incoming-invoice";

export interface SheetInfo {
  name: string;
  headers: string[];
  rowCount: number;
}

/** Parse an Excel buffer and return sheet metadata */
export function parseExcelSheets(buffer: Buffer): {
  workbook: XLSX.WorkBook;
  sheets: SheetInfo[];
} {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellNF: true,
    cellText: true,
  });

  const sheets: SheetInfo[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    // First non-empty row is the header
    const headerRow = rawData.find((row) =>
      row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "")
    );
    const headers = headerRow
      ? headerRow.map((h) => String(h ?? "").trim()).filter(Boolean)
      : [];

    // Count data rows (excluding header)
    const dataRows = rawData.filter((row, i) => {
      if (row === headerRow) return false;
      return row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "");
    });

    return { name, headers, rowCount: dataRows.length };
  });

  return { workbook, sheets };
}

/** Read rows from a specific sheet, applying the column mapping */
export function readMappedRows(
  workbook: XLSX.WorkBook,
  sheetName: string,
  mapping: ColumnMapping,
  limit?: number
): { rows: Record<string, unknown>[]; errors: { row: number; message: string }[] } {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    blankrows: false,
  });

  const rows: Record<string, unknown>[] = [];
  const errors: { row: number; message: string }[] = [];

  const dataSlice = limit ? rawData.slice(0, limit) : rawData;

  for (let i = 0; i < dataSlice.length; i++) {
    const raw = dataSlice[i];
    const mapped: Record<string, unknown> = {};
    let hasData = false;

    for (const [dbField, excelCol] of Object.entries(mapping)) {
      if (!excelCol) continue;
      const value = raw[excelCol];

      if (value !== null && value !== undefined && String(value).trim() !== "") {
        hasData = true;
      }

      // Handle date serial numbers from Excel
      if ((dbField === "date" || dbField === "dueDate") && typeof value === "number") {
        mapped[dbField] = excelSerialToDateString(value);
      } else if ((dbField === "date" || dbField === "dueDate") && value instanceof Date) {
        mapped[dbField] = formatDateForDisplay(value);
      } else if (dbField === "qty" || dbField === "unitPrice" || dbField === "total") {
        mapped[dbField] = parseNumeric(value);
      } else {
        mapped[dbField] = value !== null && value !== undefined ? String(value).trim() : "";
      }
    }

    // Skip completely empty rows
    if (!hasData) continue;

    // Validate required fields
    if (!mapped.invoiceNumber || String(mapped.invoiceNumber).trim() === "") {
      errors.push({ row: i + 2, message: "Nr. factura lipseste" });
    }
    if (!mapped.location || String(mapped.location).trim() === "") {
      errors.push({ row: i + 2, message: "Locatia lipseste" });
    }

    mapped._rowIndex = i + 2; // Excel row number (1-indexed header + 1)
    rows.push(mapped);
  }

  return { rows, errors };
}

/** Convert Excel serial date number to DD/MM/YYYY string */
function excelSerialToDateString(serial: number): string {
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** Format a Date object to DD/MM/YYYY */
function formatDateForDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Parse a value to a number, returning 0 for non-numeric values */
function parseNumeric(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/** Try to parse various date string formats into a Date object */
export function parseDateFlexible(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const utcDays = Math.floor(value - 25569);
    return new Date(utcDays * 86400 * 1000);
  }
  if (typeof value !== "string" || !value.trim()) return null;

  const str = value.trim();

  // DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const euMatch = str.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (euMatch) {
    return new Date(+euMatch[3], +euMatch[2] - 1, +euMatch[1]);
  }

  // YYYY-MM-DD (ISO)
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
  }

  // Try native Date parsing as fallback
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}
