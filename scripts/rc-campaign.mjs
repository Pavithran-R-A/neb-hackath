import {fileURLToPath} from 'node:url';
import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {createCampaign} from '../src/campaign.mjs';import {reserveAccountBudget} from '../src/account-budget.mjs';import {checkCatalog} from '../src/catalog.mjs';import {preflight} from '../src/preflight.mjs';import {createDiagnosticPolicy} from '../src/diagnosis/nebius.mjs';import {acceptDiagnosis} from '../src/diagnosis/acceptance.mjs';import {diagnoseTelemetry} from '../src/diagnosis/telemetry-baseline.mjs';import {visibleTrace,scoreDiagnoses} from '../src/diagnosis/evaluation.mjs';import {validateExperiment} from '../src/diagnosis/experiment.mjs';
const load=async p=>JSON.parse(await readFile(p,'utf8'));let campaign,account,report,path,stage='configuration';
try{
 if(resolve('.')!==resolve(fileURLToPath(new URL('../',import.meta.url))))throw new Error('Run experiment from its pinned repository root');
 const args=process.argv.slice(2),freeze=await load('results/rc-v2-freeze.json'),sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(!args.length){console.log(JSON.stringify({mode:'plan-only',sourceCommit,suiteSha256:freeze.suiteSha256,modelExecution:'NOT RUN',maxOutputTokens:8192,noRetries:true,explicitModelAndSampling:true}));}
 else{
  if(args.length!==3||args[0]!=='--execute'||args[1]!=='--approval')throw new Error('Explicit experiment approval required');const a=await load(args[2]);
  const cases=a.suiteId==='config-probes-v1'?await load('evaluation/config-probes-v1.json'):a.suiteId==='diagnosis-v1-remaining'?(await load('evaluation/diagnosis-v1/cases.json')).slice(7):await load('evaluation/diagnosis-v2/cases.json');
  const suiteSha256=createHash('sha256').update(JSON.stringify(cases)).digest('hex');validateExperiment(a,cases);
  if(execFileSync('git',['status','--porcelain','--','src','scripts','test','package.json','package-lock.json','evaluation'],{encoding:'utf8'}).trim())throw new Error('Clean committed source/suite required');
  for(const [p,h] of Object.entries(freeze.policyFilesSha256))if(createHash('sha256').update(await readFile(p)).digest('hex')!==h)throw new Error('Frozen policy drift');
  for(const [p,h] of Object.entries(freeze.datasetFilesSha256))if(createHash('sha256').update(await readFile('evaluation/diagnosis-v2/'+p)).digest('hex')!==h)throw new Error('Frozen dataset drift');
  path=resolve('.cache/campaigns',a.id+'.rc-report.json');
  account=await reserveAccountBudget({directory:'.cache/account-budget',campaignId:a.id,maxReservedUsd:a.spendLimitUsd,purpose:a.purpose,sourceCommit,suiteSha256,initialSpentUsd:.00022644});
  campaign=await createCampaign({authorization:a,sourceCommit,suiteSha256,ledgerPath:resolve('.cache/campaigns',a.id+'.jsonl')});
  report={schemaVersion:1,id:a.id,sourceCommit,suiteSha256,suiteId:a.suiteId,model:a.model,sampling:a.diagnosticSampling,startedAt:new Date().toISOString(),authorizationSource:a.authorizationSource,modelExecution:'live-nebius',raw:[],accepted:[],baseline:[],stage,noRetries:true};
  stage='catalog';report.catalog=await checkCatalog({model:a.model});if(report.catalog.inputUsdPerMillion!==a.inputUsdPerMillion||report.catalog.outputUsdPerMillion!==a.outputUsdPerMillion)throw new Error('Catalog price drift');
  stage='preflight';report.preflight=await preflight({model:a.model,live:true,approved:true,maxOutputTokens:1024,spendLimitUsd:a.spendLimitUsd,inputUsdPerMillion:a.inputUsdPerMillion,outputUsdPerMillion:a.outputUsdPerMillion,creditEvidence:a.creditEvidence,fetchImpl:campaign.fetch});
  const policy=createDiagnosticPolicy({model:a.model,approved:true,temperature:a.diagnosticSampling.temperature,topP:a.diagnosticSampling.top_p,maxOutputTokens:a.maxOutputTokens,inputUsdPerMillion:a.inputUsdPerMillion,outputUsdPerMillion:a.outputUsdPerMillion,fetchImpl:campaign.fetch});
  stage='diagnoses';for(const t of cases){const trace=visibleTrace(t);try{const result=await policy.diagnose(trace);report.raw.push({id:t.id,...result});report.accepted.push({id:t.id,...result,...acceptDiagnosis(result.suggestion,trace)});await writeFile(path+'.partial',JSON.stringify(report,null,2)+'\n',{mode:0o600});}catch(error){report.raw.push({id:t.id,error:'Provider or contract rejected',providerOutcome:error.report??null});throw error;}if(campaign.status().halted)throw new Error('Campaign contract halted');}
  report.status='completed';
 }
}catch(error){if(report){report.status='stopped';report.failedStage=stage;report.error='Campaign stopped safely; no retry';report.providerOutcome=error.report??null;}console.error('RC campaign stopped safely. No automatic retry.');process.exitCode=1;}
finally{
 if(report){
  const all=report.suiteId==='config-probes-v1'?await load('evaluation/config-probes-v1.json'):report.suiteId==='diagnosis-v1-remaining'?(await load('evaluation/diagnosis-v1/cases.json')).slice(7):await load('evaluation/diagnosis-v2/cases.json');
  report.baseline=all.map(t=>{const start=performance.now();return{id:t.id,suggestion:diagnoseTelemetry(visibleTrace(t)),latencyMs:performance.now()-start};});
  if(report.suiteId!=='config-probes-v1'){const labels=await load('evaluation/'+(report.suiteId==='diagnosis-v2'?'diagnosis-v2':'diagnosis-v1')+'/labels.json'),subset=labels.filter(l=>all.some(t=>t.id===l.id));report.score={raw:scoreDiagnoses(all,subset,report.raw),accepted:scoreDiagnoses(all,subset,report.accepted),baseline:scoreDiagnoses(all,subset,report.baseline)};}
  report.semantic={accepted:report.accepted.filter(p=>p.semanticAssessment.status==='accepted').length,abstained:report.accepted.filter(p=>p.semanticAssessment.status!=='accepted').length,rawHighConfidenceRejected:report.accepted.filter(p=>p.semanticAssessment.rawHighConfidenceRejected).length};report.stage=stage;report.finishedAt=new Date().toISOString();
 }
 if(campaign)await campaign.close();if(report)report.campaign=campaign.status();
 if(account)await account.settle({knownCostUsd:campaign?.status().knownCostUsd??0,usageComplete:campaign?.status().usageComplete??true,requests:campaign?.status().requestsReserved??0});
 if(report){await writeFile(path,JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});const compact=s=>s?Object.fromEntries(Object.entries(s).filter(([k])=>k!=='rows')):null;console.log(JSON.stringify({id:report.id,status:report.status,semantic:report.semantic,score:report.score?Object.fromEntries(Object.entries(report.score).map(([k,s])=>[k,compact(s)])):null,campaign:report.campaign,report:path}));}
}
