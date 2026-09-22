import { PrismaClient } from '@resourcehive/database';

const prisma = new PrismaClient();

const demoUserId = '00000000-0000-4000-8000-000000000001';
const demoOrganizationId = '00000000-0000-4000-8000-000000000002';

async function seedResources() {
  console.log('Seeding resources...');

  await prisma.resource.createMany({
    data: [
      {
        id: '00000000-0000-4000-8000-000000000010',
        name: '3D Printer Makerbot Replicator+',
        description: 'High-quality 3D printer available for student use.',
        ownerOrganizationId: demoOrganizationId,
        rootOrganizationId: demoOrganizationId,
        createdByUserId: demoUserId,
        pointCost: 10,
        status: 'ACTIVE',
      },
      {
        id: '00000000-0000-4000-8000-000000000011',
        name: 'Study Room 101',
        description: 'Quiet study room with a whiteboard and projector.',
        ownerOrganizationId: demoOrganizationId,
        rootOrganizationId: demoOrganizationId,
        createdByUserId: demoUserId,
        pointCost: 5,
        status: 'ACTIVE',
      },
      {
        id: '00000000-0000-4000-8000-000000000012',
        name: 'Arduino Uno Kit',
        description: 'Complete Arduino starter kit with sensors.',
        ownerOrganizationId: demoOrganizationId,
        rootOrganizationId: demoOrganizationId,
        createdByUserId: demoUserId,
        pointCost: 2,
        status: 'ACTIVE',
      }
    ],
    skipDuplicates: true,
  });

  console.log('Resources seeded successfully!');
}

seedResources()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
