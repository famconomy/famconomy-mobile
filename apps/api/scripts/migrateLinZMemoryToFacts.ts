import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateLinZMemoryToFacts() {
  const memories = await prisma.linZMemory.findMany();
  for (const memory of memories) {
    // Check if fact already exists
  // Use linZFacts (capital Z and F) as per Prisma client
  const existing = await prisma.linZFacts.findFirst({
      where: {
        familyId: memory.familyId,
        userId: memory.userId ?? undefined,
        key: memory.key,
      },
    });
    if (!existing) {
  await prisma.linZFacts.create({
        data: {
          familyId: memory.familyId,
          userId: memory.userId ?? undefined,
          key: memory.key,
          value: memory.value, // Optionally parse to JSON if needed
          confidence: 0.9,
          source: 'migration_from_memory',
        },
      });
    }
  }
  console.log('Migration complete.');
}

migrateLinZMemoryToFacts()
  // If you see a 'Cannot find name process' error, run: npm install --save-dev @types/node
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
