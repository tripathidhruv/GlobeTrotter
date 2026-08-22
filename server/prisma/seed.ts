import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const paris = await prisma.city.create({
    data: { name: "Paris", country: "France", region: "Europe", costIndex: 80, popularityScore: 95 },
  });
  const tokyo = await prisma.city.create({
    data: { name: "Tokyo", country: "Japan", region: "Asia", costIndex: 75, popularityScore: 90 },
  });
  await prisma.activity.createMany({
    data: [
      { cityId: paris.id, name: "Louvre Museum", category: "sightseeing", estCost: 20, estDurationMinutes: 180 },
      { cityId: paris.id, name: "Seine River Cruise", category: "leisure", estCost: 15, estDurationMinutes: 60 },
      { cityId: tokyo.id, name: "Senso-ji Temple", category: "sightseeing", estCost: 0, estDurationMinutes: 90 },
      { cityId: tokyo.id, name: "Tsukiji Food Tour", category: "food", estCost: 40, estDurationMinutes: 120 },
    ],
  });
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
