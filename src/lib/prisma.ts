import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Convert Prisma Decimal fields to plain numbers for JSON serialization.
 * Without this, Decimal fields serialize as objects like {"s":1,"e":2,"d":[123,45]}
 * instead of plain numbers like 123.45.
 */
export function serializeDecimal<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (data instanceof Prisma.Decimal) return Number(data) as unknown as T;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) return data.map(serializeDecimal) as unknown as T;
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = serializeDecimal(value);
    }
    return result as T;
  }
  return data;
}