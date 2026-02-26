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
    const dataRows = rawData.filter((row) => {
      if (row === headerRow) return false;
      return row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "");
    });

    return { name, headers, rowCount: dataRows.length };
  });

  return { workbook, sheets };
}

// ── Numeric fields for auto-parsing ──────────────────────────
const NUMERIC_FIELDS = new Set([
  "amountExVat",
  "vatAmount",
  "totalAmount",
  "paidAmount",
  "remainingAmount",
  "year",
  "paymentYear",
  "paymentDay",
]);

// ── Date fields ──────────────────────────────────────────────
const DATE_FIELDS = new Set(["issueDate", "dueDate"]);

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

      // Handle date fields
      if (DATE_FIELDS.has(dbField) && typeof value === "number") {
        mapped[dbField] = excelSerialToDateString(value);
      } else if (DATE_FIELDS.has(dbField) && value instanceof Date) {
        mapped[dbField] = formatDateForDisplay(value);
      } else if (NUMERIC_FIELDS.has(dbField)) {
        mapped[dbField] = parseNumeric(value);
      } else {
        mapped[dbField] = value !== null && value !== undefined ? String(value).trim() : "";
      }
    }

    // Skip completely empty rows
    if (!hasData) continue;

    // No strict validation here — commit route handles all fallbacks with "NA"

    mapped._rowIndex = i + 2; // Excel row number (1-indexed header + 1)
    rows.push(mapped);
  }

  return { rows, errors };
}

