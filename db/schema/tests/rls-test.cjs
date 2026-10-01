const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require(path.join(
  __dirname,
  '../../../packages/database/generated/client',
));
const { PrismaService } = require(path.join(
  __dirname,
  '../../../packages/database/dist/prisma/prisma.service',
));
const {
  getUniversityDbContext,
  runWithUniversityContext,
} = require(path.join(
  __dirname,
  '../../../packages/database/dist/prisma/university-context',
));
const { WorkerPrismaService } = require(path.join(
  __dirname,
  '../../../packages/database/dist/prisma/worker-prisma.service',
));
const { PlatformReportPrismaService } = require(path.join(
  __dirname,
  '../../../packages/database/dist/prisma/platform-report-prisma.service',
));

const owner = new PrismaClient({
  datasources: { db: { url: process.env.CI_OWNER_DATABASE_URL } },
});
const auth = new PrismaClient({
  datasources: { db: { url: process.env.AUTH_DATABASE_URL } },
});
const app = new PrismaService();
const worker = new WorkerPrismaService();
const platform = new PlatformReportPrismaService();

async function createFixtures() {
  const sharedUser = await owner.user.create({
    data: {
      email: `rls-${randomUUID()}@example.test`,
      firstName: 'RLS',
      lastName: 'Fixture',
      emailVerifiedAt: new Date(),
    },
  });
  const creator = await owner.user.create({
    data: {
      email: `rls-admin-${randomUUID()}@example.test`,
      firstName: 'RLS',
      lastName: 'Creator',
      emailVerifiedAt: new Date(),
      platformRole: 'PLATFORM_ADMIN',
    },
  });

  async function createUniversity(name) {
    const id = randomUUID();
    const root = await owner.organization.create({
      data: {
        id,
        name,
        type: 'UNIVERSITY',
        rootOrganizationId: id,
        createdBy: creator.id,
      },
    });
    const firstDepartment = await owner.organization.create({
      data: {
        name: `${name} Engineering`,
        type: 'DEPARTMENT',
        parentId: root.id,
        rootOrganizationId: root.id,
        createdBy: creator.id,
      },
    });
    const secondDepartment = await owner.organization.create({
      data: {
        name: `${name} Sciences`,
        type: 'DEPARTMENT',
        parentId: root.id,
        rootOrganizationId: root.id,
        createdBy: creator.id,
      },
    });
    return { root, firstDepartment, secondDepartment };
  }

  const universityA = await createUniversity(`RLS University A ${randomUUID()}`);
  const universityB = await createUniversity(`RLS University B ${randomUUID()}`);
  const domainA = await owner.organizationEmailDomain.create({
    data: {
      organizationId: universityA.firstDepartment.id,
      domain: `cse-${randomUUID()}.example.test`,
      autoJoin: true,
    },
  });
  const domainB = await owner.organizationEmailDomain.create({
    data: {
      organizationId: universityB.firstDepartment.id,
      domain: `entc-${randomUUID()}.example.test`,
      autoJoin: false,
    },
  });
  const allowlistA = await owner.organizationEmailAllowlist.create({
    data: {
      organizationId: universityA.firstDepartment.id,
      email: sharedUser.email,
      addedBy: creator.id,
    },
  });
  const allowlistB = await owner.organizationEmailAllowlist.create({
    data: {
      organizationId: universityB.firstDepartment.id,
      email: sharedUser.email,
      addedBy: creator.id,
    },
  });
  for (const department of [
    universityA.firstDepartment,
    universityB.firstDepartment,
  ]) {
    await owner.organizationMembership.create({
      data: {
        userId: sharedUser.id,
        organizationId: department.id,
        role: 'ADMIN',
        status: 'APPROVED',
        reviewedBy: creator.id,
        reviewedAt: new Date(),
      },
    });
  }

  const resource = await owner.resource.create({
    data: {
      name: 'RLS shared lecture hall',
      ownerOrganizationId: universityA.firstDepartment.id,
      rootOrganizationId: universityA.root.id,
      createdByUserId: sharedUser.id,
    },
  });
  await owner.userPointBalance.createMany({
    data: [
      {
        userId: sharedUser.id,
        rootOrganizationId: universityA.root.id,
        availablePoints: 17,
      },
      {
        userId: sharedUser.id,
        rootOrganizationId: universityB.root.id,
        availablePoints: 43,
      },
    ],
  });
  await owner.notification.createMany({
    data: [
      {
        userId: sharedUser.id,
        rootOrganizationId: universityA.root.id,
        type: 'RLS_TEST',
        title: 'University A',
        message: 'A notification for University A',
      },
      {
        userId: sharedUser.id,
        rootOrganizationId: universityB.root.id,
        type: 'RLS_TEST',
        title: 'University B',
        message: 'A notification for University B',
      },
    ],
  });

  return {
    sharedUser,
    universityA,
    universityB,
    resource,
    domainA,
    domainB,
    allowlistA,
    allowlistB,
  };
}

