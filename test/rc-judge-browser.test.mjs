import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createWorkbench} from '../src/workbench/server.mjs';
import {launchBrowser} from '../src/agents/browser.mjs';
import {createDiagnosticPolicy} from '../src/diagnosis/nebius.mjs';
import {runDomBaseline} from '../src/agents/dom-baseline.mjs';

test('judge guide works without an account or model and exposes a recoverable cold start',async t=>{
 const server=await createWorkbench();t.after(()=>server.close());const browser=await launchBrowser();t.after(()=>browser.close());const page=await browser.newPage();t.after(()=>page.close());
 let attempts=0;await page.route('**/api/session',route=>++attempts===1?route.fulfill({status:503,json:{error:'Service warming up'}}):route.continue());
 await page.goto(server.origin);await page.getByRole('button',{name:'Retry connection'}).click();await page.waitForFunction(()=>!document.getElementById('create').disabled);
 await page.getByRole('button',{name:'Start positive case'}).click();await page.locator('#open').waitFor({state:'visible'});
 assert.equal(await page.locator('#scenario').inputValue(),'grant-transient');assert.match(await page.locator('#form-guide').textContent(),/Community garden/);
 assert.match(await page.locator('#model-status').textContent(),/inactive/);assert.equal(await page.locator('#diagnose-model').isDisabled(),true);
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.getByRole('button',{name:'Start negative case'}).click();await page.waitForFunction(()=>!document.getElementById('create').disabled);assert.equal(await page.locator('#scenario').inputValue(),'workshop-false-success');
});

test('simulated transport: semantic rejection is visible and raw model advice stays in warned details',async t=>{
 const server=await createWorkbench();t.after(()=>server.close());const browser=await launchBrowser();t.after(()=>browser.close());const page=await browser.newPage();t.after(()=>page.close());
 await page.route('**/diagnose',route=>route.fulfill({json:{id:'simulated',executionKind:'simulated-test',suggestion:{diagnosis:'ambiguous',explanation:'Stop for review.',confidence:'low',evidenceIds:[],recovery:{action:'stop',reason:'Conflicting evidence.'}},rawSuggestion:{diagnosis:'temporary_failure',explanation:'UNSAFE RAW ADVICE',confidence:'high',evidenceIds:['e1'],recovery:{action:'retry',reason:'UNSAFE RAW ACTION'}},semanticAssessment:{status:'review-required',reasons:['Receipt evidence conflicts with retry.'],rawHighConfidenceRejected:true},trace:{events:[{id:'e1',source:'server',kind:'status',text:'pending'}]},recoveryExecutable:false,usage:{totalTokens:123},latencyMs:10,estimatedCostUsd:0.001}}));
 await page.goto(server.origin);await page.waitForFunction(()=>!document.getElementById('create').disabled);await page.locator('#create').click();await page.locator('#open').waitFor({state:'visible'});await page.locator('#diagnose-rules').click();
 await page.getByText('Semantic safety check: review required',{exact:true}).waitFor();assert.equal(await page.getByText('UNSAFE RAW ADVICE',{exact:true}).isVisible(),false);assert.equal(await page.locator('#approval').isHidden(),true);
 await page.getByText('Review rejected raw model output (untrusted)',{exact:true}).click();assert.equal(await page.getByText('UNSAFE RAW ADVICE',{exact:true}).isVisible(),true);assert.match(await page.locator('#diagnosis').textContent(),/Simulated provider metrics: 123/);
});

test('model request announces waiting and session expiry offers a deliberate fresh start',async t=>{
 const server=await createWorkbench();t.after(()=>server.close());const browser=await launchBrowser();t.after(()=>browser.close());const page=await browser.newPage();t.after(()=>page.close());
 let release;const waiting=new Promise(resolve=>{release=resolve;});await page.route('**/diagnose',async route=>{await waiting;await route.fulfill({status:401,json:{error:'Session expired or missing; reload the workbench'}});});
 await page.goto(server.origin);await page.waitForFunction(()=>!document.getElementById('create').disabled);await page.locator('#create').click();await page.locator('#open').waitFor({state:'visible'});await page.locator('#diagnose-rules').click();
 assert.equal(await page.locator('#diagnose-rules').isDisabled(),true);assert.match(await page.locator('#activity').textContent(),/Please wait/);assert.equal(await page.locator('#diagnose-rules').getAttribute('aria-busy'),'true');release();
 await page.getByRole('button',{name:'Start a fresh session'}).waitFor({state:'visible'});assert.match(await page.locator('#error').textContent(),/expired runs cannot be recovered/);assert.equal(await page.locator('#approval').isHidden(),true);
});


test('simulated wrong NVIDIA retry passes through real server semantic gate before judge display',async t=>{
 let requests=0;
 const diagnosticPolicy=createDiagnosticPolicy({apiKey:'simulated-only',model:'nvidia/test-nemotron',approved:true,fetchImpl:async(_url,init)=>{
  requests++;const trace=JSON.parse(JSON.parse(init.body).messages.at(-1).content);
  return new Response(JSON.stringify({model:'nvidia/test-nemotron',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({diagnosis:'temporary_failure',explanation:'Wrong high-confidence interpretation of a success screen.',confidence:'high',evidenceIds:[trace.events.find(e=>e.id==='ui-claim').id],recovery:{action:'retry',reason:'Incorrect retry advice.'}})}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}));
 }});
 const server=await createWorkbench({diagnosticPolicy,diagnosticExecutionKind:'simulated-test'});t.after(()=>server.close());const browser=await launchBrowser();t.after(()=>browser.close());const context=await browser.newContext();t.after(()=>context.close());const page=await context.newPage();
 await page.goto(server.origin);await page.waitForFunction(()=>!document.getElementById('create').disabled);assert.equal(requests,0);await page.locator('#guided-negative').click();await page.locator('#open').waitFor({state:'visible'});
 const popup=context.waitForEvent('page');await page.locator('#open').click();const form=await popup;await form.locator('form').waitFor();await runDomBaseline(form,{name:'Avery Example',email:'avery@example.invalid',phone:'5550101234',detail:'Morning session',flow:'workshop',consent:true});
 await page.locator('#claim').check();await page.locator('#verify').click();await page.getByRole('heading',{name:'Completion claim rejected'}).waitFor();
 await page.locator('#diagnose-model').click();await page.getByText('The model gave an incorrect high-confidence recommendation. The safety check rejected it. This is a model error, not a correct diagnosis.',{exact:true}).waitFor();assert.equal(requests,1);assert.equal(await page.locator('#approval').isHidden(),true);assert.equal(await page.getByText('Wrong high-confidence interpretation of a success screen.',{exact:true}).isVisible(),false);
 await mkdir('.cache/qa',{recursive:true});await page.screenshot({path:'.cache/qa/judge-negative-simulated-gated.png',fullPage:true});
 await page.getByText('Review rejected raw model output (untrusted)',{exact:true}).click();assert.equal(await page.getByText('Wrong high-confidence interpretation of a success screen.',{exact:true}).isVisible(),true);assert.match(await page.locator('#diagnosis').textContent(),/Simulated provider metrics: 150/);
});