/** Convert Excel serial date number to DD/MM/YYYY string */
export function excelSerialToDateString(serial: number): string {
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
export function parseNumeric(value: unknown): number {
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

// ── Income sheet reader ──────────────────────────────────────

/** Romanian day-of-week abbreviations */
const DAY_ABBREVS: Record<string, string> = {
  L: "L", Lu: "L", LU: "L",
  Ma: "Ma", MA: "Ma",
  Mi: "Mi", MI: "Mi",
  J: "J", JO: "J", Jo: "J",
  V: "V", VI: "V", Vi: "V",
  S: "S", SA: "S", Sa: "S",
  D: "D", DU: "D", Du: "D",
};

export interface IncomeRow {
  date: Date;
  dayOfWeek: string | null;
  month: number;
  week: number | null;
  year: number;
  locationCode: "MG" | "O";
  totalSales: number;
  tva: number;
  salesExVat: number;
  receiptCount: number;
  avgReceipt: number;
  barSales: number;
  barProductCount: number;
  kitchenSales: number;
  kitchenProductCount: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
  accountAmount: number;
  deliveryAmount: number;
  tipsFiscal: number;
  tipsTotal: number;
}

/**
 * Read the Income sheet with dual-location (MAGNOLIA + ORIZONT) format.
 * Uses position-based detection: finds "MAGNOLIA" and "ORIZONT" in the
 * header row, then reads 16 numeric columns after each.
 */
export function readIncomeRows(
  workbook: XLSX.WorkBook,
  sheetName: string,
  limit?: number
): { rows: IncomeRow[]; errors: { row: number; message: string }[] } {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

  // Read as array-of-arrays to handle duplicate headers
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: true,
  });

  if (rawData.length < 2) {
    return { rows: [], errors: [{ row: 1, message: "Sheet-ul este gol" }] };
  }

  // Find header row — look for one that contains "MAGNOLIA" or "ORIZONT"
  let headerRowIdx = -1;
  let headerRow: unknown[] = [];
  for (let i = 0; i < Math.min(rawData.length, 10); i++) {
    const row = rawData[i];
    const hasMarker = row.some((cell) => {
      const s = String(cell ?? "").trim().toUpperCase();
      return s === "MAGNOLIA" || s === "ORIZONT";
    });
    if (hasMarker) {
      headerRowIdx = i;
      headerRow = row;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return {
      rows: [],
      errors: [{ row: 1, message: "Nu s-au gasit coloanele MAGNOLIA/ORIZONT in header" }],
    };
  }

  // Find MAGNOLIA and ORIZONT column indices
  let mgIdx = -1;
  let oIdx = -1;
  for (let c = 0; c < headerRow.length; c++) {
    const s = String(headerRow[c] ?? "").trim().toUpperCase();
    if (s === "MAGNOLIA" && mgIdx === -1) mgIdx = c;
    if (s === "ORIZONT" && oIdx === -1) oIdx = c;
  }

  // Try to find shared columns: LUNA, SAPT, DATE, Zi (before MAGNOLIA)
  // These are typically in the first few columns
  let lunaIdx = -1;
  let saptIdx = -1;
  let dateIdx = -1;
  let ziIdx = -1;
  for (let c = 0; c < (mgIdx > -1 ? mgIdx : headerRow.length); c++) {
    const s = String(headerRow[c] ?? "").trim().toUpperCase();
    if (s === "LUNA" || s.includes("LUNA")) lunaIdx = c;
    if (s === "SAPT" || s.includes("SAPT")) saptIdx = c;
    if (s === "DATE" || s === "DATA") dateIdx = c;
    if (s === "ZI") ziIdx = c;
  }

  const rows: IncomeRow[] = [];
  const errors: { row: number; message: string }[] = [];

  const dataStart = headerRowIdx + 1;
  const dataEnd = limit ? Math.min(rawData.length, dataStart + limit) : rawData.length;

  for (let i = dataStart; i < dataEnd; i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;

    // Parse date — try the DATE column first
    let dateVal: Date | null = null;
    if (dateIdx >= 0) {
      const raw = row[dateIdx];
      if (raw instanceof Date) {
        dateVal = raw;
      } else if (typeof raw === "number" && raw > 1000) {
        // Excel serial date
        const utcDays = Math.floor(raw - 25569);
        dateVal = new Date(utcDays * 86400 * 1000);
      } else {
        dateVal = parseDateFlexible(raw);
      }
    }

    // Skip rows with no date
    if (!dateVal) continue;

    const year = dateVal.getUTCFullYear();
    const month = dateVal.getUTCMonth() + 1;

    // Parse day of week from Zi column
    let dayOfWeek: string | null = null;
    if (ziIdx >= 0) {
      const raw = String(row[ziIdx] ?? "").trim();
      dayOfWeek = DAY_ABBREVS[raw] ?? (raw || null);
    }

    // Parse week number from SAPT column
    let week: number | null = null;
    if (saptIdx >= 0) {
      const raw = row[saptIdx];
      const num = parseNumeric(raw);
      if (num > 0) week = num;
    }

    // Extract 16 fields per location block
    const extractBlock = (startIdx: number): number[] => {
      const values: number[] = [];
      for (let c = startIdx + 1; c <= startIdx + 16; c++) {
        values.push(parseNumeric(row[c]));
      }
      return values;
    };

    const buildIncomeRow = (
      locCode: "MG" | "O",
      vals: number[]
    ): IncomeRow => ({
      date: dateVal!,
      dayOfWeek,
      month,
      week,
      year,
      locationCode: locCode,
      totalSales: vals[0],
      tva: vals[1],
      salesExVat: vals[2],
      receiptCount: vals[3],
      avgReceipt: vals[4],
      barSales: vals[5],
      barProductCount: vals[6],
      kitchenSales: vals[7],
      kitchenProductCount: vals[8],
      cashAmount: vals[9],
      cardAmount: vals[10],
      transferAmount: vals[11],
      accountAmount: vals[12],
      deliveryAmount: vals[13],
      tipsFiscal: vals[14],
      tipsTotal: vals[15],
    });

    // MAGNOLIA block
    if (mgIdx >= 0) {
      const mgVals = extractBlock(mgIdx);
      if (mgVals[0] !== 0) {
        rows.push(buildIncomeRow("MG", mgVals));
      }
    }

    // ORIZONT block
    if (oIdx >= 0) {
      const oVals = extractBlock(oIdx);
      if (oVals[0] !== 0) {
        rows.push(buildIncomeRow("O", oVals));
      }
    }
  }

  return { rows, errors };
}
