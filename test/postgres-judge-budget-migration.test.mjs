import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {openPostgresJudgeBudget,preparePostgresJudgeBudgetSuccessor,activatePostgresJudgeBudgetSuccessor} from '../src/runtime/postgres-judge-budget.mjs';
import {readCanonicalJudgeHistory} from '../src/runtime/judge-account-history.mjs';

const connectionString = process.env.RECEIPTLAB_TEST_DATABASE_URL;
const code = 'isolated-migration-fixture-only-access-code';
const initial = {at:'2026-10-26T00:00:00.000Z',event:'initial',initialAccountUsd:59,judgeReserveUsd:50,initialSpentUsd:0,basis:'SIMULATED ONLY'};
const baseHistory = JSON.stringify(initial)+'\n';
const previousPlan = {
  id:'pg-migration-fixture',model:'nvidia/test-nemotron',sourceCommit:'a'.repeat(40),runtimeSha256:'c'.repeat(64),suiteSha256:'b'.repeat(64),
  accountHistoryBaseSha256:createHash('sha256').update(baseHistory).digest('hex'),maxRequests:4,dailyRequests:3,sessionRequests:2,
  maxOutputTokens:8192,spendLimitUsd:.1,inputUsdPerMillion:.1,outputUsdPerMillion:.3,
  scenarioIds:['grant-transient','workshop-false-success'],expiresAt:'2026-11-01T00:00:00Z',
};
const reservation = {at:'2026-10-26T00:00:01.000Z',event:'reserved',campaignId:previousPlan.id,maxReservedUsd:previousPlan.spendLimitUsd,purpose:'SIMULATED TEST AUTHORIZATION',sourceCommit:previousPlan.sourceCommit,suiteSha256:previousPlan.suiteSha256};
const history = baseHistory+JSON.stringify(reservation)+'\n';
const nextPlan = {...previousPlan,sourceCommit:'d'.repeat(40),runtimeSha256:'e'.repeat(64),expiresAt:'2026-12-23T20:00:00Z'};
const clock = () => Date.parse('2026-10-26T12:00:00Z');
const ns = () => `pgmig-${process.pid}-${Math.random().toString(36).slice(2,10)}`;
const skip = {skip:!connectionString};

async function fixture(t) {
  if (!connectionString) return null;
  const pool = new pg.Pool({connectionString,ssl:false,max:8}), namespace = ns();
  const open = (plan=previousPlan) => openPostgresJudgeBudget({pool,namespace,plan,accessCode:code,accountHistory:history,now:clock});
  let budget = await open();
  t.after(async()=>{
    await budget?.close();
    await pool.query('DELETE FROM receiptlab_judge_budget_migration_events WHERE namespace=$1',[namespace]);
    await pool.query('DELETE FROM receiptlab_judge_budget_migrations WHERE namespace=$1',[namespace]);
    await pool.query('DELETE FROM receiptlab_judge_budget WHERE namespace=$1',[namespace]);
    await pool.end();
  });
  return {pool,namespace,open,get budget(){return budget;},set budget(v){budget=v;}};
}

async function setupHalted(f) {
  await f.budget.authorize('session-a',code);
  const originalCall = await f.budget.reserve({sessionId:'session-a',runId:'run-a',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192});
  await f.budget.close(); f.budget=await f.open();
  assert.equal((await f.budget.summary()).halted,true);
  return originalCall;
}

async function installMigrationSchema(pool) {
  await pool.query(await readFile(new URL('../migrations/neon/003_judge_budget_successor.sql',import.meta.url),'utf8'));
}

const validEvidence = {
  providerUsage:'unknown-reservation-retained',providerEvidenceRef:'fixture-provider-evidence',promoCreditsVerified:true,
  stopUsageVerified:true,noCashExposureVerified:true,organizerPermissionRef:'fixture-organizer-permission',
  operator:'fixture-operator',verifiedAt:'2026-10-26T12:00:00.000Z',
};

