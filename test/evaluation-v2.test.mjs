import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app/server.mjs';
import {evaluationV2,suiteSha256} from '../src/evaluation-v2.mjs';
import {verifyCompletion} from '../src/verification.mjs';

test('v2 has nine frozen author-visible candidates with explicit evaluation boundaries',()=>{
 assert.equal(evaluationV2.length,9);assert.match(suiteSha256,/^[a-f0-9]{64}$/);assert.ok(Object.isFrozen(evaluationV2));
 assert.equal(new Set(evaluationV2.map(s=>s.id)).size,9);assert.ok(evaluationV2.every(s=>s.split==='evaluation-v2'&&Object.isFrozen(s.task)));
});
test('new fixtures produce expected receipts and safe negatives through their actual HTTP state machines',async t=>{
 const app=await createApp();t.after(()=>app.close());
 for(const scenario of evaluationV2)await t.test(scenario.id,async()=>{
  const run=app.createRun(scenario);let state={step:0,displaySuccess:false},tries=0;
  while(!state.displaySuccess&&tries++<8){
   const res=await fetch(app.origin+'/api/runs/'+run.id,{method:'POST',body:JSON.stringify({step:state.step,values:{...scenario.task,phone:scenario.task.phone.replace(/^(\d{3})(\d{3})(\d{4})$/,'$1-$2-$3')}})});
   const text=await res.text();try{state=JSON.parse(text);}catch{continue;}
  }
  assert.equal(verifyCompletion(app.readRecord(run.id),scenario.task,app.key,{runId:run.id}).completed,scenario.expectedCompletion);
 });
});
