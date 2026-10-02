import { PrismaClient } from '@resourcehive/database';

const ROLE_BINDINGS = [
  ['APP_DATABASE_URL', 'resourcehive_app_login', 'resourcehive_tenant'],
  ['AUTH_DATABASE_URL', 'resourcehive_auth_login', 'resourcehive_auth'],
  ['WORKER_DATABASE_URL', 'resourcehive_worker_login', 'resourcehive_worker'],
  [
    'PLATFORM_REPORT_DATABASE_URL',
    'resourcehive_platform_login',
    'resourcehive_platform_report',
  ],
] as const;

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(
      `${name} is required before configuring production database roles`,
    );
  return value;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function safeErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : (JSON.stringify(error) ?? 'Unknown error');
  return message
    .replace(/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s/]+@/gi, '$1[redacted]@')
    .replace(/([?&](?:password|token|secret)=)[^&\s]+/gi, '$1[redacted]');
}

async function main(): Promise<void> {
  const directUrl = requireEnvironment('DATABASE_URL_UNPOOLED');
  const direct = new URL(directUrl);
  if (!direct.username || !direct.password)
    throw new Error(
      'DATABASE_URL_UNPOOLED must include an owner username and password',
    );
  const databasePath = direct.pathname;
  const runtime = ROLE_BINDINGS.map(
    ([environmentKey, expectedRole, capability]) => {
      const connection = new URL(requireEnvironment(environmentKey));
      const actualRole = decodeURIComponent(connection.username);
      if (actualRole !== expectedRole)
        throw new Error(
          `${environmentKey} must use the dedicated ${expectedRole} database login`,
        );
      if (!connection.password)
        throw new Error(
          `${environmentKey} must include the ${expectedRole} password`,
        );
      const directHost = direct.hostname.replace(/-pooler(?=\.)/, '');
      const runtimeHost = connection.hostname.replace(/-pooler(?=\.)/, '');
      if (connection.pathname !== databasePath || runtimeHost !== directHost)
        throw new Error(
          `${environmentKey} must target the same Neon project database as DATABASE_URL_UNPOOLED`,
        );
      return {
        environmentKey,
        expectedRole,
        capability,
        password: decodeURIComponent(connection.password),
        url: connection.toString(),
      };
    },
  );

  const owner = new PrismaClient({ datasources: { db: { url: directUrl } } });
  try {
    const current = await owner.$queryRaw<
      Array<{ current_database: string }>
    >`SELECT current_database()`;
    if (databasePath !== `/${current[0]?.current_database}`)
      throw new Error(
        'DATABASE_URL_UNPOOLED points at a different database than the configured runtime URLs',
      );

    for (const role of runtime) {
      await owner.$executeRawUnsafe(
        `DO $role$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role.expectedRole}') THEN CREATE ROLE "${role.expectedRole}" LOGIN; END IF; END $role$`,
      );
      await owner.$executeRawUnsafe(
        `DO $security$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role.expectedRole}' AND (rolsuper OR rolbypassrls OR rolreplication)) THEN RAISE EXCEPTION 'Runtime role ${role.expectedRole} has forbidden elevated privileges'; END IF; END $security$`,
      );
      // Managed database owners cannot ALTER SUPERUSER or BYPASSRLS, even
      // to set them to false. CREATE ROLE defaults are safe; reject existing
      // elevated roles above instead of attempting a privileged alteration.
      await owner.$executeRawUnsafe(
        `ALTER ROLE "${role.expectedRole}" LOGIN PASSWORD ${quoteLiteral(role.password)} NOCREATEDB NOCREATEROLE INHERIT`,
      );
      await owner.$executeRawUnsafe(`
        DO $membership$
        DECLARE inherited_role RECORD;
        BEGIN
          FOR inherited_role IN
            SELECT parent.rolname
            FROM pg_auth_members AS membership
            JOIN pg_roles AS parent ON parent.oid = membership.roleid
            JOIN pg_roles AS member ON member.oid = membership.member
            WHERE member.rolname = '${role.expectedRole}'
              AND parent.rolname <> '${role.capability}'
          LOOP
            EXECUTE format('REVOKE %I FROM %I', inherited_role.rolname, '${role.expectedRole}');
          END LOOP;
        END
        $membership$
      `);
      await owner.$executeRawUnsafe(
        `GRANT "${role.capability}" TO "${role.expectedRole}"`,
      );
    }
  } finally {
    await owner.$disconnect();
  }

  for (const role of runtime) {
    const client = new PrismaClient({ datasources: { db: { url: role.url } } });
    try {
      const verification = await client.$queryRaw<
        Array<{
          current_user: string;
          rolcanlogin: boolean;
          rolsuper: boolean;
          rolbypassrls: boolean;
          rolcreatedb: boolean;
          rolcreaterole: boolean;
          rolreplication: boolean;
          capability_granted: boolean;
          only_capability_granted: boolean;
          database_matches: boolean;
        }>
      >`
        SELECT
          role.rolname AS current_user,
          role.rolcanlogin,
          role.rolsuper,
          role.rolbypassrls,
          role.rolcreatedb,
          role.rolcreaterole,
          role.rolreplication,
          pg_has_role(role.oid, ${role.capability}, 'member') AS capability_granted,
          NOT EXISTS (
            SELECT 1
            FROM pg_auth_members AS membership
            JOIN pg_roles AS parent ON parent.oid = membership.roleid
            WHERE membership.member = role.oid
              AND parent.rolname <> ${role.capability}
          ) AS only_capability_granted,
          current_database() = ${databasePath.slice(1)} AS database_matches
        FROM pg_roles AS role
        WHERE role.rolname = current_user
      `;
      const actual = verification[0];
      if (
        !actual ||
        actual.current_user !== role.expectedRole ||
        !actual.rolcanlogin ||
        actual.rolsuper ||
        actual.rolbypassrls ||
        actual.rolcreatedb ||
        actual.rolcreaterole ||
        actual.rolreplication ||
        !actual.capability_granted ||
        !actual.only_capability_granted ||
        !actual.database_matches
      ) {
        throw new Error(
          `${role.environmentKey} did not connect with its dedicated non-owner role, expected capability, and RLS enforcement enabled`,
        );
      }
      console.log(`Verified restricted production role: ${role.expectedRole}`);
    } finally {
      await client.$disconnect();
    }
  }
}

main().catch((error: unknown) => {
  console.error(
    'Production database role setup failed. Confirm DATABASE_URL_UNPOOLED is the direct project owner URL, runtime URLs use the four documented login names, and the direct role can create login roles.',
  );
  console.error(safeErrorMessage(error));
  process.exitCode = 1;
});
