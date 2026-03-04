import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Locations ──────────────────────────────────────────────
  const magnolia = await prisma.location.upsert({
    where: { code: "MG" },
    update: {},
    create: {
      code: "MG",
      name: "MAGNOLIA",
      address: "Str. Magnoliei nr. 10, Cluj-Napoca",
    },
  });

  const orizont = await prisma.location.upsert({
    where: { code: "O" },
    update: {},
    create: {
      code: "O",
      name: "ORIZONT",
      address: "Str. Orizontului nr. 5, Cluj-Napoca",
    },
  });

  console.log(`  Locations: ${magnolia.name}, ${orizont.name}`);

  // ── Suppliers ──────────────────────────────────────────────
  const supplierNames = [
    "METRO Cash & Carry",
    "SELGROS",
    "Distribuitorul de Cafea SRL",
    "Fresh Dairy Products SRL",
    "Panificatie Moderna SA",
  ];

  const suppliers = [];
  for (const name of supplierNames) {
    const s = await prisma.supplier.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    suppliers.push(s);
  }
  console.log(`  Suppliers: ${suppliers.length} created`);

  // ── Customers ──────────────────────────────────────────────
  const customerNames = [
    "Corporate Events SRL",
    "Hotel Napoca SA",
    "Office Catering SRL",
    "Universitatea Babes-Bolyai",
    "Tech Hub Cluj SRL",
  ];

  const customers = [];
  for (const name of customerNames) {
    const c = await prisma.customer.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    customers.push(c);
  }
  console.log(`  Customers: ${customers.length} created`);

  // ── P&L Categories ─────────────────────────────────────────
  const plCategories = [
    { code: "COGS", name: "Cost of Goods Sold", sortOrder: 1 },
    { code: "PEOPLE", name: "Personal", sortOrder: 2 },
    { code: "OPEX", name: "Cheltuieli Operationale", sortOrder: 3 },
    { code: "COSTFIX", name: "Costuri Fixe", sortOrder: 4 },
    { code: "TAXE", name: "Taxe si Impozite", sortOrder: 5 },
  ];

  for (const cat of plCategories) {
    await prisma.plCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: { code: cat.code, name: cat.name, sortOrder: cat.sortOrder },
    });
  }
  console.log(`  P&L Categories: ${plCategories.length}`);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
