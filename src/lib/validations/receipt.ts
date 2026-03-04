import { z } from "zod/v4";

export const receiptCreateSchema = z.object({
  locationId: z.string().min(1, "Locatia este obligatorie"),
  date: z.string().min(1, "Data este obligatorie"),
  type: z.enum(["SALE", "REFUND", "EXPENSE"]).default("SALE"),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  amount: z.coerce.number().min(0, "Suma trebuie sa fie pozitiva"),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]).default("CASH"),
  receiptNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const receiptUpdateSchema = receiptCreateSchema.partial();

export const receiptQuickCreateSchema = z.object({
  locationId: z.string().min(1, "Locatia este obligatorie"),
  amount: z.coerce.number().min(0, "Suma trebuie sa fie pozitiva"),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]).default("CASH"),
  date: z.string().optional(),
  type: z.enum(["SALE", "REFUND", "EXPENSE"]).default("SALE"),
});

export type ReceiptCreate = z.infer<typeof receiptCreateSchema>;
export type ReceiptUpdate = z.infer<typeof receiptUpdateSchema>;
export type ReceiptQuickCreate = z.infer<typeof receiptQuickCreateSchema>;

export const RECEIPT_TYPES = [
  { value: "SALE", label: "Vanzare", variant: "success" as const },
  { value: "REFUND", label: "Retur", variant: "warning" as const },
  { value: "EXPENSE", label: "Cheltuiala", variant: "danger" as const },
];

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "TRANSFER", label: "Transfer" },
];

export const RECEIPT_CATEGORIES = ["BAR", "BUCATARIE", "LIVRARE", "CATERING", "DIVERSE"];
