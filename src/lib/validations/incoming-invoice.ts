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

export const invoiceStatusUpdateSchema = z.object({
  status: z.enum(["PAID", "UNPAID", "PARTIAL"]),
  paidAmount: z.coerce.number().optional(),
  paymentYear: z.coerce.number().optional().nullable(),
  paymentMonth: z.string().optional().nullable(),
  paymentDay: z.coerce.number().optional().nullable(),
});

export const bulkStatusUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Selecteaza cel putin o factura"),
  status: z.enum(["PAID", "UNPAID", "PARTIAL"]),
});

export type IncomingInvoiceCreate = z.infer<typeof incomingInvoiceCreateSchema>;
export type IncomingInvoiceUpdate = z.infer<typeof incomingInvoiceUpdateSchema>;
export type InvoiceStatusUpdate = z.infer<typeof invoiceStatusUpdateSchema>;
export type BulkStatusUpdate = z.infer<typeof bulkStatusUpdateSchema>;

// ── Import column mapping ──────────────────────────────────
// Maps DB field names to Excel column headers (19 fields matching INTRARE FACTURI)
export const columnMappingSchema = z.object({
  location: z.string().optional(),
  year: z.string().optional(),
  month: z.string().optional(),
  plCategory: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  invoiceNumber: z.string().optional(),
  supplierName: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  amountExVat: z.string().optional(),
  vatAmount: z.string().optional(),
  totalAmount: z.string().optional(),
  paidAmount: z.string().optional(),
  paymentYear: z.string().optional(),
  paymentMonth: z.string().optional(),
  paymentDay: z.string().optional(),
  remainingAmount: z.string().optional(),
  notes: z.string().optional(),
});

export type ColumnMapping = z.infer<typeof columnMappingSchema>;

// ── DB field definitions for the mapping UI ────────────────
export const DB_FIELDS = [
  { key: "location", label: "Locatie", required: true },
  { key: "year", label: "An", required: true },
  { key: "month", label: "Luna", required: true },
  { key: "plCategory", label: "Categorie P&L", required: true },
  { key: "category", label: "Categorie", required: true },
  { key: "subcategory", label: "Subcategorie", required: false },
  { key: "invoiceNumber", label: "Nr. Factura", required: true },
  { key: "supplierName", label: "Furnizor", required: true },
  { key: "issueDate", label: "Data Emitere", required: false },
  { key: "dueDate", label: "Scadenta", required: false },
  { key: "amountExVat", label: "Suma fara TVA", required: false },
  { key: "vatAmount", label: "Val TVA", required: false },
  { key: "totalAmount", label: "Suma de plata", required: true },
  { key: "paidAmount", label: "Achitati", required: false },
  { key: "paymentYear", label: "An Plata", required: false },
  { key: "paymentMonth", label: "Luna Plata", required: false },
  { key: "paymentDay", label: "Zi Plata", required: false },
  { key: "remainingAmount", label: "De plata", required: false },
  { key: "notes", label: "Observatii", required: false },
] as const;

// ── Auto-mapping keywords ──────────────────────────────────
// Used to automatically suggest mappings between Excel headers and DB fields
const AUTO_MAP_KEYWORDS: Record<string, string[]> = {
  location: ["locatie", "location", "magazin", "loc"],
  year: ["an"],
  month: ["luna"],
  plCategory: ["categorie p&l", "categorie p & l", "p&l", "pl categorie"],
  category: ["categorie"],
  subcategory: ["subcategorie", "sub categorie"],
  invoiceNumber: ["nr factura", "nr. factura", "numar factura", "invoice no", "invoice number", "factura", "invoice", "nr."],
  supplierName: ["denumire firma", "furnizor", "supplier name", "supplier", "firma"],
  issueDate: ["data emitere", "emitere", "issue date"],
  dueDate: ["scadenta", "scadenta", "due"],
  amountExVat: ["suma fara tva", "fara tva", "ex vat"],
  vatAmount: ["val tva", "tva"],
  totalAmount: ["suma de plata", "total", "suma"],
  paidAmount: ["achitati", "achitat", "paid"],
  paymentYear: ["an plata"],
  paymentMonth: ["luna plata"],
  paymentDay: ["data"],
  remainingAmount: ["de plata", "rest", "remaining"],
  notes: ["obs", "observ", "note", "comentar"],
};

export function autoMapColumns(excelHeaders: string[]): ColumnMapping {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  // Sort fields by keyword specificity (longer keywords first) to avoid
  // generic keywords like "an" matching before "an plata"
  const fieldsBySpecificity = Object.entries(AUTO_MAP_KEYWORDS).sort(
    (a, b) => {
      const maxA = Math.max(...a[1].map((k) => k.length));
      const maxB = Math.max(...b[1].map((k) => k.length));
      return maxB - maxA;
    }
  );

  for (const [field, keywords] of fieldsBySpecificity) {
    for (const header of excelHeaders) {
      if (usedHeaders.has(header)) continue;
      const headerLower = header.toLowerCase().trim();
      const match = keywords.some(
        (kw) => headerLower === kw || headerLower.includes(kw)
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
  location: z.string().min(1, "Locatie obligatorie"),
  year: z.union([z.string(), z.number()]).optional().nullable(),
  month: z.union([z.string(), z.number()]).optional().nullable(),
  plCategory: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  invoiceNumber: z.string().min(1, "Nr. factura obligatoriu"),
  supplierName: z.string().min(1, "Furnizor obligatoriu"),
  issueDate: z.union([z.string(), z.number()]).optional().nullable(),
  dueDate: z.union([z.string(), z.number()]).optional().nullable(),
  amountExVat: z.coerce.number().optional().default(0),
  vatAmount: z.coerce.number().optional().default(0),
  totalAmount: z.coerce.number().default(0),
  paidAmount: z.coerce.number().optional().default(0),
  paymentYear: z.union([z.string(), z.number()]).optional().nullable(),
  paymentMonth: z.union([z.string(), z.number()]).optional().nullable(),
  paymentDay: z.union([z.string(), z.number()]).optional().nullable(),
  remainingAmount: z.coerce.number().optional().default(0),
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
