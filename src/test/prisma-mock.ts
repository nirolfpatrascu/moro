import { vi } from "vitest";

export const prismaMock = {
  dailyIncome: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  incomingInvoice: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  outgoingInvoice: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  location: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  supplier: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  customer: {
    findMany: vi.fn(),
  },
  receipt: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
