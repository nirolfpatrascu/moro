import { describe, it, expect } from "vitest";

/**
 * Invoice status derivation logic — mirrors the logic in
 * prisma/scripts/fix-data.ts and API route handlers.
 */
function deriveInvoiceStatus(totalAmount: number, paidAmount: number) {
  const remaining = Math.max(0, totalAmount - paidAmount);
  let status = "UNPAID";
  if (paidAmount > 0 && paidAmount >= totalAmount) {
    status = "PAID";
  } else if (paidAmount > 0) {
    status = "PARTIAL";
  }
  return { status, remaining };
}

describe("invoice status derivation", () => {
  it("UNPAID when paidAmount = 0", () => {
    const { status, remaining } = deriveInvoiceStatus(1000, 0);
    expect(status).toBe("UNPAID");
    expect(remaining).toBe(1000);
  });

  it("PARTIAL when 0 < paidAmount < totalAmount", () => {
    const { status, remaining } = deriveInvoiceStatus(1000, 400);
    expect(status).toBe("PARTIAL");
    expect(remaining).toBe(600);
  });

  it("PAID when paidAmount = totalAmount", () => {
    const { status, remaining } = deriveInvoiceStatus(1000, 1000);
    expect(status).toBe("PAID");
    expect(remaining).toBe(0);
  });

  it("PAID when paidAmount > totalAmount (overpayment)", () => {
    const { status, remaining } = deriveInvoiceStatus(1000, 1200);
    expect(status).toBe("PAID");
    expect(remaining).toBe(0);
  });

  it("remaining is never negative", () => {
    const { remaining } = deriveInvoiceStatus(500, 700);
    expect(remaining).toBeGreaterThanOrEqual(0);
  });

  it("handles zero totalAmount", () => {
    const { status, remaining } = deriveInvoiceStatus(0, 0);
    expect(status).toBe("UNPAID");
    expect(remaining).toBe(0);
  });
});
