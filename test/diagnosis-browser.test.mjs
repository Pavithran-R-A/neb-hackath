import test from 'node:test';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
import {createWorkbench} from '../src/workbench/server.mjs';import {createDiagnosticPolicy} from '../src/diagnosis/nebius.mjs';import {launchBrowser,clickAndSettle} from '../src/agents/browser.mjs';
test('full mocked NVIDIA diagnosis → grounded evidence → human approval → real signed recovery',async t=>{
 let requests=0;
 const diagnosticPolicy=createDiagnosticPolicy({apiKey:'test-only',model:'nvidia/test-nemotron',approved:true,fetchImpl:async(_url,init)=>{
  requests++;const trace=JSON.parse(JSON.parse(init.body).messages.at(-1).content),event=trace.events.find(e=>e.text.includes('Temporary submission error'));
  return new Response(JSON.stringify({model:'nvidia/test-nemotron',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({diagnosis:'temporary_failure',explanation:'The server reports a temporary error. <img src=x onerror=alert(1)>',evidenceIds:[event.id],recovery:{action:'retry',reason:'Existing state is not completed; retry only with user approval.'},confidence:'high'})}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}));
 }});
 const server=await createWorkbench({diagnosticPolicy,diagnosticExecutionKind:'simulated-test'});t.after(()=>server.close());
 const browser=await launchBrowser();t.after(()=>browser.close());const context=await browser.newContext();t.after(()=>context.close());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin);await page.waitForFunction(()=>!document.getElementById('create').disabled);await page.locator('#scenario').selectOption('grant-transient');await page.locator('#create').click();
 const popup=context.waitForEvent('page');await page.locator('#open').click();const form=await popup;await form.locator('form').waitFor();
 await form.getByLabel('Full name',{exact:true}).fill('Avery Example');await form.getByLabel('Email',{exact:true}).fill('avery@example.invalid');await form.getByLabel('Telephone',{exact:true}).fill('5550101234');
 await clickAndSettle(form,form.getByRole('button',{name:'Next',exact:true}));await form.getByLabel('Project title',{exact:true}).fill('Community garden');await clickAndSettle(form,form.getByRole('button',{name:'Next',exact:true}));
 await form.getByLabel('I consent to this fictional application').check();await clickAndSettle(form,form.getByRole('button',{name:'Submit application'}));
 await page.getByRole('button',{name:'Ask NVIDIA Nemotron'}).click();await page.getByRole('heading',{name:'Simulated model suggestion — temporary failure'}).waitFor();
 assert.equal(requests,1);assert.equal(await page.locator('#diagnosis img').count(),0);assert.equal(await page.locator('#recover').isDisabled(),true);
 await page.getByLabel('I approve this synthetic recovery action').check();await page.locator('#recover').click();await page.getByText('Recovery applied. Independent verification confirms completion.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Check server state'}).click();await page.getByRole('heading',{name:'Verified completion',exact:true}).waitFor();
 await mkdir('.cache/qa',{recursive:true});await page.screenshot({path:'.cache/qa/diagnosis-simulated.png',fullPage:true});
 for(const width of [320,768,1024,1440]){await page.setViewportSize({width,height:1100});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);
});
