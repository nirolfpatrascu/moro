import { z } from "zod/v4";

// ── CRUD schemas ───────────────────────────────────────────
export const incomingInvoiceCreateSchema = z.object({
  locationId: z.string().min(1, "Locatia este obligatorie"),
  invoiceNumber: z.string().min(1, "Nr. factura este obligatoriu"),
  supplierId: z.string().min(1, "Furnizorul este obligatoriu"),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  itemDescription: z.string().optional().nullable(),
  qty: z.coerce.number().min(0).default(0),
  unitPrice: z.coerce.number().min(0).default(0),
  totalAmount: z.coerce.number().min(0).default(0),
  status: z.enum(["PAID", "UNPAID", "PARTIAL"]).default("UNPAID"),
  notes: z.string().optional().nullable(),
  // P&L fields — optional, can be assigned later
  year: z.coerce.number().optional(),
  month: z.string().optional(),
  plCategory: z.string().default("COGS"),
  category: z.string().default("GENERAL"),
  subcategory: z.string().optional().nullable(),
  amountExVat: z.coerce.number().default(0),
  vatAmount: z.coerce.number().default(0),
  paidAmount: z.coerce.number().default(0),
  remainingAmount: z.coerce.number().default(0),
  paymentYear: z.coerce.number().optional().nullable(),
  paymentMonth: z.string().optional().nullable(),
  paymentDay: z.coerce.number().optional().nullable(),
});

export const incomingInvoiceUpdateSchema = incomingInvoiceCreateSchema.partial();

export type IncomingInvoiceCreate = z.infer<typeof incomingInvoiceCreateSchema>;
export type IncomingInvoiceUpdate = z.infer<typeof incomingInvoiceUpdateSchema>;

// ── Import column mapping ──────────────────────────────────
// Maps DB field names to Excel column headers
export const columnMappingSchema = z.object({
  invoiceNumber: z.string().optional(),
  supplierName: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  itemDescription: z.string().optional(),
  qty: z.string().optional(),
  unitPrice: z.string().optional(),
  total: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export type ColumnMapping = z.infer<typeof columnMappingSchema>;

// ── DB field definitions for the mapping UI ────────────────
export const DB_FIELDS = [
  { key: "invoiceNumber", label: "Nr. Factura", required: true },
  { key: "supplierName", label: "Furnizor", required: true },
  { key: "date", label: "Data Emitere", required: false },
  { key: "dueDate", label: "Scadenta", required: false },
  { key: "itemDescription", label: "Descriere", required: false },
  { key: "qty", label: "Cantitate", required: false },
  { key: "unitPrice", label: "Pret Unitar", required: false },
  { key: "total", label: "Total", required: true },
  { key: "status", label: "Status", required: false },
  { key: "location", label: "Locatie", required: true },
  { key: "notes", label: "Observatii", required: false },
] as const;

// ── Auto-mapping keywords ──────────────────────────────────
// Used to automatically suggest mappings between Excel headers and DB fields
const AUTO_MAP_KEYWORDS: Record<string, string[]> = {
  invoiceNumber: ["invoice", "factura", "nr", "number", "no"],
  supplierName: ["supplier", "furnizor", "vendor", "firma"],
  date: ["date", "data", "emitere", "issue"],
  dueDate: ["due", "scadent", "termen"],
  itemDescription: ["description", "descriere", "item", "articol", "produs"],
  qty: ["qty", "quantity", "cantitate", "buc"],
  unitPrice: ["unit price", "pret", "price", "unitar"],
  total: ["total", "suma", "amount", "valoare"],
  status: ["status", "stare", "plat"],
  location: ["location", "locatie", "loc", "magazin"],
  notes: ["notes", "obs", "observ", "note", "comentar"],
};

export function autoMapColumns(excelHeaders: string[]): ColumnMapping {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  for (const [field, keywords] of Object.entries(AUTO_MAP_KEYWORDS)) {
    for (const header of excelHeaders) {
      if (usedHeaders.has(header)) continue;
      const headerLower = header.toLowerCase().trim();
      const match = keywords.some(
        (kw) => headerLower.includes(kw) || headerLower === kw
      );
      if (match) {
        mapping[field] = header;
        usedHeaders.add(header);
        break;
      }
    }
  }

  return mapping as ColumnMapping;
}

// ── Import row validation ──────────────────────────────────
export const importRowSchema = z.object({
  invoiceNumber: z.string().min(1, "Nr. factura obligatoriu"),
  supplierName: z.string().min(1, "Furnizor obligatoriu"),
  date: z.union([z.string(), z.number()]).optional().nullable(),
  dueDate: z.union([z.string(), z.number()]).optional().nullable(),
  itemDescription: z.string().optional().nullable(),
  qty: z.coerce.number().optional().default(0),
  unitPrice: z.coerce.number().optional().default(0),
  total: z.coerce.number().default(0),
  status: z.string().optional().default("Unpaid"),
  location: z.string().min(1, "Locatie obligatorie"),
  notes: z.string().optional().nullable(),
});

export type ImportRow = z.infer<typeof importRowSchema>;

// ── Import request schemas ─────────────────────────────────
export const importUploadResponseSchema = z.object({
  sheets: z.array(
    z.object({
      name: z.string(),
      headers: z.array(z.string()),
      rowCount: z.number(),
    })
  ),
  fileData: z.string(), // base64
});

export const importPreviewRequestSchema = z.object({
  fileData: z.string(),
  sheetName: z.string(),
  mapping: columnMappingSchema,
});

export const importCommitRequestSchema = z.object({
  fileData: z.string(),
  sheetName: z.string(),
  mapping: columnMappingSchema,
  duplicateStrategy: z.enum(["skip", "rename"]).default("skip"),
});
