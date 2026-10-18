import {captureTarget} from '../src/runtime/capture-target.mjs';import {chromium} from 'playwright';
// Explicit operator QA only. The separately running workbench owns all model budgets.
import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {clickAndSettle} from '../src/agents/browser.mjs';
const args=process.argv.slice(2);
if(!args.length){console.log(JSON.stringify({mode:'plan-only',modelRequests:0,executionNeeds:'Explicit --origin loopbackURL and separately budgeted ReceiptLab live service',journey:['grant-transient diagnosis and synthetic approved recovery','workshop-false-success diagnosis and verifier rejection'],approvalActor:'authorized automated synthetic QA; not a person clicking during recording'}));}
else{
 let browser,context,outputReady=false;const result={schemaVersion:1,startedAt:new Date().toISOString(),executionKind:'live-nebius',approvalActor:'authorized automated synthetic QA',journeys:[],publicDeployment:false};
 try{
  const target=captureTarget(args),origin=new URL(target.origin);result.tls={privateLoopbackCertificatePinned:Boolean(target.spkiPin),publicCertificate:false};
  await mkdir('.cache/qa/live-video',{recursive:true});browser=await chromium.launch({headless:true,args:target.spkiPin?['--ignore-certificate-errors-spki-list='+target.spkiPin]:[]});context=await browser.newContext({viewport:{width:1440,height:1100},recordVideo:{dir:'.cache/qa/live-video',size:{width:1440,height:1100}}});const page=await context.newPage(),pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));await page.goto(origin.origin);await page.waitForFunction(()=>!document.getElementById('create').disabled);
  const session=await page.evaluate(()=>fetch('/api/session').then(r=>r.json()));if(!session.liveInferenceEnabled||session.diagnosticExecutionKind!=='live-nebius')throw new Error('An actual bounded live service is required; no mock substitution');outputReady=true;
  for(const scenario of ['grant-transient','workshop-false-success']){
   await page.locator('#scenario').selectOption(scenario);const created=page.waitForResponse(r=>r.url().endsWith('/api/runs')&&r.request().method()==='POST');await page.locator('#create').click();const run=await(await created).json();const opened=context.waitForEvent('page');await page.locator('#open').click();const form=await opened;await form.locator('form').waitFor();
   await form.getByLabel('Full name',{exact:true}).fill(run.task.name);await form.getByLabel('Email',{exact:true}).fill(run.task.email);await form.getByLabel('Telephone',{exact:true}).fill(run.task.phone);await clickAndSettle(form,form.getByRole('button',{name:'Next',exact:true}));
   if(scenario==='grant-transient')await form.getByLabel('Project title',{exact:true}).fill(run.task.detail);else await form.getByLabel('Workshop session',{exact:true}).selectOption(run.task.detail);
   await clickAndSettle(form,form.getByRole('button',{name:'Next',exact:true}));await form.getByLabel('I consent to this fictional application').check();await clickAndSettle(form,form.getByRole('button',{name:'Submit application'}));
   await form.screenshot({path:'.cache/qa/'+scenario+'-failed-form.png',fullPage:true});await page.bringToFront();if(scenario==='workshop-false-success')await page.locator('#claim').check();await page.locator('#verify').click();await page.locator('#verdict h3').waitFor();
   const diagnosed=page.waitForResponse(r=>r.url().endsWith('/diagnose'),{timeout:70000});await page.locator('#diagnose-model').click();const response=await diagnosed,d=await response.json();if(!response.ok())throw new Error('Model diagnosis rejected; stop capture with no retry');
   await page.getByRole('heading',{name:/NVIDIA model suggestion/}).waitFor();const before=await page.evaluate(id=>fetch('/api/runs/'+id+'/evidence').then(r=>r.json()),run.id);assert.equal(before.verification.completed,false);
   const row={scenario,diagnosis:d.suggestion.diagnosis,recommendedAction:d.suggestion.recovery.action,suggestion:d.suggestion,rawSuggestion:d.rawSuggestion,semanticAssessment:d.semanticAssessment,provider:{usage:d.usage,estimatedCostUsd:d.estimatedCostUsd,latencyMs:d.latencyMs,modelIdentityVerified:d.modelIdentityVerified},before};result.journeys.push(row);await writeFile('.cache/qa/'+scenario+'-live-before-export.json',JSON.stringify(before,null,2)+'\n');
   if(scenario==='workshop-false-success'&&await page.getByText('Review rejected raw model output (untrusted)',{exact:true}).count())await page.getByText('Review rejected raw model output (untrusted)',{exact:true}).click();
   await page.screenshot({path:'.cache/qa/'+scenario+'-live-diagnosis.png',fullPage:true});
   if(scenario==='grant-transient'){
    assert.equal(d.suggestion.recovery.action,'retry');assert.equal(d.recoveryExecutable,true);assert.equal(await page.locator('#recover').isDisabled(),true);await page.locator('#approve-recovery').check();await page.locator('#recover').click();await page.getByText('Recovery applied. Independent verification confirms completion.',{exact:true}).waitFor();await page.locator('#verify').click();await page.getByRole('heading',{name:'Verified completion',exact:true}).waitFor();
   }else{assert.equal(d.recoveryExecutable,false);await page.getByRole('heading',{name:'Completion claim rejected',exact:true}).waitFor();}
   row.after=await page.evaluate(id=>fetch('/api/runs/'+id+'/evidence').then(r=>r.json()),run.id);assert.equal(row.after.verification.completed,scenario==='grant-transient');await writeFile('.cache/qa/'+scenario+'-live-export.json',JSON.stringify(row.after,null,2)+'\n');await page.screenshot({path:'.cache/qa/'+scenario+'-live-outcome.png',fullPage:true});
   for(const width of [320,768,1024,1440]){await page.setViewportSize({width,height:1100});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===320)await page.screenshot({path:'.cache/qa/'+scenario+'-live-mobile.png',fullPage:true});}
   await form.close();
  }
  assert.deepEqual(pageErrors,[]);result.pageErrors=pageErrors;result.status='completed';
 }catch(error){result.status='stopped';result.error=error.message;process.exitCode=1;}
 finally{if(context)await context.close();if(browser)await browser.close();result.finishedAt=new Date().toISOString();if(outputReady){await mkdir('.cache/qa',{recursive:true});await writeFile('.cache/qa/live-journey-result.json',JSON.stringify(result,null,2)+'\n');}console.log(JSON.stringify({status:result.status,journeys:result.journeys.length,evidence:'.cache/qa/live-journey-result.json'}));}
}
