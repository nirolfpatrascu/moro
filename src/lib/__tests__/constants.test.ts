import { describe, it, expect } from "vitest";
import { VAT_RATE, VAT_MULTIPLIER } from "../constants";

describe("VAT constants", () => {
  it("VAT_RATE is 19%", () => {
    expect(VAT_RATE).toBe(0.19);
  });

  it("VAT_MULTIPLIER is 1.19", () => {
    expect(VAT_MULTIPLIER).toBe(1.19);
  });

  it("totalAmount / VAT_MULTIPLIER produces correct exVat for known values", () => {
    // 119 RON total → 100 RON ex VAT
    expect(119 / VAT_MULTIPLIER).toBeCloseTo(100, 2);

    // 1190 RON total → 1000 RON ex VAT
    expect(1190 / VAT_MULTIPLIER).toBeCloseTo(1000, 2);

    // 59.50 RON total → 50 RON ex VAT
    expect(59.5 / VAT_MULTIPLIER).toBeCloseTo(50, 2);
  });

  it("amountExVat * VAT_MULTIPLIER produces correct totalAmount", () => {
    expect(100 * VAT_MULTIPLIER).toBeCloseTo(119, 2);
    expect(1000 * VAT_MULTIPLIER).toBeCloseTo(1190, 2);
  });
});
