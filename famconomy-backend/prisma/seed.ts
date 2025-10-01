import { PrismaClient } from '@prisma/client';
import * as gigData from './gigs.json';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // 1. Clear the database
  await prisma.claim.deleteMany({});
  await prisma.rewardLedger.deleteMany({});
  await prisma.familyGig.deleteMany({});
  await prisma.familyRoom.deleteMany({});
  await prisma.gigTemplate.deleteMany({});
  await prisma.roomTemplate.deleteMany({});
  await prisma.familyUsers.deleteMany({});
  await prisma.users.deleteMany({});
  await prisma.family.deleteMany({});
  await prisma.linZFacts.deleteMany({});
  await prisma.linZMemory.deleteMany({});
  await prisma.linZConversation.deleteMany({});
  console.log('Cleared existing data.');

  // 2. Create universal templates
  for (const room of gigData.rooms) {
    await prisma.roomTemplate.create({
      data: { 
        name: room.name,
        tags: room.tags.join(',')
      },
    });
  }

  for (const gig of gigData.gigs) {
    await prisma.gigTemplate.create({
      data: {
        name: gig.name,
        estimatedMinutes: gig.estimatedMinutes,
        applicableTags: gig.applicableRoomTags.join(',')
      },
    });
  }
  console.log('Created universal templates.');

  // 3. Create a test family and user
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  const user = await prisma.users.create({
    data: {
      UserID: 'test-user-id',
      Email: 'testuser@famconomy.com',
      FirstName: 'Test',
      LastName: 'User',
      PasswordHash: hashedPassword,
    },
  });

  const family = await prisma.family.create({
    data: {
      FamilyName: 'Test Family',
      CreatedByUserID: user.UserID,
    },
  });

  await prisma.familyUsers.create({
    data: {
      UserID: user.UserID,
      FamilyID: family.FamilyID,
      RelationshipID: 1, // Assuming 1 is 'Parent'
    },
  });
  console.log('Created test user and family.');

  console.log(`Seeding finished.`);
  console.log('Created user: testuser@famconomy.com');
  console.log('Password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });