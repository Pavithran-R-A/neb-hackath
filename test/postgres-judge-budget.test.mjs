import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {createHash} from 'node:crypto';
import {openPostgresJudgeBudget} from '../src/runtime/postgres-judge-budget.mjs';

const connectionString = process.env.RECEIPTLAB_TEST_DATABASE_URL;
const code = 'integration-only-judge-access-code';
const initial = {at:'2026-10-26T00:00:00.000Z',event:'initial',initialAccountUsd:59,judgeReserveUsd:50,initialSpentUsd:0,basis:'SIMULATED ONLY'};
const baseHistory = JSON.stringify(initial)+'\n';
const plan = {id:'pg-judge-fixture',model:'nvidia/test-nemotron',sourceCommit:'a'.repeat(40),suiteSha256:'b'.repeat(64),accountHistoryBaseSha256:createHash('sha256').update(baseHistory).digest('hex'),maxRequests:2,dailyRequests:2,sessionRequests:1,maxOutputTokens:8192,spendLimitUsd:.1,inputUsdPerMillion:.1,outputUsdPerMillion:.3,scenarioIds:['grant-transient','workshop-false-success'],expiresAt:'2026-11-01T00:00:00Z'};
const reserved = {at:'2026-10-26T00:00:01.000Z',event:'reserved',campaignId:plan.id,maxReservedUsd:plan.spendLimitUsd,purpose:'SIMULATED TEST AUTHORIZATION',sourceCommit:plan.sourceCommit,suiteSha256:plan.suiteSha256};
const history = baseHistory+JSON.stringify(reserved)+'\n';
const clock = () => Date.parse('2026-10-26T12:00:00Z');
const ns = () => `pgtest-${process.pid}-${Math.random().toString(36).slice(2,10)}`;
const skip = {skip:!connectionString};

async function fixture(t, overrides={}) {
  if (!connectionString) return null;
  const pool = new pg.Pool({connectionString,ssl:false,max:8});
  const namespace = ns(), selectedPlan = {...plan,...overrides};
  const open = () => openPostgresJudgeBudget({pool,namespace,plan:selectedPlan,accessCode:code,accountHistory:history,now:clock});
  let budget = await open();
  t.after(async()=>{await budget?.close();await pool.query('DELETE FROM receiptlab_judge_budget WHERE namespace=$1',[namespace]);await pool.end();});
  return {pool,namespace,plan:selectedPlan,open,get budget(){return budget;},set budget(v){budget=v;}};
}

test('PostgreSQL judge budget survives restart, persists explicit access, settles usage and validates completion',skip,async t=>{
 const f=await fixture(t);await f.budget.authorize('session-a',code);const id=await f.budget.reserve({sessionId:'session-a',runId:'run-a',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192});
 await f.budget.settle(id,{inputTokens:100,outputTokens:50});await f.budget.finalize(id);await f.budget.close();f.budget=await f.open();
 assert.equal(await f.budget.authorized('session-a'),true);assert.equal((await f.budget.summary()).requests,1);assert.equal((await f.budget.summary()).unknownRequests,0);assert.equal((await f.budget.summary()).pendingRequests,0);
 await assert.rejects(()=>f.budget.reserve({sessionId:'session-a',runId:'run-a',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/already consumed/);
});

test('concurrent PostgreSQL reservations serialize globally and cannot overspend',skip,async t=>{
 const f=await fixture(t,{maxRequests:1,dailyRequests:1}),a=await f.budget.authorize('session-a',code),b=await f.budget.authorize('session-b',code);assert.equal(a,true);assert.equal(b,true);
 const attempt=sessionId=>f.budget.reserve({sessionId,runId:`run-${sessionId}`,scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192});
 const results=await Promise.allSettled([attempt('session-a'),attempt('session-b')]);
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.filter(result=>result.status==='rejected').length,1);assert.equal((await f.budget.summary()).requests,1);
});

test('an unsettled provider reservation halts after restart and protects the remaining envelope',skip,async t=>{
 const f=await fixture(t,{maxRequests:2});await f.budget.authorize('session-a',code);await f.budget.reserve({sessionId:'session-a',runId:'run-a',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192});
 await f.budget.close();f.budget=await f.open();const summary=await f.budget.summary();assert.equal(summary.halted,true);assert.equal(summary.unknownRequests,1);assert.ok(summary.committedUsd>0);await assert.rejects(()=>f.budget.reserve({sessionId:'session-a',runId:'run-b',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/halted/);
});

test('PostgreSQL judge budget refuses changed plan and account history',skip,async t=>{
 const f=await fixture(t);await assert.rejects(()=>openPostgresJudgeBudget({pool:f.pool,namespace:f.namespace,plan:{...plan,spendLimitUsd:.09},accessCode:code,accountHistory:history,now:clock}),/reservation\/history/);
 await assert.rejects(()=>openPostgresJudgeBudget({pool:f.pool,namespace:f.namespace,plan,accessCode:code,accountHistory:history+'\n',now:clock}),/explicit migration/);
});
