import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {openPostgresState} from '../src/runtime/postgres-state.mjs';

const url = process.env.RECEIPTLAB_TEST_DATABASE_URL;
const skip = !url && 'RECEIPTLAB_TEST_DATABASE_URL not configured';
const namespace = 'receiptlab-test-' + process.pid;

async function fixture(t) {
  const pool = new pg.Pool({connectionString: url, max: 4, ssl: url && !/localhost|127\.0\.0\.1/.test(new URL(url).hostname) ? {rejectUnauthorized: true} : false});
  t.after(async () => { await pool.query('DELETE FROM receiptlab_runtime_state WHERE namespace=$1', [namespace]).catch(()=>{}); await pool.end(); });
  await pool.query('CREATE TABLE IF NOT EXISTS receiptlab_runtime_state (namespace text PRIMARY KEY, revision bigint NOT NULL, snapshot jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
  await pool.query('DELETE FROM receiptlab_runtime_state WHERE namespace=$1', [namespace]);
  return pool;
}

test('PostgreSQL state snapshots preserve Maps and the receipt key across process restart', {skip}, async t => {
  const pool = await fixture(t);
  const first = await openPostgresState(pool, {namespace});
  const key = first.state.key;
  first.state.records.set('run-1', {status: 'completed', receipt: {sequence: 1}});
  first.state.sessions.set('session-1', {expiresAt: Date.now() + 60000, runs: new Map([['run-1', {approvalConsumed: true}]])});
  await first.save();
  await first.close();

  const restarted = await openPostgresState(pool, {namespace});
  assert.equal(restarted.state.key, key);
  assert.equal(restarted.state.records.get('run-1').receipt.sequence, 1);
  assert.equal(restarted.state.sessions.get('session-1').runs.get('run-1').approvalConsumed, true);
  await restarted.close();
});

test('PostgreSQL state recovers interrupted work without restoring a consumed approval', {skip}, async t => {
  const pool = await fixture(t);
  const first = await openPostgresState(pool, {namespace});
  first.state.sessions.set('session-1', {expiresAt: Date.now() + 60000, runs: new Map([['run-1', {diagnosing: true, recovering: true, approvalConsumed: true}]])});
  await first.save();
  await first.close();

  const restarted = await openPostgresState(pool, {namespace});
  const run = restarted.state.sessions.get('session-1').runs.get('run-1');
  assert.equal(run.diagnosing, false);
  assert.equal(run.recovering, false);
  assert.equal(run.interrupted, true);
  assert.equal(run.approvalConsumed, true);
  await restarted.close();
});

test('PostgreSQL compare-and-swap rejects a stale concurrent writer and poisons its store', {skip}, async t => {
  const pool = await fixture(t);
  const secondPool = new pg.Pool({connectionString: url, max: 2, ssl: url && !/localhost|127\.0\.0\.1/.test(new URL(url).hostname) ? {rejectUnauthorized: true} : false});
  t.after(()=>secondPool.end());
  const first = await openPostgresState(pool, {namespace});
  const second = await openPostgresState(secondPool, {namespace});
  first.state.records.set('writer-a', {status: 'saved'});
  second.state.records.set('writer-b', {status: 'stale'});
  await first.save();
  await assert.rejects(second.save(), /revision conflict|stale/i);
  assert.throws(()=>second.assertHealthy(), /unavailable/i);
  await first.close();
  await second.close();
  const row = await pool.query('SELECT snapshot FROM receiptlab_runtime_state WHERE namespace=$1', [namespace]);
  assert.deepEqual(row.rows[0].snapshot.records.$receiptlabMap.map(([id])=>id), ['writer-a']);
});
