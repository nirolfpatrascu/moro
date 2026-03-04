/**
 * Data cleanup script — Sprint 0, Phase 0.7
 *
 * Recalculates remainingAmount and fixes status for all existing invoices.
 * Run with: npx tsx prisma/scripts/fix-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting data cleanup...\n");

  // Fix incoming invoices
  const incoming = await prisma.incomingInvoice.findMany();
  let fixedIncoming = 0;

  for (const inv of incoming) {
    const total = Number(inv.totalAmount);
    const paid = Number(inv.paidAmount);
    const correctRemaining = Math.max(0, total - paid);

    let correctStatus = "UNPAID";
    if (paid > 0 && paid >= total) {
      correctStatus = "PAID";
    } else if (paid > 0) {
      correctStatus = "PARTIAL";
    }

    const currentRemaining = Number(inv.remainingAmount);
    if (currentRemaining !== correctRemaining || inv.status !== correctStatus) {
      await prisma.incomingInvoice.update({
        where: { id: inv.id },
        data: { remainingAmount: correctRemaining, status: correctStatus },
      });
      fixedIncoming++;
      if (fixedIncoming <= 5) {
        console.log(
          `  [incoming] ${inv.invoiceNumber}: remaining ${currentRemaining} → ${correctRemaining}, status ${inv.status} → ${correctStatus}`
        );
      }
    }
  }
  console.log(`Fixed ${fixedIncoming} / ${incoming.length} incoming invoices`);

  // Fix outgoing invoices
  const outgoing = await prisma.outgoingInvoice.findMany();
  let fixedOutgoing = 0;

  for (const inv of outgoing) {
    const total = Number(inv.totalAmount);
    const paid = Number(inv.paidAmount);
    const correctUnpaid = Math.max(0, total - paid);

    let correctStatus = "UNPAID";
    if (paid > 0 && paid >= total) {
      correctStatus = "PAID";
    } else if (paid > 0) {
      correctStatus = "PARTIAL";
    }

    const currentUnpaid = Number(inv.unpaidAmount);
    if (currentUnpaid !== correctUnpaid || inv.status !== correctStatus) {
      await prisma.outgoingInvoice.update({
        where: { id: inv.id },
        data: { unpaidAmount: correctUnpaid, status: correctStatus },
      });
      fixedOutgoing++;
      if (fixedOutgoing <= 5) {
        console.log(
          `  [outgoing] ${inv.invoiceNumber}: unpaid ${currentUnpaid} → ${correctUnpaid}, status ${inv.status} → ${correctStatus}`
        );
      }
    }
  }
  console.log(`Fixed ${fixedOutgoing} / ${outgoing.length} outgoing invoices`);

  console.log("\nDone.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
