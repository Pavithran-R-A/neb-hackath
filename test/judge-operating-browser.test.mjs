import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkbench} from '../src/workbench/server.mjs';
import {launchBrowser} from '../src/agents/browser.mjs';

async function setup(t){
 const server=await createWorkbench();t.after(()=>server.close());
 const browser=await launchBrowser();t.after(()=>browser.close());
 const page=await browser.newPage();t.after(()=>page.close());return {server,page};
}
const suggestion={id:'mocked-only',executionKind:'simulated-test',suggestion:{diagnosis:'temporary_failure',explanation:'Mocked diagnosis for UI testing.',evidenceIds:['server-status'],recovery:{action:'retry',reason:'Mocked permitted recovery.'}},semanticAssessment:{status:'accepted',reasons:[]},trace:{events:[{id:'server-status',source:'server',kind:'status',text:'Temporary submission error; task remains pending.'},{id:'ui-claim',source:'ui',kind:'claim',text:'Success claim without receipt.'}]},recoveryExecutable:true,usage:{totalTokens:123},latencyMs:12000,estimatedCostUsd:0.001};
async function create(page,origin){await page.goto(origin);await page.waitForFunction(()=>!document.getElementById('create').disabled);await page.locator('#guided-positive').click();await page.locator('#open').waitFor({state:'visible'});}

test('mocked slow diagnosis announces elapsed waiting, then evidence review without completion claims or retries',async t=>{
 const {server,page}=await setup(t);let release,requests=0;const waiting=new Promise(resolve=>{release=resolve;});
 await page.route('**/diagnose',async route=>{requests++;await waiting;await route.fulfill({json:suggestion});});
 await create(page,server.origin);await page.clock.install();await page.locator('#diagnose-rules').click();
 assert.match(await page.locator('#activity').textContent(),/Waiting for diagnosis/);
 await page.clock.fastForward(12000);assert.match(await page.locator('#activity').textContent(),/12s elapsed/);assert.match(await page.locator('#activity').textContent(),/No automatic retries/);assert.equal(requests,1);
 release();await page.getByRole('heading',{name:'Simulated model suggestion — temporary failure'}).waitFor();
 assert.match(await page.locator('#activity').textContent(),/Review the cited evidence/);
 assert.match(await page.locator('#diagnosis').textContent(),/does not prove completion/);
 assert.equal(await page.locator('#recover').isDisabled(),true);
});

test('cited event links support keyboard inspection with source and task status at narrow widths',async t=>{
 const {server,page}=await setup(t);await page.route('**/diagnose',route=>route.fulfill({json:suggestion}));await create(page,server.origin);await page.locator('#diagnose-rules').click();
 const citation=page.getByRole('link',{name:'Inspect cited event server-status'});await citation.waitFor();await citation.focus();await page.keyboard.press('Enter');
 const event=page.locator('#trace-event-0');await event.waitFor({state:'visible'});assert.equal(await event.evaluate(el=>document.activeElement===el),true);
 assert.match(await event.textContent(),/Source: server/);assert.match(await event.textContent(),/pending/);assert.match(await page.locator('#diagnosis').textContent(),/Task status: unverified/);
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
});

test('judge access is metadata-gated, explicitly submitted and immediately cleared; rules fallback needs no code',async t=>{
 const {server,page}=await setup(t);let unlocked=false,posts=0,release;const waiting=new Promise(resolve=>{release=resolve;});
 await page.route('**/api/session',async route=>{const response=await route.fetch();await route.fulfill({json:{...await response.json(),judgeOperatingMode:true,judgeAccessRequired:!unlocked,liveInferenceEnabled:true,diagnosticExecutionKind:'simulated-test'}});});
 await page.route('**/api/judge-access',async route=>{posts++;assert.deepEqual(route.request().postDataJSON(),{code:'synthetic-test-code'});await waiting;unlocked=true;await route.fulfill({json:{ok:true}});});
 await create(page,server.origin);await page.locator('#guided-negative').click();await page.waitForFunction(()=>document.getElementById('scenario').value==='workshop-false-success'&&!document.getElementById('guided-negative').disabled);assert.equal(await page.locator('#judge-access').isVisible(),true);assert.equal(await page.locator('#diagnose-model').isDisabled(),true);assert.equal(await page.locator('#diagnose-rules').isDisabled(),false);
 assert.match(await page.locator('#fallback-note').textContent(),/workbench server must stay reachable/);
 await page.getByLabel('Judge access code',{exact:true}).fill('synthetic-test-code');assert.equal(posts,0);await page.getByRole('button',{name:'Unlock NVIDIA diagnosis',exact:true}).click();assert.equal(await page.locator('#judge-code').inputValue(),'');assert.equal(posts,1);assert.equal(await page.evaluate(()=>localStorage.length),0);
 release();await page.locator('#judge-access').waitFor({state:'hidden'});assert.equal(await page.locator('#diagnose-model').isDisabled(),false);assert.equal(await page.locator('#scenario').inputValue(),'workshop-false-success');
});

test('ordinary session hides judge credential controls and fallback never claims live NVIDIA inference',async t=>{
 const {server,page}=await setup(t);await create(page,server.origin);assert.equal(await page.locator('#judge-access').isHidden(),true);assert.match(await page.locator('#fallback-note').textContent(),/does not demonstrate live NVIDIA/);
});
