import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/server.mjs';
import { scenarios } from '../src/scenarios.mjs';
import { holdoutScenarios } from '../src/holdout.mjs';
import { launchBrowser, createBrowserSession } from '../src/agents/browser.mjs';
import { runDomBaseline } from '../src/agents/dom-baseline.mjs';
import { runGuarded } from '../src/agents/guarded.mjs';
import { createScriptedPolicy } from '../src/agents/scripted.mjs';
import { verifyCompletion } from '../src/verification.mjs';
import { finalizeAttempt } from '../src/evaluation.mjs';

test('DOM baseline handles development and new evaluation tasks; server verification gates every report',async t=>{
 const app=await createApp();t.after(()=>app.close());const browser=await launchBrowser();t.after(()=>browser.close());
 for(const scenario of [...scenarios,...holdoutScenarios])await t.test(scenario.id,async()=>{
  const run=app.createRun(scenario),session=await createBrowserSession(browser,run);
  try{
   const attempt=await runDomBaseline(session.page,scenario.task);
   const verdict=verifyCompletion(app.readRecord(run.id),scenario.task,app.key,{runId:run.id});
   assert.equal(verdict.completed,scenario.expectedCompletion,JSON.stringify(attempt));
   const final=finalizeAttempt(attempt,verdict);assert.equal(final.reportedCompletion,verdict.completed);
   if(['changed-data','false-success'].includes(scenario.variant)){assert.equal(final.rawClaimedCompletion,true);assert.equal(final.rejectedCompletionClaim,true);}
  }finally{await session.context.close();}
 });
});
test('misleading success banner cannot become a user-visible completion without a server receipt',async t=>{
 const app=await createApp();t.after(()=>app.close());const browser=await launchBrowser();t.after(()=>browser.close());
 const scenario=holdoutScenarios.find(s=>s.variant==='misleading-banner'),run=app.createRun(scenario),session=await createBrowserSession(browser,run);t.after(()=>session.context.close());
 const attempt=await runGuarded(session.page,scenario.task,createScriptedPolicy());
 assert.equal(attempt.claimedCompletion,true);assert.equal(app.readRecord(run.id).step,0);
 const final=finalizeAttempt(attempt,verifyCompletion(app.readRecord(run.id),scenario.task,app.key,{runId:run.id}));
 assert.equal(final.reportedCompletion,false);assert.equal(final.rejectedCompletionClaim,true);
});
