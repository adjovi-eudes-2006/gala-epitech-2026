import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const svgCover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d4a017"/>
      <stop offset="100%" stop-color="#f5d742"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="600" cy="315" r="200" fill="none" stroke="url(#gold)" stroke-width="1" opacity="0.15"/>
  <circle cx="600" cy="315" r="160" fill="none" stroke="url(#gold)" stroke-width="0.5" opacity="0.1"/>
  <text x="600" y="260" text-anchor="middle" font-family="Georgia, serif" font-size="64" font-weight="bold" fill="url(#gold)" letter-spacing="8">GALA</text>
  <text x="600" y="320" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#d4a017" letter-spacing="6">ÉDITION PRESTIGE</text>
  <text x="600" y="370" text-anchor="middle" font-family="system-ui" font-size="16" fill="#666" letter-spacing="4">2026</text>
  <line x1="400" y1="400" x2="800" y2="400" stroke="url(#gold)" stroke-width="0.5" opacity="0.3"/>
  <text x="600" y="440" text-anchor="middle" font-family="system-ui" font-size="12" fill="#444" letter-spacing="2">Palais des Congrès · Cotonou</text>
</svg>`;

const base64Cover = Buffer.from(svgCover).toString("base64");
const dataUriCover = `data:image/svg+xml;base64,${base64Cover}`;

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.event.deleteMany();

  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 30);

  const event = await prisma.event.create({
    data: {
      title: "Grand Bal de Gala Epitech 2026 — Édition Prestige",
      description:
        "La soirée de gala annuelle Epitech revient pour une édition 2026 exceptionnelle. Au programme : cocktail prestige, dîner gastronomique, live band, dancefloor et remise des trophées. Code vestimentaire : tenue de soirée exigée.",
      date: eventDate,
      location: "Palais des Congrès, Cotonou",
      coverImage: dataUriCover,
    },
  });

  console.log(`✅ Event created: ${event.title}`);

  const standard = await prisma.ticketCategory.create({
    data: {
      eventId: event.id,
      name: "Pass Standard",
      price: 5000,
      maxQuantity: 150,
    },
  });

  const vip = await prisma.ticketCategory.create({
    data: {
      eventId: event.id,
      name: "Pass VIP",
      price: 15000,
      maxQuantity: 50,
    },
  });

  const prestige = await prisma.ticketCategory.create({
    data: {
      eventId: event.id,
      name: "Table Prestige (8 personnes)",
      price: 100000,
      maxQuantity: 10,
    },
  });

  console.log("✅ Categories created: Standard (5000 FCFA), VIP (15000 FCFA), Table Prestige (100000 FCFA)");

  const order1 = await prisma.order.create({
    data: {
      eventId: event.id,
      buyerName: "Koffi Amadou",
      buyerEmail: "koffi.amadou@example.com",
      buyerPhone: "+22961234567",
      referenceMomo: "REF9A2B3C77",
      totalAmount: 20000,
      status: "PENDING",
    },
  });

  await prisma.ticket.createMany({
    data: [
      { orderId: order1.id, categoryId: standard.id, secureToken: crypto.randomBytes(32).toString("hex") },
      { orderId: order1.id, categoryId: standard.id, secureToken: crypto.randomBytes(32).toString("hex") },
      { orderId: order1.id, categoryId: standard.id, secureToken: crypto.randomBytes(32).toString("hex") },
      { orderId: order1.id, categoryId: vip.id, secureToken: crypto.randomBytes(32).toString("hex") },
    ],
  });

  const order2 = await prisma.order.create({
    data: {
      eventId: event.id,
      buyerName: "Aïchatou Diallo",
      buyerEmail: "aichatou.diallo@example.com",
      buyerPhone: "+22997876543",
      referenceMomo: "REF4D5E6F88",
      totalAmount: 100000,
      status: "PENDING",
    },
  });

  await prisma.ticket.createMany({
    data: [
      { orderId: order2.id, categoryId: prestige.id, secureToken: crypto.randomBytes(32).toString("hex") },
    ],
  });

  console.log("✅ Test orders created:");
  console.log("   - Koffi Amadou (4 tickets, 20 000 FCFA, ref: REF9A2B3C77)");
  console.log("   - Aïchatou Diallo (1 table prestige, 100 000 FCFA, ref: REF4D5E6F88)");
  console.log("🌱 Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
