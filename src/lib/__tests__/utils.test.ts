import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, monthIndex, MONTHS_RO } from "../utils";

describe("formatCurrency", () => {
  it("formats large amounts without decimals", () => {
    expect(formatCurrency(1500)).toContain("1.500");
    expect(formatCurrency(1500)).toContain("RON");
  });

  it("formats small amounts with decimals", () => {
    expect(formatCurrency(42.5)).toContain("42,50");
  });

  it("uses custom currency", () => {
    expect(formatCurrency(100, "EUR")).toContain("EUR");
  });
});

describe("monthIndex", () => {
  it("maps all 12 Romanian month names correctly", () => {
    const expected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    MONTHS_RO.forEach((month, i) => {
      expect(monthIndex(month)).toBe(expected[i]);
    });
  });

  it("is case-insensitive", () => {
    expect(monthIndex("ianuarie")).toBe(0);
    expect(monthIndex("Decembrie")).toBe(11);
  });

  it("returns -1 for unknown month", () => {
    expect(monthIndex("INVALID")).toBe(-1);
    expect(monthIndex("")).toBe(-1);
  });
});

describe("formatDate", () => {
  it("formats Date object as DD/MM/YYYY", () => {
    const result = formatDate(new Date(2026, 2, 15)); // March 15, 2026
    expect(result).toBe("15/03/2026");
  });

  it("formats ISO string as DD/MM/YYYY", () => {
    const result = formatDate("2026-03-15T00:00:00.000Z");
    expect(result).toBe("15/03/2026");
  });
});
