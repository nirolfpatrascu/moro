import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parse } from "date-fns";

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amount as RON currency.
 * No decimals unless amount < 100.
 */
export function formatCurrency(amount: number, currency = "RON"): string {
  const decimals = Math.abs(amount) < 100 ? 2 : 0;
  const formatted = new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `${formatted} ${currency}`;
}

/** Format a Date as DD/MM/YYYY (European format) */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy");
}

/** Parse a DD/MM/YYYY string into a Date */
export function parseDate(dateStr: string): Date {
  return parse(dateStr, "dd/MM/yyyy", new Date());
}

/**
 * Generate invoice number with prefix and zero-padded count.
 * e.g. generateInvoiceNumber("MG", 42) => "MG-0042"
 */
export function generateInvoiceNumber(prefix: string, count: number): string {
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

/** Romanian month names for selects */
export const MONTHS_RO = [
  "IANUARIE",
  "FEBRUARIE",
  "MARTIE",
  "APRILIE",
  "MAI",
  "IUNIE",
  "IULIE",
  "AUGUST",
  "SEPTEMBRIE",
  "OCTOMBRIE",
  "NOIEMBRIE",
  "DECEMBRIE",
] as const;

/** P&L category codes */
export const PL_CATEGORIES = ["COGS", "COSTFIX", "OPEX", "TAXE", "PEOPLE"] as const;
export type PlCategoryCode = (typeof PL_CATEGORIES)[number];