test('successor migration prepares without changing legacy row, stays halted, then shares ledger and rolls back fail-closed',skip,async t=>{
  const f=await fixture(t), originalCall=await setupHalted(f);
  await installMigrationSchema(f.pool);
  const before=await f.pool.query('SELECT plan_hash,history_hash,snapshot FROM receiptlab_judge_budget WHERE namespace=$1',[f.namespace]);
  const prepared=await preparePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-2026-12-23',previousPlan,nextPlan,accessCode:code,previousAccountHistory:history,nextAccountHistory:history,now:clock});
  assert.deepEqual(prepared,{migrationId:'window-2026-12-23',status:'prepared',idempotent:false,legacyHalted:true,unknownReservationNanoUsd:Number((await f.budget.summary()).committedUsd*1e9)});
  const after=await f.pool.query('SELECT plan_hash,history_hash,snapshot FROM receiptlab_judge_budget WHERE namespace=$1',[f.namespace]);
  assert.deepEqual(after.rows[0],before.rows[0]);
  assert.equal((await f.pool.query("SELECT count(*)::int AS n FROM receiptlab_judge_budget_migration_events WHERE namespace=$1 AND event_type='prepared'",[f.namespace])).rows[0].n,1);
  f.budget=await f.open(nextPlan);
  let summary=await f.budget.summary();
  assert.equal(summary.halted,true);assert.equal(summary.legacyHalted,true);assert.equal(summary.successorStatus,'prepared');assert.equal(summary.requests,1);
  await assert.rejects(()=>f.budget.authorize('session-b','fixture'),/not active/);
  assert.deepEqual(await f.pool.query('SELECT snapshot FROM receiptlab_judge_budget WHERE namespace=$1',[f.namespace]).then(r=>r.rows[0].snapshot),before.rows[0].snapshot);

  await activatePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-2026-12-23',nextPlan,accessCode:code,evidence:validEvidence,now:clock});
  assert.deepEqual(await activatePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-2026-12-23',nextPlan,accessCode:code,evidence:validEvidence,now:clock}),
    {migrationId:'window-2026-12-23',status:'active',idempotent:true,legacyHalted:true});
  assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM receiptlab_judge_budget_migration_events WHERE namespace=$1',[f.namespace])).rows[0].n,2);
  assert.deepEqual(await preparePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-2026-12-23',previousPlan,nextPlan,accessCode:code,previousAccountHistory:history,nextAccountHistory:history,now:clock}),
    {migrationId:'window-2026-12-23',status:'active',idempotent:true,legacyHalted:true,unknownReservationNanoUsd:Number((await f.budget.summary()).committedUsd*1e9)});
  summary=await f.budget.summary();assert.equal(summary.halted,false);assert.equal(summary.legacyHalted,true);assert.equal(summary.successorStatus,'active');
  await assert.rejects(()=>f.budget.reserve({sessionId:'session-a',runId:'run-a',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/already consumed/);
  const successorCall=await f.budget.reserve({sessionId:'session-a',runId:'run-b',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192});
  summary=await f.budget.summary();assert.equal(summary.requests,2);assert.equal(summary.unknownRequests,2);assert.ok(summary.committedUsd>.0);
  assert.deepEqual(await preparePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-2026-12-23',previousPlan,nextPlan,accessCode:code,previousAccountHistory:history,nextAccountHistory:history,now:clock}),
    {migrationId:'window-2026-12-23',status:'active',idempotent:true,legacyHalted:true,unknownReservationNanoUsd:prepared.unknownReservationNanoUsd});
  await f.budget.close();f.budget=await f.open(nextPlan);
  summary=await f.budget.summary();assert.equal(summary.halted,true);assert.equal(summary.legacyHalted,true);assert.equal(summary.successorStatus,'active');
  await assert.rejects(()=>f.budget.reserve({sessionId:'session-a',runId:'run-c',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/unresolved provider usage/);
  const snapshot=(await f.pool.query('SELECT plan_hash,history_hash,snapshot FROM receiptlab_judge_budget WHERE namespace=$1',[f.namespace])).rows[0];
  assert.equal(snapshot.plan_hash,before.rows[0].plan_hash);assert.equal(snapshot.history_hash,before.rows[0].history_hash);
  assert.equal(snapshot.snapshot.calls[0].id,originalCall);assert.equal(snapshot.snapshot.calls[0].validated,false);
  assert.equal(snapshot.snapshot.calls[1].id,successorCall);assert.equal(snapshot.snapshot.calls[1].source,nextPlan.sourceCommit);
  await f.budget.close();f.budget=await f.open(previousPlan);
  summary=await f.budget.summary();assert.equal(summary.halted,true);assert.equal(summary.requests,2);assert.equal(summary.unknownRequests,2);
});

test('successor migration rejects changed limits, history, stale snapshots, and incomplete activation evidence',skip,async t=>{
  const f=await fixture(t);await setupHalted(f);await installMigrationSchema(f.pool);
  await assert.rejects(()=>preparePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-bad-limits',previousPlan,nextPlan:{...nextPlan,spendLimitUsd:.2},accessCode:code,previousAccountHistory:history,nextAccountHistory:history,now:clock}),/limits|accounting/);
  await assert.rejects(()=>preparePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-bad-expiry',previousPlan,nextPlan:{...nextPlan,expiresAt:'2026-12-23T20:00:00.001Z'},accessCode:code,previousAccountHistory:history,nextAccountHistory:history,now:clock}),/Invalid bounded judge configuration/);
  await assert.rejects(()=>preparePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-bad-quota',previousPlan,nextPlan:{...nextPlan,dailyRequests:2},accessCode:code,previousAccountHistory:history,nextAccountHistory:history,now:clock}),/limits|accounting/);
  await assert.rejects(()=>preparePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-bad-history',previousPlan,nextPlan,accessCode:code,previousAccountHistory:history,nextAccountHistory:history+' ',now:clock}),/byte-for-byte/);
  await preparePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-stale-snapshot',previousPlan,nextPlan,accessCode:code,previousAccountHistory:history,nextAccountHistory:history,now:clock});
  await assert.rejects(()=>f.open({...nextPlan,sourceCommit:'f'.repeat(40)}),/explicit migration/);
  await assert.rejects(()=>activatePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-stale-snapshot',nextPlan,accessCode:code,evidence:{...validEvidence,organizerPermissionRef:''},now:clock}),/evidence/);
  await f.budget.authorize('session-b','fixture');
  await assert.rejects(()=>activatePostgresJudgeBudgetSuccessor({pool:f.pool,namespace:f.namespace,migrationId:'window-stale-snapshot',nextPlan,accessCode:code,evidence:validEvidence,now:clock}),/preconditions changed/);
  assert.equal((await f.budget.summary()).halted,true);
});

test('successor migration preparation is idempotent under concurrent duplicate attempts',skip,async t=>{
  const f=await fixture(t);await setupHalted(f);await installMigrationSchema(f.pool);
  const args={pool:f.pool,namespace:f.namespace,migrationId:'window-concurrent',previousPlan,nextPlan,accessCode:code,previousAccountHistory:history,nextAccountHistory:history,now:clock};
  const results=await Promise.all([preparePostgresJudgeBudgetSuccessor(args),preparePostgresJudgeBudgetSuccessor(args)]);
  assert.deepEqual(results.map(result=>result.status),['prepared','prepared']);
  assert.equal(results.filter(result=>result.idempotent).length,1);
  assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM receiptlab_judge_budget_migrations WHERE namespace=$1',[f.namespace])).rows[0].n,1);
  assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM receiptlab_judge_budget_migration_events WHERE namespace=$1',[f.namespace])).rows[0].n,1);
});

test('prepared successor reconstructs immutable reservation regardless of JSON property order',skip,async t=>{
  const f=await fixture(t);
  await setupHalted(f);
  await installMigrationSchema(f.pool);
  await preparePostgresJudgeBudgetSuccessor({
    pool:f.pool,namespace:f.namespace,migrationId:'order-independent-2026',
    previousPlan,nextPlan,accessCode:code,previousAccountHistory:history,nextAccountHistory:history,now:clock
  });
  const reordered=Object.fromEntries(Object.entries(nextPlan).reverse());
  const canonical=await readCanonicalJudgeHistory({pool:f.pool,baseHistory,plan:reordered,namespace:f.namespace});
  const predecessorCanonical=await readCanonicalJudgeHistory({pool:f.pool,baseHistory,plan:previousPlan,namespace:f.namespace});
  assert.equal(canonical,predecessorCanonical,'reordering successor JSON must reconstruct the same predecessor canonical reservation');
  assert.ok(canonical.includes(previousPlan.sourceCommit));
  assert.ok(!canonical.includes(nextPlan.sourceCommit));
  assert.notEqual(reordered.sourceCommit,previousPlan.sourceCommit);
  const saved=await f.pool.query(
    "SELECT status,to_plan_json FROM receiptlab_judge_budget_migrations WHERE namespace=$1 AND migration_id=$2",
    [f.namespace,'order-independent-2026']);
  assert.equal(saved.rows[0].status,'prepared');
  assert.notEqual(saved.rows[0].to_plan_json,JSON.stringify(reordered));
  assert.equal(saved.rows[0].to_plan_json,JSON.stringify(nextPlan));
});
