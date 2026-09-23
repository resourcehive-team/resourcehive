import { PrismaClient } from '@resourcehive/database';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const demoOrganizationId = '00000000-0000-4000-8000-000000000002'; // Demo University
const newSubOrgId = '00000000-0000-4000-8000-000000000100'; // Unique ID for sub-org
const newAdminUserId = '00000000-0000-4000-8000-000000000101'; // Unique ID for admin
const email = 'suborg_admin@example.edu';
const password = 'DemoPassword123!';

async function seedSubOrg() {
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (transaction) => {
    // 1. Create the Admin User
    await transaction.user.upsert({
      where: { email },
      update: {
        passwordHash,
        firstName: 'SubOrg',
        lastName: 'Admin',
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
      },
      create: {
        id: newAdminUserId,
        email,
        passwordHash,
        firstName: 'SubOrg',
        lastName: 'Admin',
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    const user = await transaction.user.findUniqueOrThrow({
      where: { email },
    });

    // 2. Create the Sub-Organization under Demo University
    await transaction.organization.upsert({
      where: { id: newSubOrgId },
      update: {
        name: 'Demo Sub-Organization',
        status: 'ACTIVE',
      },
      create: {
        id: newSubOrgId,
        name: 'Demo Sub-Organization',
        type: 'DEPARTMENT',
        parentId: demoOrganizationId,
        rootOrganizationId: demoOrganizationId,
        joinBonusPoints: 0,
        status: 'ACTIVE',
        createdBy: user.id,
      },
    });

    // 3. Add the Admin to the Sub-Organization as an ADMIN
    await transaction.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: newSubOrgId,
        },
      },
      update: {
        role: 'ADMIN',
        status: 'APPROVED',
        approvedBy: user.id,
      },
      create: {
        userId: user.id,
        organizationId: newSubOrgId,
        role: 'ADMIN',
        status: 'APPROVED',
        approvedBy: user.id,
      },
    });
  });

  console.log(`Sub-Organization created!`);
  console.log(`Admin login ready: ${email} / ${password}`);
}

seedSubOrg()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
