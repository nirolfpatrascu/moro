import { describe, it, expect } from "vitest";
import { incomingInvoiceCreateSchema } from "../validations/incoming-invoice";
import { receiptCreateSchema } from "../validations/receipt";

describe("incomingInvoiceCreateSchema", () => {
  const validInvoice = {
    locationId: "loc-1",
    invoiceNumber: "FAC-001",
    supplierId: "sup-1",
    totalAmount: 1000,
  };

  it("accepts valid invoice", () => {
    const result = incomingInvoiceCreateSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it("rejects totalAmount = 0", () => {
    const result = incomingInvoiceCreateSchema.safeParse({
      ...validInvoice,
      totalAmount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative totalAmount", () => {
    const result = incomingInvoiceCreateSchema.safeParse({
      ...validInvoice,
      totalAmount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing invoiceNumber", () => {
    const result = incomingInvoiceCreateSchema.safeParse({
      ...validInvoice,
      invoiceNumber: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing supplierId", () => {
    const result = incomingInvoiceCreateSchema.safeParse({
      ...validInvoice,
      supplierId: "",
    });
    expect(result.success).toBe(false);
  });

  it("defaults status to UNPAID", () => {
    const result = incomingInvoiceCreateSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("UNPAID");
    }
  });

  it("defaults paidAmount to 0", () => {
    const result = incomingInvoiceCreateSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paidAmount).toBe(0);
    }
  });

  it("coerces string totalAmount to number", () => {
    const result = incomingInvoiceCreateSchema.safeParse({
      ...validInvoice,
      totalAmount: "1500",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalAmount).toBe(1500);
    }
  });
});

describe("receiptCreateSchema", () => {
  const validReceipt = {
    locationId: "loc-1",
    date: "2026-03-04",
    amount: 150,
  };

  it("accepts valid receipt", () => {
    const result = receiptCreateSchema.safeParse(validReceipt);
    expect(result.success).toBe(true);
  });

  it("defaults type to SALE", () => {
    const result = receiptCreateSchema.safeParse(validReceipt);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("SALE");
    }
  });

  it("defaults paymentMethod to CASH", () => {
    const result = receiptCreateSchema.safeParse(validReceipt);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentMethod).toBe("CASH");
    }
  });

  it("rejects negative amount", () => {
    const result = receiptCreateSchema.safeParse({
      ...validReceipt,
      amount: -10,
    });
    expect(result.success).toBe(false);
  });
});
