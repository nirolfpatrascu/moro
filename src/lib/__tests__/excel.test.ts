import { describe, it, expect } from "vitest";
import { parseNumeric, parseDateFlexible, excelSerialToDateString } from "../excel";

describe("parseNumeric", () => {
  it("handles European format 1.000,50 → 1000.50", () => {
    expect(parseNumeric("1.000,50")).toBe(1000.5);
  });

  it("handles European format with comma decimal 1,50 → 1.50", () => {
    expect(parseNumeric("1,50")).toBe(1.5);
  });

  it("handles US format 1000.50 → 1000.50", () => {
    expect(parseNumeric("1000.50")).toBe(1000.5);
  });

  it("handles empty string → 0", () => {
    expect(parseNumeric("")).toBe(0);
  });

  it("handles number passthrough", () => {
    expect(parseNumeric(42)).toBe(42);
    expect(parseNumeric(3.14)).toBe(3.14);
  });

  it("handles null/undefined → 0", () => {
    expect(parseNumeric(null)).toBe(0);
    expect(parseNumeric(undefined)).toBe(0);
  });

  it("handles large European format 1.234.567,89", () => {
    expect(parseNumeric("1.234.567,89")).toBe(1234567.89);
  });

  it("handles integer-only string", () => {
    expect(parseNumeric("500")).toBe(500);
  });

  it("strips currency symbols and whitespace", () => {
    expect(parseNumeric("1.000,50 RON")).toBe(1000.5);
  });
});

describe("parseDateFlexible", () => {
  it("parses DD/MM/YYYY format", () => {
    const date = parseDateFlexible("15/03/2026");
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(2); // 0-based
    expect(date!.getDate()).toBe(15);
  });

  it("parses DD.MM.YYYY format", () => {
    const date = parseDateFlexible("01.12.2025");
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2025);
    expect(date!.getMonth()).toBe(11);
    expect(date!.getDate()).toBe(1);
  });

  it("parses YYYY-MM-DD (ISO) format", () => {
    const date = parseDateFlexible("2026-03-15");
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(2);
    expect(date!.getDate()).toBe(15);
  });

  it("returns null for empty string", () => {
    expect(parseDateFlexible("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseDateFlexible("   ")).toBeNull();
  });

  it("passes through Date objects", () => {
    const d = new Date(2026, 2, 15);
    expect(parseDateFlexible(d)).toBe(d);
  });

  it("handles Excel serial date numbers", () => {
    // Excel serial 44636 = 2022-03-15
    const date = parseDateFlexible(44636);
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2022);
  });

  it("returns null for non-date values", () => {
    expect(parseDateFlexible(null)).toBeNull();
    expect(parseDateFlexible(undefined)).toBeNull();
  });
});

describe("excelSerialToDateString", () => {
  it("converts serial to DD/MM/YYYY string", () => {
    // Serial 45000 = 2023-02-18
    const result = excelSerialToDateString(45000);
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("handles known date serial", () => {
    // Serial 44927 = 2023-01-01 (25569 is Unix epoch offset)
    const result = excelSerialToDateString(44927);
    expect(result).toBe("01/01/2023");
  });
});
