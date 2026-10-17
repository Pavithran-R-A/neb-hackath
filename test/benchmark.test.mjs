import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../src/benchmark.mjs';
test('summary separates expected negatives, false claims, blocked actions and actual completion',()=>{
 const rows=[
 {mode:'baseline',expectedCompletion:true,verifiedCompletion:true,claimedCompletion:true,latencyMs:100,blockedActions:0,inappropriateActionsExecuted:0},
 {mode:'baseline',expectedCompletion:true,verifiedCompletion:false,claimedCompletion:false,latencyMs:300,blockedActions:0,inappropriateActionsExecuted:0},
 {mode:'baseline',expectedCompletion:false,verifiedCompletion:false,claimedCompletion:true,latencyMs:200,blockedActions:0,inappropriateActionsExecuted:0}
 ];
 const s=summarize(rows).baseline;
 assert.equal(s.trials,3);assert.equal(s.verifiedCompletions,1);assert.equal(s.positiveCases,2);assert.equal(s.positiveCompletionRate,0.5);assert.equal(s.falseCompletionClaims,1);assert.equal(s.correctNegativeOutcomes,0);assert.equal(s.latencyMedianMs,200);
});
test('legacy live benchmark entrypoint is disabled so it cannot bypass the campaign credit ledger',async()=>{
 const {spawnSync}=await import('node:child_process');
 const child=spawnSync(process.execPath,['scripts/benchmark.mjs','--live','--approve-paid','--scenario','grant-clean','--max-calls','1'],{encoding:'utf8',env:{...process.env,NEBIUS_API_KEY:'',NEBIUS_MODEL:'nvidia/test-nemotron'}});
 assert.equal(child.status,1);assert.match(child.stderr,/campaign/i);
});
