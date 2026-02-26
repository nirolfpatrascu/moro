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
    {
      code: "COGS",
      name: "Cost of Goods Sold",
      sortOrder: 1,
      subs: [
        { code: "BAR", name: "Bar", sortOrder: 1 },
        { code: "BUCATARIE", name: "Bucatarie", sortOrder: 2 },
        { code: "CONSUMABILE", name: "Consumabile", sortOrder: 3 },
        { code: "TRANSPORT", name: "Transport", sortOrder: 4 },
        { code: "LIVRARE", name: "Comision Livrare", sortOrder: 5 },
      ],
    },
    {
      code: "PEOPLE",
      name: "Personal",
      sortOrder: 2,
      subs: [
        { code: "SALARII_NET", name: "Salarii Nete", sortOrder: 1 },
        { code: "TAXE_SALARIALE", name: "Taxe Salariale", sortOrder: 2 },
        { code: "TICHETE_MASA", name: "Tichete de Masa", sortOrder: 3 },
        { code: "COLABORATORI", name: "Colaboratori", sortOrder: 4 },
      ],
    },
    {
      code: "OPEX",
      name: "Cheltuieli Operationale",
      sortOrder: 3,
      subs: [
        { code: "LICENTE", name: "Licente", sortOrder: 1 },
        { code: "CONTABILITATE", name: "Contabilitate", sortOrder: 2 },
        { code: "MARKETING", name: "Marketing", sortOrder: 3 },
        { code: "DIVERSE", name: "Diverse", sortOrder: 4 },
      ],
    },
    {
      code: "COSTFIX",
      name: "Costuri Fixe",
      sortOrder: 4,
      subs: [
        { code: "CHIRII", name: "Chirii", sortOrder: 1 },
        { code: "UTILITATI", name: "Utilitati", sortOrder: 2 },
        { code: "BANCA", name: "Comisioane Bancare", sortOrder: 3 },
      ],
    },
    {
      code: "TAXE",
      name: "Taxe si Impozite",
      sortOrder: 5,
      subs: [
        { code: "IMPOZIT_VENIT", name: "Impozit pe Venit", sortOrder: 1 },
        { code: "TVA", name: "TVA de Plata", sortOrder: 2 },
        { code: "ALTE_TAXE", name: "Alte Taxe", sortOrder: 3 },
      ],
    },
  ];

  for (const cat of plCategories) {
    const created = await prisma.plCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: {
        code: cat.code,
        name: cat.name,
        sortOrder: cat.sortOrder,
      },
    });

    for (const sub of cat.subs) {
      await prisma.plSubcategory.upsert({
        where: {
          categoryId_code: { categoryId: created.id, code: sub.code },
        },
        update: { name: sub.name, sortOrder: sub.sortOrder },
        create: {
          categoryId: created.id,
          code: sub.code,
          name: sub.name,
          sortOrder: sub.sortOrder,
        },
      });
    }
  }
  console.log(`  P&L Categories: ${plCategories.length} with subcategories`);

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