async function main() {
  const fixtures = await createFixtures();
  const {
    sharedUser,
    universityA,
    universityB,
    resource,
    domainA,
    domainB,
    allowlistA,
    allowlistB,
  } = fixtures;
  const contextFor = (university) => ({
    rootOrganizationId: university.root.id,
    userId: sharedUser.id,
  });

  // Existing memberships stay untouched when an organization configures a
  // joining bonus. Only memberships first approved after this change qualify.
  await owner.organization.update({
    where: { id: universityA.root.id },
    data: { joinBonusPoints: 7 },
  });
  await owner.organization.update({
    where: { id: universityA.firstDepartment.id },
    data: { joinBonusPoints: 11 },
  });
  await owner.organization.update({
    where: { id: universityB.root.id },
    data: { joinBonusPoints: 13 },
  });
  await owner.organization.update({
    where: { id: universityB.firstDepartment.id },
    data: { joinBonusPoints: 17 },
  });
  const bonusUsers = {};
  for (const label of [
    'verified',
    'automatic',
    'manual',
    'administrator',
    'rejected',
    'zero-bonus',
    'rollback',
  ]) {
    bonusUsers[label] = await owner.user.create({
      data: {
        email: `join-bonus-${label}-${randomUUID()}@example.test`,
        firstName: 'Join Bonus',
        lastName: label,
        emailVerifiedAt: new Date(),
      },
    });
  }

  const [appIdentity] = await app.$queryRaw`
    SELECT current_user AS role, rolsuper AS superuser, rolbypassrls AS bypass_rls,
      pg_has_role(current_user, 'resourcehive_tenant', 'member') AS tenant_member
    FROM pg_roles WHERE rolname = current_user
  `;
  assert.equal(appIdentity.superuser, false, 'tenant login must not be superuser');
  assert.equal(appIdentity.bypass_rls, false, 'tenant login must not bypass RLS');
  assert.equal(appIdentity.tenant_member, true, 'tenant login must inherit tenant grants');

  const [authIdentity] = await auth.$queryRaw`
    SELECT current_user AS role, rolsuper AS superuser, rolbypassrls AS bypass_rls,
      pg_has_role(current_user, 'resourcehive_auth', 'member') AS auth_member
    FROM pg_roles WHERE rolname = current_user
  `;
  assert.equal(authIdentity.superuser, false, 'authentication login must not be superuser');
  assert.equal(authIdentity.bypass_rls, false, 'authentication login must not bypass RLS');
  assert.equal(authIdentity.auth_member, true, 'authentication login must inherit auth grants');
  const [globalUserCount] = await auth.$queryRaw`
    SELECT COUNT(*)::int AS count FROM users
  `;
  assert.ok(globalUserCount.count > 0, 'authentication role can resolve global user identities');

  const [workerIdentity] = await worker.$queryRaw`
    SELECT rolsuper AS superuser, rolbypassrls AS bypass_rls,
      pg_has_role(current_user, 'resourcehive_worker', 'member') AS worker_member
    FROM pg_roles WHERE rolname = current_user
  `;
  assert.equal(workerIdentity.superuser, false);
  assert.equal(workerIdentity.bypass_rls, false);
  assert.equal(workerIdentity.worker_member, true);

  const [reportIdentity] = await platform.$queryRaw`
    SELECT rolsuper AS superuser, rolbypassrls AS bypass_rls,
      pg_has_role(current_user, 'resourcehive_platform_report', 'member') AS report_member
    FROM pg_roles WHERE rolname = current_user
  `;
  assert.equal(reportIdentity.superuser, false);
  assert.equal(reportIdentity.bypass_rls, false);
  assert.equal(reportIdentity.report_member, true);
  await assert.rejects(
    platform.$executeRaw`UPDATE organizations SET name = name WHERE id = ${universityA.root.id}::uuid`,
    /permission denied/i,
    'platform report role must remain read-only',
  );

  const tenantTables = [
    'organizations', 'organization_memberships', 'organization_membership_audits',
    'organization_email_domains', 'organization_email_allowlist',
    'resources', 'resource_allowed_organizations', 'resource_slots', 'bookings',
    'booking_disputes', 'booking_dispute_events', 'point_transactions',
    'user_point_balances', 'notifications', 'notification_deliveries',
    'web_push_subscriptions', 'resource_ratings',
  ];
  const rlsState = await app.$queryRaw`
    SELECT relname, relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname = ANY(ARRAY[
        'organizations', 'organization_memberships', 'organization_membership_audits',
        'organization_email_domains', 'organization_email_allowlist',
        'resources', 'resource_allowed_organizations', 'resource_slots', 'bookings',
        'booking_disputes', 'booking_dispute_events', 'point_transactions',
        'user_point_balances', 'notifications', 'notification_deliveries',
        'web_push_subscriptions', 'resource_ratings'
      ])
  `;
  assert.equal(rlsState.length, tenantTables.length, 'all tenant tables should exist');
  for (const table of rlsState) {
    assert.equal(table.relrowsecurity, true, `${table.relname} must enable RLS`);
    assert.equal(table.relforcerowsecurity, true, `${table.relname} must force RLS`);
  }

  const [unscoped] = await app.$queryRaw`
    SELECT COUNT(*)::int AS count FROM organizations
  `;
  assert.equal(unscoped.count, 0, 'no context must expose no university organizations');
  const unscopedWrite = randomUUID();
  await assert.rejects(
    app.$executeRaw`
      INSERT INTO resources (id, name, owner_organization_id, root_organization_id, created_by_user_id)
      VALUES (${unscopedWrite}::uuid, 'unscoped', ${universityA.firstDepartment.id}::uuid,
        ${universityA.root.id}::uuid, ${sharedUser.id}::uuid)
    `,
    /row-level security/i,
    'missing context must reject tenant writes',
  );

  async function countFor(university) {
    return app.withUniversity(contextFor(university), async (transaction) => {
      const [result] = await transaction.$queryRaw`
        SELECT
          (SELECT COUNT(*) FROM organizations
            WHERE root_organization_id = ${university.root.id}::uuid)::int AS own_count,
          (SELECT COUNT(*) FROM organizations
            WHERE root_organization_id = ${universityA.root.id === university.root.id
              ? universityB.root.id
              : universityA.root.id}::uuid)::int AS foreign_count,
          (SELECT COUNT(*) FROM resources
            WHERE root_organization_id = ${university.root.id}::uuid)::int AS resources
      `;
      return result;
    });
  }
  const [countsA, countsB] = await Promise.all([
    countFor(universityA),
    countFor(universityB),
  ]);
  assert.ok(countsA.own_count > 0 && countsA.resources === 1);
  assert.equal(countsA.foreign_count, 0);
  assert.ok(countsB.own_count > 0);
  assert.equal(countsB.foreign_count, 0);
  assert.equal(countsB.resources, 0);

  const [contextCountsA, contextCountsB] = await Promise.all([
    runWithUniversityContext(contextFor(universityA), async () => {
      const [result] = await app.$queryRaw`
        SELECT COUNT(*)::int AS count FROM resources
      `;
      return result.count;
    }),
    runWithUniversityContext(contextFor(universityB), async () => {
      const [result] = await app.$queryRaw`
        SELECT COUNT(*)::int AS count FROM resources
      `;
      return result.count;
    }),
  ]);
  assert.equal(contextCountsA, 1, 'async context helper scopes University A queries');
  assert.equal(contextCountsB, 0, 'concurrent context helper isolates University B');
  assert.equal(getUniversityDbContext(), undefined, 'async context is cleared after parallel work');

  const emailRulesA = await app.withUniversity(contextFor(universityA), async (transaction) => ({
    domains: await transaction.organizationEmailDomain.findMany(),
    allowlist: await transaction.organizationEmailAllowlist.findMany(),
  }));
  const emailRulesB = await app.withUniversity(contextFor(universityB), async (transaction) => ({
    domains: await transaction.organizationEmailDomain.findMany(),
    allowlist: await transaction.organizationEmailAllowlist.findMany(),
  }));
  assert.deepEqual(emailRulesA.domains.map((entry) => entry.id), [domainA.id]);
  assert.deepEqual(emailRulesA.allowlist.map((entry) => entry.id), [allowlistA.id]);
  assert.deepEqual(emailRulesB.domains.map((entry) => entry.id), [domainB.id]);
  assert.deepEqual(emailRulesB.allowlist.map((entry) => entry.id), [allowlistB.id]);
  await assert.rejects(
    app.withUniversity(contextFor(universityA), (transaction) =>
      transaction.organizationEmailDomain.create({
        data: {
          organizationId: universityB.firstDepartment.id,
          domain: `blocked-${randomUUID()}.example.test`,
          autoJoin: true,
        },
      }),
    ),
    /row-level security/i,
    'tenant email rules cannot be created for another university',
  );

  const bonusUser = (label) => bonusUsers[label].id;
  const bonusLedger = (userId, rootOrganizationId) =>
    owner.pointTransaction.findMany({
      where: {
        userId,
        rootOrganizationId,
        transactionType: 'JOIN_BONUS',
      },
      select: { amount: true, sourceOrganizationId: true },
      orderBy: { sourceOrganizationId: 'asc' },
    });

  // Email verification uses the restricted authentication role to insert an
  // approved membership. The database trigger awards the configured bonus.
  await auth.organizationMembership.create({
    data: {
      userId: bonusUser('verified'),
      organizationId: universityB.firstDepartment.id,
      role: 'MEMBER',
      status: 'APPROVED',
    },
  });
  assert.deepEqual(
    await bonusLedger(bonusUser('verified'), universityB.root.id),
    [{ amount: 17, sourceOrganizationId: universityB.firstDepartment.id }],
  );

  // Automatic enrollment creates an approved membership for the selected
  // department and each ancestor, so each organization's bonus is credited.
  await app.withUniversity(contextFor(universityA), async (transaction) => {
    await transaction.organizationMembership.create({
      data: {
        userId: bonusUser('automatic'),
        organizationId: universityA.root.id,
        role: 'MEMBER',
        status: 'APPROVED',
      },
    });
    await transaction.organizationMembership.create({
      data: {
        userId: bonusUser('automatic'),
        organizationId: universityA.firstDepartment.id,
        role: 'MEMBER',
        status: 'APPROVED',
      },
    });
    await transaction.organizationMembership.create({
      data: {
        userId: bonusUser('automatic'),
        organizationId: universityA.secondDepartment.id,
        role: 'MEMBER',
        status: 'APPROVED',
      },
    });
  });
  assert.deepEqual(
    await bonusLedger(bonusUser('automatic'), universityA.root.id),
    [
      { amount: 7, sourceOrganizationId: universityA.root.id },
      { amount: 11, sourceOrganizationId: universityA.firstDepartment.id },
    ].sort((left, right) =>
      left.sourceOrganizationId.localeCompare(right.sourceOrganizationId),
    ),
  );

  // A pending request earns nothing until an administrator approves it.
  await app.withUniversity(contextFor(universityA), async (transaction) => {
    const pending = await transaction.organizationMembership.create({
      data: {
        userId: bonusUser('manual'),
        organizationId: universityA.firstDepartment.id,
        role: 'MEMBER',
        status: 'PENDING',
      },
    });
    assert.deepEqual(
      await transaction.pointTransaction.findMany({
        where: { userId: bonusUser('manual'), transactionType: 'JOIN_BONUS' },
      }),
      [],
    );
    await transaction.organizationMembership.update({
      where: { id: pending.id },
      data: { status: 'APPROVED' },
    });
  });
  assert.deepEqual(
    await bonusLedger(bonusUser('manual'), universityA.root.id),
    [{ amount: 11, sourceOrganizationId: universityA.firstDepartment.id }],
  );

  await app.withUniversity(contextFor(universityA), (transaction) =>
    transaction.organizationMembership.create({
      data: {
        userId: bonusUser('rejected'),
        organizationId: universityA.firstDepartment.id,
        role: 'MEMBER',
        status: 'REJECTED',
      },
    }),
  );
  assert.deepEqual(
    await bonusLedger(bonusUser('rejected'), universityA.root.id),
    [],
    'rejected membership requests do not receive joining bonuses',
  );

  // Assigning an administrator creates an approved membership too.
  await app.withUniversity(contextFor(universityA), (transaction) =>
    transaction.organizationMembership.create({
      data: {
        userId: bonusUser('administrator'),
        organizationId: universityA.root.id,
        role: 'ADMIN',
        status: 'APPROVED',
      },
    }),
  );
  assert.deepEqual(
    await bonusLedger(bonusUser('administrator'), universityA.root.id),
    [{ amount: 7, sourceOrganizationId: universityA.root.id }],
  );

  // Zero bonus organizations do not create a ledger entry.
  await app.withUniversity(contextFor(universityA), (transaction) =>
    transaction.organizationMembership.create({
      data: {
        userId: bonusUser('zero-bonus'),
        organizationId: universityA.secondDepartment.id,
        role: 'MEMBER',
        status: 'APPROVED',
      },
    }),
  );
  assert.deepEqual(
    await bonusLedger(bonusUser('zero-bonus'), universityA.root.id),
    [],
  );

  // If any later write in the same transaction fails, membership, ledger,
  // and balance changes from the trigger all roll back together.
  await assert.rejects(
    app.withUniversity(contextFor(universityA), async (transaction) => {
      await transaction.organizationMembership.create({
        data: {
          userId: bonusUser('rollback'),
          organizationId: universityA.firstDepartment.id,
          role: 'MEMBER',
          status: 'APPROVED',
        },
      });
      throw new Error('rollback join-bonus transaction');
    }),
    /rollback join-bonus transaction/,
  );
  assert.equal(
    await owner.organizationMembership.count({
      where: {
        userId: bonusUser('rollback'),
        organizationId: universityA.firstDepartment.id,
      },
    }),
    0,
  );
  assert.deepEqual(
    await bonusLedger(bonusUser('rollback'), universityA.root.id),
    [],
  );

  // Rejoining the same organization cannot award the same bonus twice.
  await app.withUniversity(contextFor(universityA), async (transaction) => {
    await transaction.organizationMembership.delete({
      where: {
        userId_organizationId: {
          userId: bonusUser('automatic'),
          organizationId: universityA.firstDepartment.id,
        },
      },
    });
    await transaction.organizationMembership.create({
      data: {
        userId: bonusUser('automatic'),
        organizationId: universityA.firstDepartment.id,
        role: 'MEMBER',
        status: 'APPROVED',
      },
    });
  });
  assert.equal(
    (await bonusLedger(bonusUser('automatic'), universityA.root.id)).filter(
      (entry) => entry.sourceOrganizationId === universityA.firstDepartment.id,
    ).length,
    1,
  );

  // The same user has independent balances in each university; the trigger
  // also uses each source organization's actual university root.
  await app.withUniversity(contextFor(universityB), (transaction) =>
    transaction.organizationMembership.create({
      data: {
        userId: bonusUser('automatic'),
        organizationId: universityB.root.id,
        role: 'MEMBER',
        status: 'APPROVED',
      },
    }),
  );
  const automaticBalances = await owner.userPointBalance.findMany({
    where: { userId: bonusUser('automatic') },
    orderBy: { rootOrganizationId: 'asc' },
  });
  assert.deepEqual(
    automaticBalances.map((balance) => ({
      rootOrganizationId: balance.rootOrganizationId,
      availablePoints: balance.availablePoints,
    })),
    [
      { rootOrganizationId: universityA.root.id, availablePoints: 18 },
      { rootOrganizationId: universityB.root.id, availablePoints: 13 },
    ].sort((left, right) =>
      left.rootOrganizationId.localeCompare(right.rootOrganizationId),
    ),
  );

  assert.equal(
    await owner.pointTransaction.count({
      where: { userId: sharedUser.id, transactionType: 'JOIN_BONUS' },
    }),
    0,
    'pre-existing approved memberships are not credited retroactively',
  );

  await assert.rejects(
    app.withUniversity(contextFor(universityA), (transaction) =>
      transaction.$executeRaw`
        INSERT INTO resources (id, name, owner_organization_id, root_organization_id, created_by_user_id)
        VALUES (${randomUUID()}::uuid, 'cross-university',
          ${universityB.firstDepartment.id}::uuid, ${universityB.root.id}::uuid,
          ${sharedUser.id}::uuid)
      `,
    ),
    /row-level security/i,
    'cross-university inserts must fail at PostgreSQL',
  );
  await assert.rejects(
    app.withUniversity(contextFor(universityA), (transaction) =>
      transaction.$executeRaw`
        UPDATE resources SET root_organization_id = ${universityB.root.id}::uuid
        WHERE id = ${resource.id}::uuid
      `,
    ),
    /row-level security/i,
    'changing a row to another university must fail at PostgreSQL',
  );
  const hiddenUpdate = await app.withUniversity(
    contextFor(universityA),
    (transaction) => transaction.$executeRaw`
      UPDATE resources SET status = 'INACTIVE' WHERE root_organization_id = ${universityB.root.id}::uuid
    `,
  );
  assert.equal(hiddenUpdate, 0, 'updates to foreign rows must affect zero rows');
  const hiddenDelete = await app.withUniversity(
    contextFor(universityA),
    (transaction) => transaction.$executeRaw`
      DELETE FROM resources WHERE root_organization_id = ${universityB.root.id}::uuid
    `,
  );
  assert.equal(hiddenDelete, 0, 'deletes of foreign rows must affect zero rows');

  await assert.rejects(
    app.withUniversity(contextFor(universityA), (transaction) =>
      transaction.$executeRaw`
        INSERT INTO resource_allowed_organizations (resource_id, organization_id, root_organization_id)
        VALUES (${resource.id}::uuid, ${universityB.firstDepartment.id}::uuid,
          ${universityA.root.id}::uuid)
      `,
    ),
    /foreign key|row-level security/i,
    'a resource cannot be shared with a department at another university',
  );
  await app.withUniversity(contextFor(universityA), (transaction) =>
    transaction.$executeRaw`
      INSERT INTO resource_allowed_organizations (resource_id, organization_id, root_organization_id)
      VALUES (${resource.id}::uuid, ${universityA.secondDepartment.id}::uuid,
        ${universityA.root.id}::uuid)
    `,
  );
  const sameUniversityShare = await app.withUniversity(
    contextFor(universityA),
    (transaction) => transaction.resourceAllowedOrganization.count({
      where: { resourceId: resource.id, organizationId: universityA.secondDepartment.id },
    }),
  );
  assert.equal(sameUniversityShare, 1, 'department sharing within a university remains allowed');

  async function tenantData(university) {
    return app.withUniversity(contextFor(university), async (transaction) => {
      const balance = await transaction.userPointBalance.findUnique({
        where: {
          userId_rootOrganizationId: {
            userId: sharedUser.id,
            rootOrganizationId: university.root.id,
          },
        },
      });
      const notifications = await transaction.notification.findMany({
        where: { userId: sharedUser.id },
        select: { title: true },
      });
      return { balance: balance?.availablePoints, notifications };
    });
  }
  const [dataA, dataB] = await Promise.all([
    tenantData(universityA),
    tenantData(universityB),
  ]);
  assert.equal(dataA.balance, 17);
  assert.equal(dataA.notifications.length, 1);
  assert.equal(dataA.notifications[0].title, 'University A');
  assert.equal(dataB.balance, 43);
  assert.equal(dataB.notifications.length, 1);
  assert.equal(dataB.notifications[0].title, 'University B');

  await app.withUniversity(contextFor(universityA), (transaction) =>
    transaction.pointTransaction.create({
      data: {
        userId: sharedUser.id,
        rootOrganizationId: universityA.root.id,
        sourceOrganizationId: universityA.firstDepartment.id,
        amount: 5,
        transactionType: 'SEMESTER_ALLOCATION',
      },
    }),
  );
  const updatedBalance = await app.withUniversity(
    contextFor(universityA),
    (transaction) => transaction.userPointBalance.findUnique({
      where: {
        userId_rootOrganizationId: {
          userId: sharedUser.id,
          rootOrganizationId: universityA.root.id,
        },
      },
      select: { availablePoints: true },
    }),
  );
  assert.equal(updatedBalance.availablePoints, 22, 'ledger trigger updates the selected university balance');

  const [workerNotifications] = await worker.$queryRaw`
    SELECT COUNT(*)::int AS count FROM notifications
    WHERE user_id = ${sharedUser.id}::uuid AND type = 'RLS_TEST'
  `;
  assert.equal(workerNotifications.count, 2, 'delivery worker can process tenant notifications');
  const [reportRows] = await platform.$queryRaw`
    SELECT COUNT(*)::int AS count FROM organizations
    WHERE id IN (${universityA.root.id}::uuid, ${universityB.root.id}::uuid)
  `;
  assert.equal(reportRows.count, 2, 'platform report role can read both universities');

  await assert.rejects(
    runWithUniversityContext(contextFor(universityA), async () => {
      await app.withUniversity(contextFor(universityA), async () => {
        throw new Error('expected transaction failure');
      });
    }),
    /expected transaction failure/,
  );
  assert.equal(getUniversityDbContext(), undefined, 'async context clears after failure');
  const [afterContext] = await app.$queryRaw`
    SELECT COUNT(*)::int AS count FROM organizations
  `;
  assert.equal(afterContext.count, 0, 'transaction-local context must not leak');

  console.log(JSON.stringify({
    tenantRole: appIdentity.role,
    bypassRls: appIdentity.bypass_rls,
    tablesForced: rlsState.length,
    universitiesTested: [universityA.root.name, universityB.root.name],
    unscopedRead: 'zero rows',
    unscopedWrite: 'rejected',
    crossUniversityWrite: 'rejected',
    departmentSharing: 'allowed within one university',
    separateBalancesAndNotifications: true,
    joinBonusScenarios: {
      authVerifiedMembership: 17,
      automaticEnrollmentAncestors: 18,
      manualApproval: 11,
      adminAssignment: 7,
      rejectedMembership: 0,
      zeroBonus: 0,
      repeatJoinDuplicatePrevented: true,
      rollbackAtomic: true,
      perUniversityBalances: true,
      noRetroactiveAwards: true,
    },
    workerRole: 'tenant notifications accessible',
    platformReportRole: 'cross-university read accessible',
    contextCleanup: 'verified after commit and rollback',
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([
      owner.$disconnect(),
      auth.$disconnect(),
      app.$disconnect(),
      worker.$disconnect(),
      platform.$disconnect(),
    ]);
  });
