import { z } from "zod/v4";

export const outgoingInvoiceCreateSchema = z.object({
  locationId: z.string().optional().nullable(),
  invoiceNumber: z.string().min(1, "Nr. factura este obligatoriu"),
  customerId: z.string().min(1, "Clientul este obligatoriu"),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  amountExVat: z.coerce.number().default(0),
  totalAmount: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().default(0),
  unpaidAmount: z.coerce.number().default(0),
  status: z.enum(["PAID", "UNPAID", "PARTIAL"]).default("UNPAID"),
  year: z.coerce.number().optional(),
  month: z.string().optional(),
  paymentYear: z.coerce.number().optional().nullable(),
  paymentMonth: z.string().optional().nullable(),
  paymentDay: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const outgoingInvoiceUpdateSchema = outgoingInvoiceCreateSchema.partial();

export const outgoingStatusUpdateSchema = z.object({
  status: z.enum(["PAID", "UNPAID", "PARTIAL"]),
  paidAmount: z.coerce.number().optional(),
  paymentYear: z.coerce.number().optional().nullable(),
  paymentMonth: z.string().optional().nullable(),
  paymentDay: z.coerce.number().optional().nullable(),
});

export const outgoingBulkStatusUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Selecteaza cel putin o factura"),
  status: z.enum(["PAID", "UNPAID", "PARTIAL"]),
});

export type OutgoingInvoiceCreate = z.infer<typeof outgoingInvoiceCreateSchema>;
export type OutgoingInvoiceUpdate = z.infer<typeof outgoingInvoiceUpdateSchema>;
export type OutgoingStatusUpdate = z.infer<typeof outgoingStatusUpdateSchema>;
export type OutgoingBulkStatusUpdate = z.infer<typeof outgoingBulkStatusUpdateSchema>;
