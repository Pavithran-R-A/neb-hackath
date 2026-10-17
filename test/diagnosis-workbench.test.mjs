import test from 'node:test';import assert from 'node:assert/strict';
import {createWorkbench} from '../src/workbench/server.mjs';
async function session(server){
 const landing=await fetch(server.origin),cookie=landing.headers.get('set-cookie').split(';')[0];
 const call=async(path,body)=>{const response=await fetch(server.origin+path,{method:body===undefined?'GET':'POST',headers:{cookie,origin:server.origin,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()};};return {call,cookie};
}
async function prepare(server,s,scenarioId){
 const {data:run}=await s.call('/api/runs',{scenarioId});
 const origin=new URL(run.url).origin;
 for(const step of [0,1,2])await fetch(origin+'/api/runs/'+run.id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({step,values:run.task})});
 return run;
}
test('workbench diagnoses actual failed trace then requires explicit single-use human-approved recovery',async t=>{
 const server=await createWorkbench();t.after(()=>server.close());const s=await session(server),run=await prepare(server,s,'grant-transient');
 const d=await s.call('/api/runs/'+run.id+'/diagnose',{mode:'deterministic'});
 assert.equal(d.status,200);assert.equal(d.data.suggestion.diagnosis,'temporary_failure');assert.equal(d.data.suggestion.recovery.action,'retry');assert.equal(d.data.recoveryExecutable,true);
 const approval={diagnosisId:d.data.id,traceDigest:d.data.traceDigest,approve:true};
 assert.equal((await s.call('/api/runs/'+run.id+'/recover',{...approval,approve:false})).status,400);
 const recovered=await s.call('/api/runs/'+run.id+'/recover',approval);assert.equal(recovered.status,200);assert.equal(recovered.data.verification.completed,true);
 assert.equal((await s.call('/api/runs/'+run.id+'/recover',approval)).status,409);
});
test('NVIDIA suggestions are distinct from verdicts and never execute automatically (mock transport)',async t=>{
 let calls=0;const diagnosticPolicy={diagnose:async trace=>{calls++;return {suggestion:{diagnosis:'temporary_failure',explanation:'Temporary failure reported by server',evidenceIds:[trace.events.find(e=>e.text.includes('Temporary')).id],recovery:{action:'retry',reason:'Check state and retry'},confidence:'high'},modelValidated:true,usage:{inputTokens:100,outputTokens:30,totalTokens:130},estimatedCostUsd:.0000132};}};
 const server=await createWorkbench({diagnosticPolicy,diagnosticExecutionKind:'simulated-test'});t.after(()=>server.close());const s=await session(server),run=await prepare(server,s,'grant-transient');
 const result=await s.call('/api/runs/'+run.id+'/diagnose',{mode:'nemotron'});assert.equal(result.status,200);assert.equal(calls,1);assert.equal(result.data.executionKind,'simulated-test');assert.equal(result.data.verifiedOutcome,false);
 const before=await s.call('/api/runs/'+run.id+'/verify',{claimedCompletion:true});assert.equal(before.data.reportedCompletion,false);
 const exportResult=await s.call('/api/runs/'+run.id+'/evidence');assert.ok(exportResult.data.provenance.runtimeSha256);assert.ok(exportResult.data.diagnoses.length);
});
test('model inactive, stale approvals and false UI completion never bypass private checks',async t=>{
 const server=await createWorkbench();t.after(()=>server.close());const s=await session(server),run=await prepare(server,s,'workshop-false-success');
 assert.equal((await s.call('/api/runs/'+run.id+'/diagnose',{mode:'nemotron'})).status,409);
 const d=await s.call('/api/runs/'+run.id+'/diagnose',{mode:'deterministic'});assert.equal(d.data.verifiedOutcome,false);assert.equal(d.data.recoveryExecutable,false);
 assert.equal((await s.call('/api/runs/'+run.id+'/recover',{diagnosisId:d.data.id,traceDigest:'wrong',approve:true})).status,409);
 const other=await session(server);assert.equal((await other.call('/api/runs/'+run.id+'/diagnose',{mode:'deterministic'})).status,404);
});

test('bounded live adapter denies scenarios outside campaign before invoking model',async t=>{
 let calls=0;const server=await createWorkbench({diagnosticPolicy:{diagnose:async()=>{calls++;throw new Error('must not call');}},allowedDiagnosticScenarios:['grant-transient']});t.after(()=>server.close());
 const s=await session(server),run=await prepare(server,s,'workshop-false-success');
 assert.equal((await s.call('/api/runs/'+run.id+'/diagnose',{mode:'nemotron'})).status,409);assert.equal(calls,0);
});
