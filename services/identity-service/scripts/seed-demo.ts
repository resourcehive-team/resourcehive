import { PrismaClient } from '@resourcehive/database';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const demoUserId = '00000000-0000-4000-8000-000000000001';
const demoOrganizationId = '00000000-0000-4000-8000-000000000002';
const email = (process.env.DEMO_USER_EMAIL ?? 'demo@example.edu')
  .trim()
  .toLowerCase();
const password = process.env.DEMO_USER_PASSWORD ?? 'DemoPassword123!';

async function seedDemo() {
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (transaction) => {
    await transaction.user.upsert({
      where: { email },
      update: {
        passwordHash,
        firstName: 'Demo',
        lastName: 'User',
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
      },
      create: {
        id: demoUserId,
        email,
        passwordHash,
        firstName: 'Demo',
        lastName: 'User',
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    const user = await transaction.user.findUniqueOrThrow({
      where: { email },
    });

    await transaction.organization.upsert({
      where: { id: demoOrganizationId },
      update: {
        name: 'Demo Organization',
        status: 'ACTIVE',
        joinBonusPoints: 0,
      },
      create: {
        id: demoOrganizationId,
        name: 'Demo Organization',
        type: 'UNIVERSITY',
        rootOrganizationId: demoOrganizationId,
        joinBonusPoints: 0,
        status: 'ACTIVE',
        createdBy: user.id,
      },
    });

    await transaction.organizationEmailDomain.upsert({
      where: { domain: 'example.edu' },
      update: {
        organizationId: demoOrganizationId,
        autoJoin: true,
      },
      create: {
        organizationId: demoOrganizationId,
        domain: 'example.edu',
        autoJoin: true,
      },
    });

    await transaction.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: demoOrganizationId,
        },
      },
      update: {
        role: 'MEMBER',
        status: 'APPROVED',
        approvedBy: user.id,
      },
      create: {
        userId: user.id,
        organizationId: demoOrganizationId,
        role: 'MEMBER',
        status: 'APPROVED',
        approvedBy: user.id,
      },
    });
  });

  console.log(`Demo login ready: ${email}`);
}

seedDemo()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
