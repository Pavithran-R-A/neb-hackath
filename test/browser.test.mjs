import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/server.mjs';
import { scenarios } from '../src/scenarios.mjs';
import { verifyCompletion } from '../src/verification.mjs';
import { launchBrowser, createBrowserSession } from '../src/agents/browser.mjs';
import { runBaseline } from '../src/agents/baseline.mjs';
import { runGuarded } from '../src/agents/guarded.mjs';
import { createScriptedPolicy } from '../src/agents/scripted.mjs';
import { createNemotronPolicy } from '../src/agents/nebius.mjs';

test('both browser agents execute all ten fixed cases; evaluator determines completion',async t=>{
 const app=await createApp();t.after(()=>app.close());const browser=await launchBrowser();t.after(()=>browser.close());
 for(const scenario of scenarios)await t.test(scenario.id,async()=>{
  for(const kind of ['baseline','scripted-control']){
   const run=app.createRun(scenario);const session=await createBrowserSession(browser,run);
   try{
    const result=kind==='baseline'?await runBaseline(session.page,scenario.task):await runGuarded(session.page,scenario.task,createScriptedPolicy());
    const verdict=verifyCompletion(app.readRecord(run.id),scenario.task,app.key);
    const expected=kind==='baseline'?['grant-clean','workshop-clean','workshop-injection'].includes(scenario.id):scenario.expectedCompletion;
    assert.equal(verdict.completed,expected,`${kind}: ${JSON.stringify(result)}`);
    assert.equal(session.blocked.length,0);assert.equal(result.inappropriateActionsExecuted,0);
    if(scenario.variant==='false-success'){assert.equal(result.claimedCompletion,true);assert.equal(verdict.completed,false);}
   }finally{await session.context.close();}
  }
 });
});
test('premature done and an untrusted policy cannot forge server completion',async t=>{
 const app=await createApp();t.after(()=>app.close());const browser=await launchBrowser();t.after(()=>browser.close());
 for(const actions of [[{type:'done'}],[{type:'goto',url:'https://example.com/collect'}],[{type:'fill',target:0,value:'Invented Person'}]]){
  const scenario=scenarios[0],run=app.createRun(scenario),session=await createBrowserSession(browser,run);
  try{
   const result=await runGuarded(session.page,scenario.task,{decide:async()=>({actions})});
   assert.equal(verifyCompletion(app.readRecord(run.id),scenario.task,app.key).completed,false);
   assert.equal(result.claimedCompletion,actions[0].type==='done');
   assert.equal(result.blockedActions,actions[0].type==='done'?0:1);
   assert.equal(app.readRecord(run.id).step,0);
  }finally{await session.context.close();}
 }
});
test('Nebius adapter action contract drives the real browser (simulated transport; no inference)',async t=>{
 const app=await createApp();t.after(()=>app.close());const browser=await launchBrowser();t.after(()=>browser.close());
 const scenario=scenarios[2],run=app.createRun(scenario),session=await createBrowserSession(browser,run);t.after(()=>session.context.close());
 const control=createScriptedPolicy(),model='nvidia/test-nemotron';
 const policy=createNemotronPolicy({apiKey:'test-only',model,approved:true,fetchImpl:async(url,options)=>{
  const input=JSON.parse(JSON.parse(options.body).messages[1].content);
  return new Response(JSON.stringify({model,choices:[{message:{content:JSON.stringify(await control.decide(input))},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:20}}));
 }});
 const result=await runGuarded(session.page,scenario.task,policy);
 assert.equal(result.claimedCompletion,true);assert.equal(verifyCompletion(app.readRecord(run.id),scenario.task,app.key).completed,true);
 assert.equal(policy.metrics().calls,4);
});
