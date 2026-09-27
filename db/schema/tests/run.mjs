import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const schemaDirectory = path.resolve(scriptDirectory, '..');
const migrationsDirectory = path.join(schemaDirectory, 'migrations');

function requireTestDatabaseUrl() {
  const connectionString = process.env.TEST_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'TEST_DATABASE_URL must point to an empty, disposable PostgreSQL database.',
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(connectionString);
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid PostgreSQL connection URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
    throw new Error('TEST_DATABASE_URL must use the postgres or postgresql scheme.');
  }

  return connectionString;
}

function removePsqlMetaCommands(sql) {
  return sql.replace(/^\s*\\(?:set|echo)\b.*$/gim, '').trim();
}

async function runSqlFile(client, filePath, label) {
  const sql = removePsqlMetaCommands(await readFile(filePath, 'utf8'));
  await client.query(sql);
  console.log(`PASS ${label}`);
}

async function assertDatabaseIsEmpty(client) {
  const result = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
    LIMIT 10
  `);

  if (result.rowCount > 0) {
    const tables = result.rows
      .map(({ table_schema, table_name }) => `${table_schema}.${table_name}`)
      .join(', ');
    throw new Error(
      `Refusing to run because the database is not empty. Found tables: ${tables}. Use an empty disposable database.`,
    );
  }
}

async function resetPreviouslyInitializedTestDatabase(client) {
  const tables = await client.query(`
    SELECT to_regclass('public.users') IS NOT NULL AS has_users,
           to_regclass('public.bookings') IS NOT NULL AS has_bookings
  `);

  if (!tables.rows[0].has_users || !tables.rows[0].has_bookings) {
    throw new Error(
      'Reset refused: this database does not contain the database test runner tables.',
    );
  }

  const fixtures = await client.query(
    `SELECT
       EXISTS (SELECT 1 FROM public.users WHERE id = $1) AS has_test_user,
       EXISTS (SELECT 1 FROM public.bookings WHERE resource_slot_id = $2) AS has_test_booking`,
    [
      '60000000-0000-0000-0000-000000000001',
      '90000000-0000-0000-0000-000000000001',
    ],
  );

  if (!fixtures.rows[0].has_test_user || !fixtures.rows[0].has_test_booking) {
    throw new Error(
      'Reset refused: the expected database test fixtures were not found.',
    );
  }

  await client.query('BEGIN');
  try {
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }

  console.log('PASS previously initialized test database reset');
}

async function runConcurrentBookingAttempt(userId) {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO bookings (resource_slot_id, user_id) VALUES ($1, $2)`,
      ['90000000-0000-0000-0000-000000000001', userId],
    );
    await client.query('SELECT pg_sleep(1)');
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return { success: false, code: error.code, message: error.message };
  } finally {
    await client.end();
  }
}

async function run() {
  const connectionString = requireTestDatabaseUrl();
  const resetRequested = process.argv.includes('--reset');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (resetRequested) {
      await resetPreviouslyInitializedTestDatabase(client);
    }
    await assertDatabaseIsEmpty(client);
    console.log('PASS target database is empty');

    const migrationDirectories = (await readdir(migrationsDirectory, {
      withFileTypes: true,
    }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const migrationDirectory of migrationDirectories) {
      const filePath = path.join(
        migrationsDirectory,
        migrationDirectory,
        'migration.sql',
      );
      await runSqlFile(
        client,
        filePath,
        `migration ${migrationDirectory}`,
      );
    }

    await runSqlFile(
      client,
      path.join(scriptDirectory, 'notification_delivery.sql'),
      'notification delivery schema checks',
    );
    await runSqlFile(
      client,
      path.join(scriptDirectory, 'integrity.sql'),
      'database integrity checks',
    );
    await runSqlFile(
      client,
      path.join(scriptDirectory, 'concurrent_booking_fixture.sql'),
      'concurrent booking fixture',
    );
  } finally {
    await client.end();
  }

  const attempts = await Promise.all([
    runConcurrentBookingAttempt('60000000-0000-0000-0000-000000000001'),
    runConcurrentBookingAttempt('60000000-0000-0000-0000-000000000002'),
  ]);
  const successfulAttempts = attempts.filter(({ success }) => success).length;

  if (successfulAttempts !== 1) {
    console.error('FAIL expected exactly one concurrent booking to succeed.');
    for (const [index, attempt] of attempts.entries()) {
      console.error(
        `Attempt ${index + 1}: ${attempt.success ? 'succeeded' : `${attempt.code ?? 'ERROR'} ${attempt.message ?? ''}`}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  const verifyClient = new Client({ connectionString });
  await verifyClient.connect();
  try {
    const result = await verifyClient.query(
      `SELECT COUNT(*)::int AS count FROM bookings WHERE resource_slot_id = $1`,
      ['90000000-0000-0000-0000-000000000001'],
    );

    if (result.rows[0].count !== 1) {
      throw new Error(
        `Expected one persisted concurrent booking, found ${result.rows[0].count}.`,
      );
    }
  } finally {
    await verifyClient.end();
  }

  console.log('PASS exactly one concurrent booking persisted');
  console.log('Database schema, integrity, and concurrency tests passed.');
}

run().catch((error) => {
  console.error(`Database test failed: ${error.message}`);
  process.exitCode = 1;
});
