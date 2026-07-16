import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⚠️  ATTENTION : Cette opération est IRRÉVERSIBLE.\n");

  const ticketCount = await prisma.ticket.deleteMany();
  console.log(`  ✗ Tickets supprimés : ${ticketCount.count}`);

  const orderCount = await prisma.order.deleteMany();
  console.log(`  ✗ Commandes supprimées : ${orderCount.count}`);

  console.log("\n✅ Tables vidées. Les événements, catégories et configurations sont intacts.");
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
