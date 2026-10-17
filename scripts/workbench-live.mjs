import {drainablePolicy} from '../src/diagnosis/drain.mjs';
import {readFile,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';
import {createCampaign} from '../src/campaign.mjs';import {reserveAccountBudget} from '../src/account-budget.mjs';import {checkCatalog} from '../src/catalog.mjs';import {preflight} from '../src/preflight.mjs';import {createDiagnosticPolicy} from '../src/diagnosis/nebius.mjs';import {createWorkbench} from '../src/workbench/server.mjs';
const args=process.argv.slice(2);let campaign,account,server,tracked,ended=false,stage='configuration',output,a;
async function finish(status,error){
 if(ended)return;ended=true;const drained=tracked?.drain();if(server)await server.close();await drained;if(campaign)await campaign.close();
 const metrics=campaign?.status();
 if(output)await writeFile(output,JSON.stringify({schemaVersion:1,campaignId:a.id,status,stage,error,sourceCommit:a.sourceCommit,suiteSha256:a.suiteSha256,campaign:metrics,finishedAt:new Date().toISOString()},null,2)+'\n',{flag:'wx',mode:0o600});
 if(account)await account.settle({knownCostUsd:metrics?.knownCostUsd??0,usageComplete:metrics?.usageComplete??true,requests:metrics?.requestsReserved??0});
}
try{
 if(!args.length)console.log(JSON.stringify({mode:'plan-only',modelExecution:'NOT RUN',maxRequests:3,maxOutputTokens:8192,maxReservedUsd:.02,sourcePinRequired:true,publicDeployment:false},null,2));
 else{
  if(args.length!==2||args[0]!=='--approval')throw new Error('Explicit bounded service approval file required');
  a=JSON.parse(await readFile(args[1],'utf8'));
  const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),freeze=JSON.parse(await readFile('results/diagnosis-freeze-schema-visible.json','utf8'));
  if(execFileSync('git',['status','--porcelain','--','src','scripts','test','package.json','package-lock.json'],{encoding:'utf8'}).trim()||a.sourceCommit!==sourceCommit||a.suiteSha256!==freeze.suiteSha256||a.model!==process.env.NEBIUS_MODEL||a.maxRequests!==3||a.maxOutputTokens!==8192||a.spendLimitUsd>.02||a.responseContract!=='preflight-then-diagnosis'||JSON.stringify(a.scenarioIds)!==JSON.stringify(['grant-transient','workshop-false-success']))throw new Error('Service source/suite/model/scope mismatch');
  output=resolve('.cache/campaigns',a.id+'.service-report.json');
  account=await reserveAccountBudget({directory:'.cache/account-budget',campaignId:a.id,maxReservedUsd:a.spendLimitUsd,purpose:a.purpose,sourceCommit,suiteSha256:a.suiteSha256,initialSpentUsd:.00022644});
  campaign=await createCampaign({authorization:a,sourceCommit,suiteSha256:a.suiteSha256,ledgerPath:resolve('.cache/campaigns',a.id+'.jsonl')});
  stage='catalog';const catalog=await checkCatalog();
  if(catalog.inputUsdPerMillion!==a.inputUsdPerMillion||catalog.outputUsdPerMillion!==a.outputUsdPerMillion)throw new Error('Service price drift');
  stage='preflight';const first=await preflight({live:true,approved:true,maxOutputTokens:1024,spendLimitUsd:a.spendLimitUsd,inputUsdPerMillion:a.inputUsdPerMillion,outputUsdPerMillion:a.outputUsdPerMillion,creditEvidence:a.creditEvidence,fetchImpl:campaign.fetch});
  await writeFile(resolve('.cache/campaigns',a.id+'.preflight.json'),JSON.stringify(first,null,2)+'\n',{flag:'wx',mode:0o600});
  const policy=createDiagnosticPolicy({approved:true,maxOutputTokens:a.maxOutputTokens,inputUsdPerMillion:a.inputUsdPerMillion,outputUsdPerMillion:a.outputUsdPerMillion,fetchImpl:campaign.fetch});
  stage='serving-local-workbench';
  tracked=drainablePolicy(policy);
  server=await createWorkbench({port:Number(process.env.PORT??3000),diagnosticPolicy:tracked,diagnosticExecutionKind:'live-nebius',allowedDiagnosticScenarios:a.scenarioIds});
  console.log(JSON.stringify({status:'local-service-ready',origin:server.origin,sourceCommit,suiteSha256:a.suiteSha256,maxTotalRequests:a.maxRequests,maxEstimatedReservationUsd:a.spendLimitUsd,publicDeployment:false}));
  const timer=setTimeout(()=>{finish('approval-expired').then(()=>process.exit(0)).catch(()=>{console.error('Shutdown evidence incomplete; preserve ledger lock for investigation.');process.exit(1);});},Math.max(1,Date.parse(a.expiresAt)-Date.now()));timer.unref();
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearTimeout(timer);finish('closed-by-operator').then(()=>process.exit(0)).catch(()=>{console.error('Shutdown evidence incomplete; preserve ledger lock for investigation.');process.exit(1);});});
 }
}catch{await finish('stopped','Service stage failed safely; inspect protected campaign ledger');console.error('Live workbench stopped safely; no automatic retry.');process.exitCode=1;}
