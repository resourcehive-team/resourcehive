// Prepare synthetic fixtures in the already-running, explicitly confirmed test stack.
const { execFileSync, spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const root = path.resolve(__dirname, '..');
const identity = path.join(root, 'services', 'identity-service');
const localRequire = createRequire(path.join(identity, 'package.json'));

function docker(args) {
  return execFileSync('docker', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function environment(service) {
  const id = docker(['compose', '-f', 'docker-compose.yml', 'ps', '-q', service]).trim();
  if (!id || /\s/.test(id)) throw new Error(`Expected one running ${service} container.`);
  const [container] = JSON.parse(docker(['inspect', id]));
  if (!container.State.Running) throw new Error(`${service} is not running.`);
  return Object.fromEntries(container.Config.Env.map(entry => {
    const split = entry.indexOf('=');
    return [entry.slice(0, split), entry.slice(split + 1)];
  }));
}

async function main() {
  const confirmed = process.argv.includes('--confirm-nonproduction');
  if (!confirmed && !process.argv.includes('--check')) {
    throw new Error('Use --check for read-only checks, or --confirm-nonproduction to add synthetic fixtures to the running test database.');
  }
  const runtime = environment('identity-service');
  if (!runtime.DATABASE_URL) throw new Error('Identity container has no database URL.');
  for (const service of ['resource-service', 'booking-service', 'notification-service']) {
    const env = environment(service);
    if (env.DATABASE_URL !== runtime.DATABASE_URL) throw new Error(`${service} uses a different database configuration.`);
    if (service === 'notification-service' && (env.RESEND_ENABLED === 'true' || env.FCM_ENABLED === 'true')) {
      throw new Error('Disable RESEND and FCM in the running notification container before preparing load tests.');
    }
  }
  const config = JSON.parse(docker(['compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.perf.yml', '--profile', 'perf', 'config', '--format', 'json']));
  const perf = config.services.k6.environment;
  console.log('PASS: running services share a database; external notification delivery is disabled.');
  if (!confirmed) {
    console.log(docker(['compose', '-f', 'docker-compose.yml', 'exec', '-T', 'identity-service', 'node', '-e',
      `const {PrismaClient}=require('@resourcehive/database');const db=new PrismaClient();db.user.count({where:{email:{startsWith:'perf-user-',endsWith:'@resourcehive.test'}}}).then(n=>console.log('Synthetic performance users: '+n)).catch(()=>{console.error('Database prerequisite failed');process.exitCode=1}).finally(()=>db.$disconnect());`]).trim());
    return;
  }
  console.log('Preparing synthetic fixtures only. No database reset or migrations will run.');
  const ts = localRequire('typescript');
  const source = readFileSync(path.join(identity, 'scripts/seed-performance.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true } }).outputText;
  const preamble = `process.env.PERF_DATABASE_URL=process.env.DATABASE_URL;process.env.PERF_DATABASE_CONFIRM_NONPROD='YES';process.env.PERF_USER_COUNT=${JSON.stringify(String(perf.PERF_USER_COUNT))};process.env.PERF_USER_PASSWORD=${JSON.stringify(String(perf.PERF_USER_PASSWORD))};\n`;
  const result = spawnSync('docker', ['compose', '-f', 'docker-compose.yml', 'exec', '-T', 'identity-service', 'node'], {
    cwd: root,
    input: preamble + compiled,
    encoding: 'utf8',
    maxBuffer: 5 * 1024 * 1024,
  });
  // Redact connection strings and the synthetic password, including unexpected errors.
  for (const output of [result.stdout, result.stderr]) {
    if (output) process.stdout.write(output.replaceAll(runtime.DATABASE_URL, '[database URL redacted]').replaceAll(String(perf.PERF_USER_PASSWORD), '[password redacted]'));
  }
  if (result.error || result.status !== 0) throw new Error('Fixture preparation failed. Do not start k6 yet.');
  console.log('PASS: performance fixtures prepared. Ready for the k6 smoke test.');
}

main().catch(error => {
  // Docker errors can contain environment configuration. Do not echo their output.
  console.error(error.cmd || error.stdout || error.stderr ? 'Docker prerequisite check failed. Check that the local Compose stack is running.' : error.message);
  process.exitCode = 1;
});
