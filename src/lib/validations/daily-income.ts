import { z } from "zod/v4";

/**
 * Income sheet column layout (position-based, dual-location):
 *
 * Shared columns (before MAGNOLIA):
 *   LUNA | SAPT | DATE | Zi
 *
 * Per-location block (16 fields after the location header):
 *   totalSales, tva, salesExVat, receiptCount, avgReceipt,
 *   barSales, barProductCount, kitchenSales, kitchenProductCount,
 *   cashAmount, cardAmount, transferAmount, accountAmount, deliveryAmount,
 *   tipsFiscal, tipsTotal
 *
 * Then a "%" column (skipped).
 */

export const INCOME_FIELDS = [
  { key: "totalSales", label: "Vanzari totale" },
  { key: "tva", label: "TVA" },
  { key: "salesExVat", label: "Fara TVA" },
  { key: "receiptCount", label: "Nr. bonuri" },
  { key: "avgReceipt", label: "Cec mediu" },
  { key: "barSales", label: "Bar" },
  { key: "barProductCount", label: "Nr. produse Bar" },
  { key: "kitchenSales", label: "Bucatarie" },
  { key: "kitchenProductCount", label: "Nr. produse Bucatarie" },
  { key: "cashAmount", label: "Cash" },
  { key: "cardAmount", label: "Card" },
  { key: "transferAmount", label: "Virament" },
  { key: "accountAmount", label: "Cont" },
  { key: "deliveryAmount", label: "Livrator" },
  { key: "tipsFiscal", label: "Tips fiscal" },
  { key: "tipsTotal", label: "Tips total" },
] as const;

/** Preview columns shown in the income import table */
export const INCOME_PREVIEW_FIELDS = [
  { key: "date", label: "Data" },
  { key: "locationCode", label: "Locatie" },
  { key: "totalSales", label: "Vanzari" },
  { key: "receiptCount", label: "Nr. bonuri" },
  { key: "barSales", label: "Bar" },
  { key: "kitchenSales", label: "Bucatarie" },
  { key: "cashAmount", label: "Cash" },
  { key: "cardAmount", label: "Card" },
  { key: "tipsTotal", label: "Tips" },
] as const;

export const incomeImportRequestSchema = z.object({
  fileData: z.string(),
  sheetName: z.string(),
});

// ── CRUD schemas ───────────────────────────────────────────

export const dailyIncomeCreateSchema = z.object({
  locationId: z.string().min(1, "Locatia este obligatorie"),
  date: z.string().min(1, "Data este obligatorie"),
  totalSales: z.coerce.number().default(0),
  tva: z.coerce.number().default(0),
  salesExVat: z.coerce.number().default(0),
  receiptCount: z.coerce.number().int().default(0),
  avgReceipt: z.coerce.number().default(0),
  barSales: z.coerce.number().default(0),
  barProductCount: z.coerce.number().int().default(0),
  kitchenSales: z.coerce.number().default(0),
  kitchenProductCount: z.coerce.number().int().default(0),
  cashAmount: z.coerce.number().default(0),
  cardAmount: z.coerce.number().default(0),
  transferAmount: z.coerce.number().default(0),
  accountAmount: z.coerce.number().default(0),
  deliveryAmount: z.coerce.number().default(0),
  tipsFiscal: z.coerce.number().default(0),
  tipsTotal: z.coerce.number().default(0),
});

export const dailyIncomeUpdateSchema = dailyIncomeCreateSchema.partial();

export type DailyIncomeCreate = z.infer<typeof dailyIncomeCreateSchema>;
export type DailyIncomeUpdate = z.infer<typeof dailyIncomeUpdateSchema>;
