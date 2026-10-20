import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createWorkbench} from '../src/workbench/server.mjs';
import {createApp} from '../src/app/server.mjs';
import {launchBrowser,createBrowserSession} from '../src/agents/browser.mjs';
import {runDomBaseline} from '../src/agents/dom-baseline.mjs';
import {verifyCompletion} from '../src/verification.mjs';
import {evaluationV2} from '../src/evaluation-v2.mjs';
const task={name:'Avery Example',email:'avery@example.invalid',phone:'5550101234',detail:'Community garden',flow:'grant',consent:true};

test('first screen explains false-success risk, independent proof and NVIDIA boundary',async t=>{
 const server=await createWorkbench();t.after(()=>server.close());const browser=await launchBrowser();t.after(()=>browser.close());const page=await browser.newPage();t.after(()=>page.close());const modelRequests=[];page.on('request',request=>{if(/\/diagnose(?:\?|$)/.test(request.url()))modelRequests.push(request.url());});
 await page.goto(server.origin);await page.getByRole('heading',{level:1,name:'The page says “submitted.” Did the server commit it?'}).waitFor();
 await page.getByText('ReceiptLab proves completion from the intended run, one server commit and a verified signed receipt.',{exact:false}).waitFor();
 await page.getByText('Nemotron can suggest a recovery; only the independent receipt can prove completion.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Start positive case',exact:true}).waitFor();await page.getByRole('button',{name:'Start negative case',exact:true}).waitFor();
 await page.getByText('Connected. Start the positive case; no account or model call is required.',{exact:true}).waitFor();await mkdir('.cache/qa',{recursive:true});await page.setViewportSize({width:1440,height:1200});await page.screenshot({path:'.cache/qa/rc-first-screen-1440.png',fullPage:false});for(const width of [320,768,1024,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'First-screen horizontal overflow at '+width);}assert.deepEqual(modelRequests,[]);
});

test('workbench keyboard journey rejects false success, verifies real submission and exports evidence',async t=>{
 const server=await createWorkbench();t.after(()=>server.close());const browser=await launchBrowser();t.after(()=>browser.close());
 const context=await browser.newContext({acceptDownloads:true});t.after(()=>context.close());const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(server.origin);await page.locator('#create').waitFor({state:'visible'});await page.waitForFunction(()=>!document.getElementById('create').disabled);
 await page.keyboard.press('Tab');assert.equal(await page.locator('.skip').evaluate(el=>el===document.activeElement),true);
 await page.locator('#scenario').selectOption('workshop-false-success');await page.locator('#create').focus();await page.keyboard.press('Enter');await page.locator('#open').waitFor({state:'visible'});
 assert.equal(await page.locator('#open').evaluate(el=>el===document.activeElement),true);
 const popupPromise=context.waitForEvent('page');await page.locator('#open').click();const form=await popupPromise;await form.locator('form').waitFor();
 const attempt=await runDomBaseline(form,{...task,flow:'workshop',detail:'Morning session'});assert.equal(attempt.claimedCompletion,true);
 await page.getByLabel('The agent or interface claims completion').check();await page.getByRole('button',{name:'Check server state'}).click();
 await page.getByRole('heading',{name:'Completion claim rejected'}).waitFor();
 await page.locator('#scenario').selectOption('grant-clean');await page.getByRole('button',{name:'Create isolated run'}).click();
 const nextPromise=context.waitForEvent('page');await page.locator('#open').click();const next=await nextPromise;await next.locator('form').waitFor();await runDomBaseline(next,task);
 await page.getByLabel('The agent or interface claims completion').check();await page.getByRole('button',{name:'Check server state'}).click();await page.getByRole('heading',{name:'Verified completion',exact:true}).waitFor();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Export evidence JSON'}).click();const download=await downloadPromise;
 assert.match(download.suggestedFilename(),/^receiptlab-.*\.json$/);
 await mkdir('.cache/qa',{recursive:true});await download.saveAs('.cache/qa/workbench-evidence.json');
 for(const width of [320,768,1024,1440]){
  await page.setViewportSize({width,height:1100});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+width);
  await page.screenshot({path:'.cache/qa/workbench-'+width+'.png',fullPage:true});
 }
 assert.deepEqual(errors,[]);
 await page.getByRole('button',{name:'Clear this session’s runs'}).click();await page.getByText('No run selected.',{exact:true}).waitFor();
});
test('v2 fixture browser QA uses the frozen competent DOM policy without model calls',async t=>{
 const app=await createApp();t.after(()=>app.close());const browser=await launchBrowser();t.after(()=>browser.close());
 for(const scenario of evaluationV2)await t.test(scenario.id,async()=>{
  const run=app.createRun(scenario),session=await createBrowserSession(browser,run);
  try{
   const result=await runDomBaseline(session.page,scenario.task);
   const verdict=verifyCompletion(app.readRecord(run.id),scenario.task,app.key,{runId:run.id});
   assert.equal(verdict.completed,scenario.expectedCompletion,JSON.stringify(result));
  }finally{await session.context.close();}
 });
});
test('a delayed verdict cannot be displayed for a newly selected run',async t=>{
 const server=await createWorkbench();t.after(()=>server.close());const browser=await launchBrowser();t.after(()=>browser.close());const page=await browser.newPage();t.after(()=>page.close());
 await page.goto(server.origin);await page.waitForFunction(()=>!document.getElementById('create').disabled);
 await page.locator('#create').click();await page.locator('#open').waitFor({state:'visible'});
 let release,started;const routed=new Promise(resolve=>{started=resolve;});
 await page.route('**/verify',async route=>{const response=await route.fetch();started();await new Promise(resolve=>{release=resolve;});await route.fulfill({response});});
 await page.locator('#claim').check();await page.locator('#verify').click();await routed;
 await page.locator('#create').click();await page.waitForFunction(()=>!document.getElementById('create').disabled);release();
 await page.waitForFunction(()=>!document.getElementById('verify').disabled);
 assert.equal(await page.locator('#verdict').textContent(),'');assert.equal(await page.locator('#export').isHidden(),true);
});
