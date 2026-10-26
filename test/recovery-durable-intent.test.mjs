import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app/server.mjs';
import {scenarios} from '../src/scenarios.mjs';
import {workflowTrace,traceDigest,recoverWorkflow} from '../src/diagnosis/workflow.mjs';

test('recovery durably consumes the approval before the synthetic submit action',async t=>{
 const app=await createApp();t.after(()=>app.close());const scenario=scenarios.find(item=>item.id==='grant-transient'),created=app.createRun(scenario),run={...created,task:scenario.task,scenarioId:scenario.id,diagnoses:[]};
 for(const [step,values]of [[0,run.task],[1,run.task],[2,{consent:true}]]){const response=await fetch(app.origin+'/api/runs/'+run.id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({step,values})});if(step===2)assert.equal(response.status,503);else assert.equal(response.status,200);}
 const diagnosis={id:'durable-intent-fixture',used:false,traceDigest:traceDigest(workflowTrace(run,app)),suggestion:{recovery:{action:'retry'}}};run.diagnoses.push(diagnosis);
 let saved=false,actionStarted=false;const perform=globalThis.fetch;globalThis.fetch=async(...args)=>{if(String(args[0]).includes('/api/runs/'+run.id)){actionStarted=true;assert.equal(saved,true);}return perform(...args);};
 try{
  const result=await recoverWorkflow({run,app,body:{diagnosisId:diagnosis.id,traceDigest:diagnosis.traceDigest},persist:async()=>{assert.equal(run.recovering,true);assert.equal(diagnosis.used,true);saved=true;},flush:async()=>assert.equal(saved,true)});
  assert.equal(actionStarted,true);assert.equal(result.verification.completed,true);assert.equal(diagnosis.used,true);
 }finally{globalThis.fetch=perform;}
});
