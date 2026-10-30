import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readCanonicalJudgeHistory} from '../src/runtime/judge-account-history.mjs';

const base='{"event":"initial","initialAccountUsd":59,"judgeReserveUsd":50}\n';
const oldPlan={id:'judge-fixture',sourceCommit:'a'.repeat(40),suiteSha256:'b'.repeat(64),spendLimitUsd:0.5};
const newPlan={...oldPlan,sourceCommit:'c'.repeat(40)};
const historyFor=plan=>base+JSON.stringify({
  event:'reserved',campaignId:plan.id,maxReservedUsd:plan.spendLimitUsd,
  purpose:'Bounded hosted judge inference envelope; unknown usage is retained and halts admission',
  sourceCommit:plan.sourceCommit,suiteSha256:plan.suiteSha256,
})+'\n';

test('successor startup preserves the predecessor canonical history byte for byte',async()=>{
  const pool={async query(sql,args){
    assert.match(sql,/status IN \('prepared','active','halted'\)/);
    assert.deepEqual(args,['receiptlab-judge',JSON.stringify(newPlan)]);
    return {rowCount:1,rows:[{from_plan_json:JSON.stringify(oldPlan)}]};
  }};
  const history=await readCanonicalJudgeHistory({pool,baseHistory:base,plan:newPlan});
  assert.equal(history,historyFor(oldPlan));
  assert.equal(createHash('sha256').update(history).digest('hex'),
    createHash('sha256').update(historyFor(oldPlan)).digest('hex'));
  assert.notEqual(history,historyFor(newPlan));
});

test('legacy startup reconstructs original reservation when migration table does not exist',async()=>{
  const pool={async query(){const error=new Error('relation does not exist');error.code='42P01';throw error;}};
  assert.equal(await readCanonicalJudgeHistory({pool,baseHistory:base,plan:oldPlan}),historyFor(oldPlan));
});

test('successor startup fails closed on incompatible predecessor and database failures',async()=>{
  const stale={...oldPlan,spendLimitUsd:0.6};
  await assert.rejects(()=>readCanonicalJudgeHistory({
    pool:{async query(){return {rowCount:1,rows:[{from_plan_json:JSON.stringify(stale)}]};}},
    baseHistory:base,plan:newPlan}),/predecessor reservation invalid/);
  await assert.rejects(()=>readCanonicalJudgeHistory({
    pool:{async query(){throw new Error('database offline');}},
    baseHistory:base,plan:newPlan}),/database offline/);
  await assert.rejects(()=>readCanonicalJudgeHistory({
    pool:{async query(){return {rowCount:2,rows:[]};}},
    baseHistory:base,plan:newPlan}),/Conflicting/);
});
