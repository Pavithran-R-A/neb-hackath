import pg from 'pg';
import {randomBytes} from 'node:crypto';

// Hosted public and judge runtimes share the same durable application state.
// This namespace already contains production sessions, receipt keys and approvals.
export const POSTGRES_STATE_NAMESPACE = 'receiptlab';

const encode = value => JSON.stringify(value, (_key, item) => item instanceof Map ? {$receiptlabMap: [...item]} : item);
const decode = value => JSON.parse(typeof value === 'string' ? value : JSON.stringify(value), (_key, item) =>
  item && Object.keys(item).length === 1 && Array.isArray(item.$receiptlabMap) ? new Map(item.$receiptlabMap) : item);

export function createPostgresPool(connectionString = process.env.DATABASE_URL) {
  if (typeof connectionString !== 'string' || !connectionString) throw new Error('DATABASE_URL is required for PostgreSQL storage');
  let url;
  try { url = new URL(connectionString); } catch { throw new Error('DATABASE_URL is invalid'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password) throw new Error('DATABASE_URL must be a PostgreSQL URI with protected credentials');
  const sslmode = url.searchParams.get('sslmode');
  if (sslmode && !['require', 'verify-full'].includes(sslmode)) throw new Error('DATABASE_URL must require encrypted PostgreSQL transport');
  // node-postgres lets connection-string SSL fields replace the explicit TLS object.
  // Remove the provider's `sslmode=require` after validating it, then pin cert checks here.
  url.searchParams.delete('sslmode');
  for (const key of url.searchParams.keys()) if (/^ssl(?:cert|key|rootcert|crl|password|factory)$/i.test(key)) throw new Error('DATABASE_URL must use the runtime-verified PostgreSQL TLS trust');
  return new pg.Pool({connectionString:url.toString(), ssl: {rejectUnauthorized: true}, max: 4, connectionTimeoutMillis: 8000, idleTimeoutMillis: 30000, application_name: 'receiptlab'});
}

export async function openPostgresState(pool, {namespace = 'receiptlab'} = {}) {
  if (!pool || typeof pool.query !== 'function' || !/^[a-z0-9-]{1,80}$/.test(namespace)) throw new Error('PostgreSQL state configuration invalid');
  await pool.query('CREATE TABLE IF NOT EXISTS receiptlab_runtime_state (namespace text PRIMARY KEY, revision bigint NOT NULL CHECK (revision >= 0), snapshot jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
  const initial = {version: 1, key: randomBytes(32).toString('hex'), records: new Map(), sessions: new Map()};
  const inserted = await pool.query('INSERT INTO receiptlab_runtime_state(namespace,revision,snapshot) VALUES($1,0,$2::jsonb) ON CONFLICT(namespace) DO NOTHING RETURNING revision,snapshot', [namespace, encode(initial)]);
  const result = inserted.rows[0] ?? (await pool.query('SELECT revision,snapshot FROM receiptlab_runtime_state WHERE namespace=$1', [namespace])).rows[0];
  if (!result) throw new Error('PostgreSQL runtime row unavailable');
  let revision = BigInt(result.revision), state = decode(result.snapshot);
  const validate = () => {
    if (state.version !== 1 || !/^[a-f0-9]{64}$/.test(state.key) || !(state.records instanceof Map) || !(state.sessions instanceof Map)) throw new Error('PostgreSQL runtime state is invalid');
  };
  validate();
  let failed = false, closed = false, dirty = false, saving;
  const assertHealthy = () => { if (failed || closed) throw new Error('PostgreSQL runtime unavailable'); };
  const save = () => {
    assertHealthy(); dirty = true;
    if (saving) return saving;
    saving = (async () => {
      while (dirty) {
        dirty = false;
        const expected = revision, snapshot = encode(state);
        try {
          const updated = await pool.query('UPDATE receiptlab_runtime_state SET revision=revision+1,snapshot=$1::jsonb,updated_at=now() WHERE namespace=$2 AND revision=$3 RETURNING revision', [snapshot, namespace, expected.toString()]);
          if (updated.rowCount !== 1) throw new Error('PostgreSQL revision conflict; stale writer rejected');
          revision = BigInt(updated.rows[0].revision);
        } catch (error) {
          failed = true;
          if (/revision conflict/.test(error.message)) throw error;
          throw new Error('PostgreSQL runtime save failed; writes are halted');
        }
      }
    })().finally(() => { saving = undefined; });
    return saving;
  };
  let interrupted = false;
  for (const session of state.sessions.values()) for (const run of session.runs?.values?.() ?? []) {
    if (run.diagnosing || run.recovering) { run.interrupted = true; interrupted = true; }
    run.diagnosing = false;
    run.recovering = false;
  }
  if (interrupted) await save();
  return {
    state,
    save,
    flush: () => saving ?? Promise.resolve(),
    assertHealthy,
    async close() { if (closed) return; if (saving) await saving; closed = true; },
    revision: () => revision.toString(),
  };
}
