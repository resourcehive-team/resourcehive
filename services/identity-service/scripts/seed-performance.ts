import { PrismaClient } from '@resourcehive/database';
import * as bcrypt from 'bcrypt';

const databaseUrl = process.env.PERF_DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    'Set PERF_DATABASE_URL to the isolated performance database URL.',
  );
}
if (process.env.PERF_DATABASE_CONFIRM_NONPROD !== 'YES') {
  throw new Error(
    'Refusing to write performance fixtures. Set PERF_DATABASE_CONFIRM_NONPROD=YES only after verifying this is an isolated nonproduction database.',
  );
}

const userCount = parsePositiveInteger(process.env.PERF_USER_COUNT, 100);
if (userCount < 2) {
  throw new Error(
    'PERF_USER_COUNT must be at least 2 so both tenants are exercised.',
  );
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const testPassword = process.env.PERF_USER_PASSWORD ?? 'PerfOnly-1024!';
const passwordHashPromise = bcrypt.hash(testPassword, 4);
const organizationIds = [uuid(1), uuid(2)];

async function seedPerformanceFixtures() {
  const passwordHash = await passwordHashPromise;
  const usersPerTenant = Math.ceil(userCount / organizationIds.length);
  const now = Date.now();
  const usedSlots = Array.from({ length: userCount }, (_, index) =>
    uuid(40_000 + index),
  );
  const activeBookings = await prisma.booking.findMany({
    where: {
      resourceSlotId: { in: usedSlots },
      status: { not: 'CANCELLED' },
    },
    select: { id: true, resourceSlotId: true, status: true },
  });
  if (activeBookings.length) {
    throw new Error(
      `Found ${activeBookings.length} non-cancelled bookings on performance slots. Cancel or remove only these synthetic fixtures before reseeding.`,
    );
  }

  for (let index = 0; index < userCount; index += 1) {
    const userId = uuid(10_000 + index);
    const seededUser = await prisma.user.upsert({
      where: { email: userEmail(index + 1) },
      update: {
        passwordHash,
        firstName: `Perf${index + 1}`,
        lastName: 'User',
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        platformRole: 'USER',
      },
      create: {
        id: userId,
        email: userEmail(index + 1),
        passwordHash,
        firstName: `Perf${index + 1}`,
        lastName: 'User',
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    if (seededUser.id !== userId) {
      throw new Error(
        `Synthetic email ${userEmail(index + 1)} already exists with a different user ID; refusing to attach the isolated fixtures to an unrelated account.`,
      );
    }
  }

  for (
    let tenantIndex = 0;
    tenantIndex < organizationIds.length;
    tenantIndex += 1
  ) {
    const firstUserIndex = tenantIndex;
    const firstUser = await prisma.user.findUniqueOrThrow({
      where: { email: userEmail(firstUserIndex + 1) },
      select: { id: true },
    });
    const organizationId = organizationIds[tenantIndex];
    await prisma.organization.upsert({
      where: { id: organizationId },
      update: { name: tenantName(tenantIndex), status: 'ACTIVE' },
      create: {
        id: organizationId,
        name: tenantName(tenantIndex),
        type: 'UNIVERSITY',
        rootOrganizationId: organizationId,
        joinBonusPoints: 0,
        status: 'ACTIVE',
        createdBy: firstUser.id,
      },
    });
  }

  for (let index = 0; index < userCount; index += 1) {
    const tenantIndex = index % organizationIds.length;
    const tenantUserIndex = Math.floor(index / organizationIds.length);
    const userId = uuid(10_000 + index);
    const organizationId = organizationIds[tenantIndex];
    const role = tenantUserIndex === 0 ? 'ADMIN' : 'MEMBER';
    await prisma.organizationMembership.upsert({
      where: {
        userId_organizationId: { userId, organizationId },
      },
      update: { role, status: 'APPROVED' },
      create: { userId, organizationId, role, status: 'APPROVED' },
    });

    const resourceId = uuid(30_000 + index);
    await prisma.resource.upsert({
      where: { id: resourceId },
      update: {
        name: `Performance resource ${index + 1}`,
        status: 'ACTIVE',
        pointCost: 0,
      },
      create: {
        id: resourceId,
        name: `Performance resource ${index + 1}`,
        description: 'Synthetic fixture for isolated performance testing.',
        ownerOrganizationId: organizationId,
        rootOrganizationId: organizationId,
        createdByUserId: userId,
        status: 'ACTIVE',
        pointCost: 0,
        cancellationNoticeMinutes: 0,
      },
    });

    const startsAt = new Date(
      now + 48 * 60 * 60 * 1000 + index * 60 * 60 * 1000,
    );
    await prisma.resourceSlot.upsert({
      where: { id: uuid(40_000 + index) },
      update: {
        resourceId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
        status: 'PUBLISHED',
        withdrawnAt: null,
      },
      create: {
        id: uuid(40_000 + index),
        resourceId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
        status: 'PUBLISHED',
      },
    });

    const historicalSlotId = uuid(45_000 + index);
    const historicalStartsAt = new Date(
      now - 30 * 24 * 60 * 60 * 1000 + index * 60_000,
    );
    const historicalEndsAt = new Date(
      historicalStartsAt.getTime() + 30 * 60 * 1000,
    );
    await prisma.resourceSlot.upsert({
      where: { id: historicalSlotId },
      update: {
        resourceId,
        startsAt: historicalStartsAt,
        endsAt: historicalEndsAt,
        status: 'PUBLISHED',
        withdrawnAt: null,
      },
      create: {
        id: historicalSlotId,
        resourceId,
        startsAt: historicalStartsAt,
        endsAt: historicalEndsAt,
        status: 'PUBLISHED',
      },
    });

    const bookingId = uuid(50_000 + index);
    const createdAt = new Date(historicalEndsAt.getTime() + 60_000);
    await prisma.booking.upsert({
      where: { id: bookingId },
      update: {
        resourceSlotId: historicalSlotId,
        userId,
        status: 'COMPLETED',
        createdAt,
        completedAt: new Date(createdAt.getTime() + 60_000),
        cancelledAt: null,
        cancelledByUserId: null,
        cancellationReason: null,
        cancellationNoticeMinutes: 0,
      },
      create: {
        id: bookingId,
        resourceSlotId: historicalSlotId,
        userId,
        status: 'COMPLETED',
        createdAt,
        completedAt: new Date(createdAt.getTime() + 60_000),
        cancellationNoticeMinutes: 0,
      },
    });

    if (index % 10 === 0) {
      const disputeId = uuid(60_000 + index);
      await prisma.bookingDispute.upsert({
        where: { id: disputeId },
        update: {
          bookingId,
          rootOrganizationId: organizationId,
          resolverOrganizationId: organizationId,
          submittedByUserId: userId,
          reason: 'OTHER',
          description: 'Synthetic dispute fixture for performance testing.',
          status: 'OPEN',
          resolutionNotes: null,
          reviewedByUserId: null,
          resolvedAt: null,
        },
        create: {
          id: disputeId,
          bookingId,
          rootOrganizationId: organizationId,
          resolverOrganizationId: organizationId,
          submittedByUserId: userId,
          reason: 'OTHER',
          description: 'Synthetic dispute fixture for performance testing.',
          status: 'OPEN',
        },
      });
    }

    for (
      let notificationIndex = 0;
      notificationIndex < 5;
      notificationIndex += 1
    ) {
      const notificationId = uuid(70_000 + index * 5 + notificationIndex);
      const notificationCreatedAt = new Date(
        now - (notificationIndex + 1) * 24 * 60 * 60 * 1000,
      );
      await prisma.notification.upsert({
        where: { id: notificationId },
        update: {
          userId,
          type: 'PERFORMANCE_FIXTURE',
          title: `Synthetic notification ${notificationIndex + 1}`,
          message:
            'Synthetic-only notification for isolated performance testing.',
          data: { source: 'performance-fixture' },
          readAt: notificationIndex < 3 ? notificationCreatedAt : null,
          createdAt: notificationCreatedAt,
        },
        create: {
          id: notificationId,
          userId,
          type: 'PERFORMANCE_FIXTURE',
          title: `Synthetic notification ${notificationIndex + 1}`,
          message:
            'Synthetic-only notification for isolated performance testing.',
          data: { source: 'performance-fixture' },
          readAt: notificationIndex < 3 ? notificationCreatedAt : null,
          createdAt: notificationCreatedAt,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        databaseHost: new URL(databaseUrl).hostname,
        userCount,
        usersPerTenant,
        organizationIds,
        userEmailPattern: 'perf-user-{NNN}@resourcehive.test',
        password: testPassword,
        firstResourceSlotId: uuid(40_000),
        slotIdForUserIndex: `UUID suffix 000000000000 + 40000 + zero-based user index`,
        note: 'Synthetic-only dataset; two root organizations are used for tenant isolation checks.',
      },
      null,
      2,
    ),
  );
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('PERF_USER_COUNT must be a positive integer.');
  }
  return parsed;
}

function userEmail(index: number) {
  return `perf-user-${String(index).padStart(3, '0')}@resourcehive.test`;
}

function tenantName(index: number) {
  return `ResourceHive Performance Tenant ${index + 1}`;
}

function uuid(number: number) {
  return `f0000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
}

seedPerformanceFixtures()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
