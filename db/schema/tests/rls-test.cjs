const assert = require('node:assert/strict');
const path = require('node:path');
const { PrismaClient } = require(path.join(
  __dirname,
  '../../../packages/database/generated/client',
));
const { PrismaService } = require(path.join(
  __dirname,
  '../../../packages/database/dist/prisma/prisma.service',
));

const auth = new PrismaClient({
  datasources: { db: { url: process.env.AUTH_DATABASE_URL } },
});
const platform = new PrismaClient({
  datasources: { db: { url: process.env.PLATFORM_REPORT_DATABASE_URL } },
});
const app = new PrismaService();

class RollbackProbe extends Error {}

async function main() {
  const [identity] = await app.$queryRaw`
    SELECT current_user AS role, rolbypassrls AS bypass_rls,
      pg_has_role(current_user, 'resourcehive_tenant', 'member') AS tenant_member
    FROM pg_roles WHERE rolname = current_user
  `;
  assert.equal(identity.bypass_rls, false, 'runtime login must not bypass RLS');
  assert.equal(identity.tenant_member, true, 'runtime login must inherit tenant grants');

  const [unscoped] = await app.$queryRaw`
    SELECT COUNT(*)::int AS count FROM organizations
  `;
  assert.equal(unscoped.count, 0, 'missing tenant context must expose no organizations');

  const tenants = await auth.$queryRaw`
    SELECT root.id, root.name, MIN(m.user_id::text) AS user_id
    FROM organizations root
    JOIN organizations child ON child.root_organization_id = root.id
    JOIN organization_memberships m ON m.organization_id = child.id
    WHERE root.parent_id IS NULL AND m.status = 'APPROVED'
    GROUP BY root.id, root.name
    ORDER BY root.name
  `;
  const distinctTenants = [...new Map(tenants.map((tenant) => [tenant.id, tenant])).values()];
  assert.ok(distinctTenants.length >= 2, 'RLS-test branch needs two universities with approved memberships');
  const [tenantA, tenantB] = distinctTenants;
  const contextFor = (tenant) => ({ rootOrganizationId: tenant.id, userId: tenant.user_id });

  for (const [tenant, other] of [[tenantA, tenantB], [tenantB, tenantA]]) {
    const counts = await app.withUniversity(contextFor(tenant), async (tx) => {
      const [result] = await tx.$queryRaw`
        SELECT
          (SELECT COUNT(*) FROM organizations WHERE root_organization_id = ${tenant.id}::uuid)::int AS own_count,
          (SELECT COUNT(*) FROM organizations WHERE root_organization_id = ${other.id}::uuid)::int AS other_count
      `;
      return result;
    });
    assert.ok(counts.own_count > 0, `${tenant.name} should see its organizations`);
    assert.equal(counts.other_count, 0, `${tenant.name} must not see ${other.name}`);
  }

  await assert.rejects(
    app.withUniversity(contextFor(tenantA), (tx) => tx.$executeRaw`
      INSERT INTO user_point_balances (user_id, root_organization_id, available_points)
      VALUES (${tenantB.user_id}::uuid, ${tenantB.id}::uuid, 0)
    `),
    /row-level security/i,
    'cross-university insert must be rejected by WITH CHECK',
  );

  const hiddenUpdateCount = await app.withUniversity(
    contextFor(tenantA),
    (tx) => tx.$executeRaw`
      UPDATE organizations SET name = name WHERE id = ${tenantB.id}::uuid
    `,
  );
  assert.equal(hiddenUpdateCount, 0, 'cross-university update must affect no rows');

  const [sharingTarget] = await app.withUniversity(
    contextFor(tenantA),
    (tx) => tx.$queryRaw`
      SELECT r.id AS resource_id, o.id AS organization_id
      FROM resources r
      JOIN organizations o ON o.root_organization_id = r.root_organization_id
      WHERE r.root_organization_id = ${tenantA.id}::uuid
        AND r.owner_organization_id <> o.id
        AND NOT EXISTS (
          SELECT 1 FROM resource_allowed_organizations a
          WHERE a.resource_id = r.id AND a.organization_id = o.id
        )
      LIMIT 1
    `,
  );
  if (sharingTarget) {
    await assert.rejects(
      app.withUniversity(contextFor(tenantA), async (tx) => {
        await tx.$executeRaw`
          INSERT INTO resource_allowed_organizations
            (resource_id, organization_id, root_organization_id)
          VALUES (${sharingTarget.resource_id}::uuid, ${sharingTarget.organization_id}::uuid, ${tenantA.id}::uuid)
        `;
        const [result] = await tx.$queryRaw`
          SELECT COUNT(*)::int AS count FROM resource_allowed_organizations
          WHERE resource_id = ${sharingTarget.resource_id}::uuid
            AND organization_id = ${sharingTarget.organization_id}::uuid
            AND root_organization_id = ${tenantA.id}::uuid
        `;
        assert.equal(result.count, 1, 'same-university department sharing should be visible');
        throw new RollbackProbe();
      }),
      (error) => error instanceof RollbackProbe,
    );
  } else {
    const [sameTenantShares] = await app.withUniversity(
      contextFor(tenantA),
      (tx) => tx.$queryRaw`
        SELECT COUNT(*)::int AS count FROM resource_allowed_organizations a
        JOIN organizations o ON o.id = a.organization_id
        WHERE a.root_organization_id = ${tenantA.id}::uuid
          AND o.root_organization_id = ${tenantA.id}::uuid
      `,
    );
    assert.ok(sameTenantShares.count > 0, 'branch needs a same-university sharing record to test');
  }

  const [platformCount] = await platform.$queryRaw`
    SELECT COUNT(*)::int AS count FROM organizations WHERE parent_id IS NULL
  `;
  assert.ok(platformCount.count >= distinctTenants.length, 'platform report role should read cross-university aggregates');

  console.log(JSON.stringify({
    runtimeRole: identity.role,
    bypassRls: identity.bypass_rls,
    unscopedOrganizationCount: unscoped.count,
    universitiesTested: [tenantA.name, tenantB.name],
    crossUniversityInsert: 'denied',
    crossUniversityUpdate: 'zero rows',
    sameUniversitySharing: 'visible',
    platformReport: 'cross-university read available',
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([app.$disconnect(), auth.$disconnect(), platform.$disconnect()]);
  });
