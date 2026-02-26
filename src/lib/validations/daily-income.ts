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
