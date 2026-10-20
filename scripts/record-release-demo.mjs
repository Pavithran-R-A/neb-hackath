import {createHash} from 'node:crypto';
import {mkdir,writeFile,stat,readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createWorkbench} from '../src/workbench/server.mjs';

// Records the actual current local workbench with local deterministic advice only.
// Historical live NVIDIA behavior is a separate, source-hash-pinned recording.
const output='.cache/qa/release-demo-'+Date.now();
await mkdir(join(output,'raw'),{recursive:true});
const server=await createWorkbench({diagnosticExecutionKind:'deterministic'});
let browser,context,status='running',failure=null;const pageErrors=[];
const events=[],providerRequests=[];
const pause=async(label,ms=1600)=>{events.push({label,atSeconds:Number(((Date.now()-startedAt)/1000).toFixed(3))});await new Promise(resolve=>setTimeout(resolve,ms));};
const startedAt=Date.now();
try{
 browser=await chromium.launch({headless:true});
 context=await browser.newContext({viewport:{width:1440,height:1200},acceptDownloads:true,recordVideo:{dir:join(output,'raw'),size:{width:1440,height:1200}}});
 const page=await context.newPage();
 page.on('request',request=>{if(/\/diagnose/.test(new URL(request.url()).pathname)){if(request.postDataJSON()?.mode==='nemotron')providerRequests.push(request.url());}});
 page.on('pageerror',error=>pageErrors.push(error.message));
 await page.goto(server.origin);await page.getByText('Connected. Start the positive case; no account or model call is required.',{exact:true}).waitFor();
 await page.screenshot({path:join(output,'current-first-screen.png')});await pause('current-first-screen',2400);
 async function start(id){await page.locator('#scenario').selectOption(id);await page.locator('#create').click();await page.locator('#open').waitFor({state:'visible'});await pause(id+'-challenge-created',2200);}
 async function formJourney(id,flow,detail,expected){
  const popup=context.waitForEvent('page');await page.locator('#open').click();const form=await popup;await form.locator('form').waitFor();await pause(id+'-step-one-visible',2500);
  await form.getByLabel('Full name',{exact:true}).fill('Avery Example');await form.getByLabel('Email',{exact:true}).fill('avery@example.invalid');await form.getByLabel('Telephone',{exact:true}).fill('5550101234');await pause(id+'-step-one-filled',1800);
  await form.getByRole('button',{name:'Next',exact:true}).click();await form.getByText(flow==='grant'?'Project title':'Workshop session',{exact:true}).waitFor();await pause(id+'-step-two-visible',2500);
  const field=flow==='grant'?form.getByLabel('Project title',{exact:true}):form.getByLabel('Workshop session',{exact:true});if(flow==='grant')await field.fill(detail);else await field.selectOption(detail);await pause(id+'-step-two-filled',1800);
  await form.getByRole('button',{name:'Next',exact:true}).click();await form.getByText('Review fictional application',{exact:true}).waitFor();await form.getByLabel('I consent to this fictional application').check();await pause(id+'-consent-visible',2500);
  await form.getByRole('button',{name:'Submit application'}).click();await form.getByText(expected,{exact:false}).waitFor();await pause(id+'-submission-result',4000);
  return form;
 }
 await start('grant-transient');
 const positiveForm=await formJourney('grant-transient','grant','Community garden','Temporary submission error');
 await positiveForm.close();await page.bringToFront();await page.locator('#verify').click();await page.getByRole('heading',{name:'Not completed',exact:true}).waitFor();await pause('positive-independent-incomplete-verdict',3500);
 await page.locator('#diagnose-rules').click();await page.getByText(/Rules diagnosis/).waitFor();await page.getByText(/Local deterministic rules; no inference cost\./).waitFor();await pause('positive-local-rule-advice',4000);
 await page.locator('#diagnosis details summary').first().click().catch(()=>{});await pause('positive-evidence-inspection',3000);
 if(await page.locator('#approval').isVisible()){
  await page.locator('#approve-recovery').check();await pause('positive-explicit-approval',2800);await page.locator('#recover').click();await page.getByText('Recovery applied. Independent verification confirms completion.',{exact:true}).waitFor();await pause('positive-recovery-response',3500);
  await page.locator('#verify').click();await page.getByRole('heading',{name:'Verified completion',exact:true}).waitFor();await page.getByText('Signed receipt', {exact:false}).waitFor().catch(()=>{});await pause('positive-independent-signed-receipt',4000);
 }
 const positiveEvidence=await page.evaluate(id=>fetch('/api/runs/'+id+'/evidence').then(r=>r.json()),await page.locator('#export').getAttribute('href').then(h=>h.match(/runs\/([^/]+)/)?.[1]));
 await writeFile(join(output,'positive-local-evidence.json'),JSON.stringify(positiveEvidence,null,2)+'\n');await page.screenshot({path:join(output,'positive-outcome.png'),fullPage:true});
 await start('workshop-false-success');
 const negativeForm=await formJourney('workshop-false-success','workshop','Morning session','Application received');
 await negativeForm.close();await page.bringToFront();await page.locator('#claim').check();await page.locator('#verify').click();await page.getByRole('heading',{name:'Completion claim rejected',exact:true}).waitFor();await pause('negative-claim-rejected',3500);
 await page.locator('#diagnose-rules').click();await page.getByText(/Rules diagnosis/).waitFor();await page.getByText('This suggestion is not executable here. Stop or investigate manually.',{exact:true}).waitFor();await pause('negative-abstention-no-recovery',4500);
 const negativeEvidence=await page.evaluate(id=>fetch('/api/runs/'+id+'/evidence').then(r=>r.json()),await page.locator('#export').getAttribute('href').then(h=>h.match(/runs\/([^/]+)/)?.[1]));
 await writeFile(join(output,'negative-local-evidence.json'),JSON.stringify(negativeEvidence,null,2)+'\n');await page.screenshot({path:join(output,'negative-outcome.png'),fullPage:true});
 if(providerRequests.length)throw Error('Unexpected NVIDIA request in local deterministic recording');
 assert.equal(positiveEvidence.verification.completed,true,'positive signed receipt must independently verify');
 assert.equal(negativeEvidence.rejectedCompletionClaim,true,'false-success claim must be rejected');
 assert.equal(negativeEvidence.verification.completed,false,'negative case must remain unverified');
 assert.deepEqual(pageErrors,[]);
 status='passed';events.push({label:'completed',atSeconds:Number(((Date.now()-startedAt)/1000).toFixed(3)),pageErrors,providerRequests:providerRequests.length,positiveVerified:positiveEvidence.verification.completed,negativeRejected:negativeEvidence.rejectedCompletionClaim,negativeVerified:negativeEvidence.verification.completed});
}catch(error){status='failed';failure=error.message;throw error;
}finally{
 if(context)await context.close();if(browser)await browser.close();await server.close();
 const files=[];
 for(const name of await readdir(join(output,'raw'))){if(!name.endsWith('.webm'))continue;const path=join(output,'raw',name),bytes=await stat(path),hash=createHash('sha256').update(await readFile(path)).digest('hex');files.push({path,bytes:bytes.size,sha256:hash});}
 const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
 const runtimeFiles=['src/workbench/index.html','src/workbench/client.js','src/workbench/style.css','src/workbench/server.mjs','src/app/client.js','src/app/server.mjs','src/scenarios.mjs'];
 const sourceHashes={};for(const path of [...runtimeFiles,'scripts/record-release-demo.mjs'])sourceHashes[path]=await hash(path);
 const report={schemaVersion:1,status,error:failure,kind:'actual-current-UI-local-rules-capture',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceTreeDirty:Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()),sourceHashes,startedAt:new Date(startedAt).toISOString(),elapsedSeconds:Number(((Date.now()-startedAt)/1000).toFixed(3)),origin:'Ephemeral loopback Node workbench; no public service',inference:'disabled; local deterministic diagnosis only; zero NVIDIA provider calls',browser:'Real Chromium, 1440x1200, Playwright-driven synthetic interactions; no human-at-keyboard claim',events,recordings:files};
 await writeFile(join(output,'capture-manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status,error:failure,elapsedSeconds:report.elapsedSeconds,output,recordings:files,verification:events.at(-1)},null,2));
}
