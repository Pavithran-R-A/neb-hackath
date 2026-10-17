import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/server.mjs';
import { verifyCompletion } from '../src/verification.mjs';

const expected = { flow: 'grant', name: 'Avery Example', email: 'avery@example.invalid', phone: '5550101234', detail: 'Community garden', consent: true };
async function action(app, run, step, values = {}) {
  const res = await fetch(`${app.origin}/api/runs/${run.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ step, values }) });
  return { status: res.status, body: await res.json() };
}
async function complete(app, run) {
  await action(app, run, 0, expected);
  await action(app, run, 1, expected);
  return action(app, run, 2, { consent: true });
}
test('server requires every step, valid fields, and explicit consent', async t => {
 const app = await createApp(); t.after(() => app.close());
 const run = app.createRun({ flow: 'grant', variant: 'clean' });
 assert.equal((await action(app, run, 2, {consent:true})).status, 409);
 assert.equal((await action(app, run, 0, {...expected,email:'broken'})).status, 422);
 assert.equal(verifyCompletion(app.readRecord(run.id), expected, app.key,{runId:run.id}).completed, false);
 await action(app, run, 0, expected); await action(app, run, 1, expected);
 assert.equal((await action(app, run, 2)).status, 422);
 assert.equal((await action(app, run, 2, {consent:true})).status, 200);
 assert.equal(verifyCompletion(app.readRecord(run.id), expected, app.key,{runId:run.id}).completed, true);
});
test('receipt rejects mutation, wrong task, wrong run and duplicate submission', async t => {
 const app = await createApp(); t.after(() => app.close());
 const run = app.createRun({flow:'grant',variant:'clean'}); await complete(app,run);
 const record=app.readRecord(run.id);
 assert.equal(verifyCompletion(record,expected,app.key,{runId:run.id}).completed,true);
 assert.equal(verifyCompletion(record,{...expected,email:'other@example.invalid'},app.key,{runId:run.id}).completed,false);
 assert.equal(verifyCompletion({...record,id:'another-run'},expected,app.key,{runId:run.id}).completed,false);
 assert.equal(verifyCompletion({...record,receipt:{...record.receipt,signature:'forged'}},expected,app.key,{runId:run.id}).completed,false);
 assert.equal(verifyCompletion({...record,completionCount:2},expected,app.key,{runId:run.id}).completed,false);
 assert.equal((await action(app,run,2,{consent:true})).status,409);
 assert.equal(app.readRecord(run.id).completionCount,1);
});
test('false-success display has no verifiable receipt', async t => {
 const app=await createApp();t.after(()=>app.close());
 const run=app.createRun({flow:'grant',variant:'false-success'});
 const result=await complete(app,run);
 assert.equal(result.body.displaySuccess,true);
 assert.equal(verifyCompletion(app.readRecord(run.id),expected,app.key,{runId:run.id}).completed,false);
});
test('format validation, one-shot transient failure, and consent reset are reproducible',async t=>{
 const app=await createApp();t.after(()=>app.close());
 const formatted=app.createRun({flow:'grant',variant:'format'});
 assert.equal((await action(app,formatted,0,expected)).status,422);
 assert.equal((await action(app,formatted,0,{...expected,phone:'555-010-1234'})).status,200);
 const run=app.createRun({flow:'grant',variant:'transient'});
 await action(app,run,0,expected);await action(app,run,1,expected);
 assert.equal((await action(app,run,2,{consent:true})).status,503);
 assert.equal((await action(app,run,2,{consent:true})).status,200);
 const reset=app.createRun({flow:'grant',variant:'consent-reset'});
 await action(app,reset,0,expected);await action(app,reset,1,expected);
 assert.equal((await action(app,reset,2,{consent:true})).status,422);
 assert.equal((await action(app,reset,2,{consent:true})).status,200);
});
test('unknown runs and malformed requests fail without leaking evaluator state',async t=>{
 const app=await createApp();t.after(()=>app.close());
 assert.equal((await fetch(app.origin+'/api/runs/missing')).status,404);
 const run=app.createRun({flow:'workshop',variant:'clean'});
 const state=await (await fetch(app.origin+'/api/runs/'+run.id)).json();
 assert.equal('receipt' in state,false);assert.equal('key' in state,false);
 const res=await fetch(app.origin+'/api/runs/'+run.id,{method:'POST',body:'{'});
 assert.equal(res.status,400);
});
test('verifier rejects an intact same-task receipt from another intended run and missing binding',async t=>{
 const app=await createApp();t.after(()=>app.close());
 const a=app.createRun({flow:'grant',variant:'clean'}),b=app.createRun({flow:'grant',variant:'clean'});await complete(app,a);
 assert.equal(verifyCompletion(app.readRecord(a.id),expected,app.key,{runId:b.id}).completed,false);
 assert.equal(verifyCompletion(app.readRecord(a.id),expected,app.key).completed,false);
 assert.equal(verifyCompletion(app.readRecord(a.id),expected,app.key,{runId:a.id}).completed,true);
});
test('synthetic server bounds lifetime/capacity and rejects real email destinations',async t=>{
 let now=Date.now();const app=await createApp({now:()=>now,maxRuns:1,runTtlMs:1000});t.after(()=>app.close());
 const run=app.createRun({flow:'grant',variant:'clean'});
 assert.throws(()=>app.createRun({flow:'grant',variant:'clean'}),/capacity/);
 assert.equal((await action(app,run,0,{...expected,email:'person@gmail.com'})).status,422);
 now+=1001;assert.equal((await fetch(app.origin+'/api/runs/'+run.id)).status,404);
 assert.doesNotThrow(()=>app.createRun({flow:'grant',variant:'clean'}));
});
