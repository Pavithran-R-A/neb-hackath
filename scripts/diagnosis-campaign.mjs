import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';import {resolve} from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {createCampaign} from '../src/campaign.mjs';import {reserveAccountBudget} from '../src/account-budget.mjs';import {checkCatalog} from '../src/catalog.mjs';import {preflight} from '../src/preflight.mjs';
import {diagnoseStrongDeterministic} from '../src/diagnosis/strong-baseline.mjs';
import {diagnoseStrongDeterministic as diagnoseStrongV2} from '../src/diagnosis/strong-baseline-v2.mjs';
import {createDiagnosticPolicy} from '../src/diagnosis/nebius.mjs';import {diagnoseDeterministic} from '../src/diagnosis/baseline.mjs';import {visibleTrace,scoreDiagnoses} from '../src/diagnosis/evaluation.mjs';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
let campaign,account,stage='configuration',report,path;
try{
 const args=process.argv.slice(2),sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),freeze=await load('results/diagnosis-freeze-schema-visible.json');
 for(const [name,h] of Object.entries(freeze.datasetFilesSha256))if(createHash('sha256').update(await readFile('evaluation/diagnosis-v1/'+name)).digest('hex')!==h)throw new Error('Frozen dataset drift');
 if(args.length)for(const [name,h] of Object.entries(freeze.policyFilesSha256))if(createHash('sha256').update(await readFile(name)).digest('hex')!==h)throw new Error('Frozen policy drift');
 const cases=await load('evaluation/diagnosis-v1/cases.json'),labels=await load('evaluation/diagnosis-v1/labels.json');
 if(!args.length){console.log(JSON.stringify({mode:'plan-only',sourceCommit,suiteSha256:freeze.suiteSha256,cases:cases.length,maxRequests:17,maxOutputTokens:8192,maxReservedUsd:.10,modelExecution:'NOT RUN'},null,2));}
 else{
  if(args.length!==3||args[0]!=='--execute'||args[1]!=='--approval')throw new Error('Diagnosis execution arguments invalid');
  const a=await load(args[2]);path=resolve('.cache/campaigns',a.id+'.diagnosis-report.json');
  if(execFileSync('git',['status','--porcelain','--','src','scripts','test','package.json','package-lock.json'],{encoding:'utf8'}).trim())throw new Error('Clean committed runtime required');
  if(a.model!==process.env.NEBIUS_MODEL||a.maxRequests!==17||a.responseContract!=='preflight-then-diagnosis'||a.maxOutputTokens!==8192||a.spendLimitUsd>.10)throw new Error('Diagnosis scope mismatch');
  // Frozen full16 case feasibility experiment; first request preflight, no retries.
  account=await reserveAccountBudget({directory:'.cache/account-budget',campaignId:a.id,maxReservedUsd:a.spendLimitUsd,purpose:a.purpose,sourceCommit,suiteSha256:freeze.suiteSha256,initialSpentUsd:.00022644});
  campaign=await createCampaign({authorization:a,sourceCommit,suiteSha256:freeze.suiteSha256,ledgerPath:resolve('.cache/campaigns',a.id+'.jsonl')});
  report={schemaVersion:1,campaignId:a.id,authorizationSource:a.authorizationSource,sourceCommit,suiteSha256:freeze.suiteSha256,startedAt:new Date().toISOString(),stage,predictions:[],baseline:[],strongBaseline:[],modelExecution:'live-nebius',noAutomaticRetries:true};
  stage='catalog';const catalog=await checkCatalog();report.catalog=catalog;
  if(catalog.inputUsdPerMillion!==a.inputUsdPerMillion||catalog.outputUsdPerMillion!==a.outputUsdPerMillion)throw new Error('Price drift');
  stage='preflight';report.preflight=await preflight({live:true,approved:true,spendLimitUsd:a.spendLimitUsd,maxOutputTokens:1024,inputUsdPerMillion:a.inputUsdPerMillion,outputUsdPerMillion:a.outputUsdPerMillion,creditEvidence:a.creditEvidence,fetchImpl:campaign.fetch});
  await mkdir(resolve('.cache/campaigns'),{recursive:true});await writeFile(path+'.preflight.json',JSON.stringify(report.preflight,null,2)+'\n',{flag:'wx',mode:0o600});
  const policy=createDiagnosticPolicy({approved:true,maxOutputTokens:a.maxOutputTokens,inputUsdPerMillion:a.inputUsdPerMillion,outputUsdPerMillion:a.outputUsdPerMillion,fetchImpl:campaign.fetch});
  stage='diagnostic-evaluation';
  for(const trace of cases){
   const visible=visibleTrace(trace),start=performance.now();
   report.baseline.push({id:trace.id,suggestion:diagnoseDeterministic(visible),latencyMs:performance.now()-start,modelExecution:false});
   try{const result=await policy.diagnose(visible);report.predictions.push({id:trace.id,...result});await appendFile(path+'.jsonl',JSON.stringify({id:trace.id,...result})+'\n',{mode:0o600});}
   catch(error){report.predictions.push({id:trace.id,error:'Provider/schema/grounding failure',report:error.report??null});throw error;}
   if(campaign.status().halted)throw new Error('Provider contract failure');
  }
  report.status='completed';
 }
}catch(error){
 if(report){report.status='stopped';report.failedStage=stage;report.error=error.message.startsWith('Diagnosis')||error.message.startsWith('Nebius')?error.message:'Campaign stage failed';report.failureMetadata=error.report??null;}
 console.error('Diagnostic campaign stopped safely; inspect sanitized report. No automatic retry.');process.exitCode=1;
}finally{
 if(report){
  const cases=await load('evaluation/diagnosis-v1/cases.json'),labels=await load('evaluation/diagnosis-v1/labels.json');
  // Finish deterministic predictions for coverage even if provider failed; no new inference.
  for(const trace of cases)if(!report.baseline.some(p=>p.id===trace.id))report.baseline.push({id:trace.id,suggestion:diagnoseDeterministic(visibleTrace(trace)),modelExecution:false});
  report.strongBaseline=cases.map(trace=>{const start=performance.now();try{return{id:trace.id,suggestion:diagnoseStrongDeterministic(visibleTrace(trace)),latencyMs:performance.now()-start,modelExecution:false};}catch{return{id:trace.id,error:'Baseline contract rejected'};}});
  report.strongBaselineV2=cases.map(trace=>{const start=performance.now();try{return{id:trace.id,suggestion:diagnoseStrongV2(visibleTrace(trace)),latencyMs:performance.now()-start,modelExecution:false};}catch{return{id:trace.id,error:'Baseline contract rejected'};}});
  report.score={strongBaselineV2:scoreDiagnoses(cases,labels,report.strongBaselineV2),strongBaseline:scoreDiagnoses(cases,labels,report.strongBaseline),baseline:scoreDiagnoses(cases,labels,report.baseline),nemotron:scoreDiagnoses(cases,labels,report.predictions)};
  report.stage=report.status==='completed'?'completed':stage;report.finishedAt=new Date().toISOString();report.campaign=campaign?.status();report.account=account?.summary();
  await writeFile(path,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 }
 if(campaign)await campaign.close();
 if(account)await account.settle({knownCostUsd:campaign?.status().knownCostUsd??0,usageComplete:campaign?.status().usageComplete??true,requests:campaign?.status().requestsReserved??0});
 if(report)console.log(JSON.stringify({campaignId:report.campaignId,status:report.status,score:report.score,campaign:report.campaign,report:path},null,2));
}
