import {createProvenance} from '../src/provenance.mjs';import {servicePaths} from '../src/runtime/campaign-paths.mjs';import {validatePublicConfiguration} from '../src/runtime/durable-state.mjs';import {scenarios} from '../src/scenarios.mjs';import {createHash} from 'node:crypto';
import {drainablePolicy} from '../src/diagnosis/drain.mjs';
import {readFile,writeFile,appendFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';
import {createCampaign} from '../src/campaign.mjs';import {reserveAccountBudget} from '../src/account-budget.mjs';import {checkCatalog} from '../src/catalog.mjs';import {preflight} from '../src/preflight.mjs';import {createDiagnosticPolicy} from '../src/diagnosis/nebius.mjs';import {createWorkbench} from '../src/workbench/server.mjs';
const args=process.argv.slice(2);let campaign,account,server,tracked,ended=false,stage='configuration',output,a;
async function finish(status,error){
 if(ended)return;ended=true;const drained=tracked?.drain();if(server)await server.close();await drained;if(campaign)await campaign.close();
 const metrics=campaign?.status();
 if(output)await writeFile(output,JSON.stringify({schemaVersion:1,campaignId:a.id,status,stage,error,sourceCommit:a.sourceCommit,suiteSha256:a.suiteSha256,campaign:metrics,finishedAt:new Date().toISOString()},null,2)+'\n',{flag:'wx',mode:0o600});
 if(account)await account.settle({knownCostUsd:metrics?.knownCostUsd??0,usageComplete:metrics?.usageComplete??true,requests:metrics?.requestsReserved??0});
}
try{
 if(!args.length)console.log(JSON.stringify({mode:'plan-only',modelExecution:'NOT RUN',maxRequests:3,maxOutputTokens:8192,maxReservedUsd:.02,sourcePinRequired:true,suiteSha256:createHash('sha256').update(JSON.stringify(scenarios.filter(s=>['grant-transient','workshop-false-success'].includes(s.id)))).digest('hex'),publicDeployment:false},null,2));
 else{
  if(args.length!==2||args[0]!=='--approval')throw new Error('Explicit bounded service approval file required');
  a=JSON.parse(await readFile(args[1],'utf8'));
  const publicMode=process.env.RECEIPTLAB_PUBLIC_MODE==='true',stateDirectory=process.env.RECEIPTLAB_STATE_DIRECTORY,canonicalOrigin=process.env.RECEIPTLAB_CANONICAL_ORIGIN;
  validatePublicConfiguration({publicMode,stateDirectory,canonicalOrigin});
  const paths=await servicePaths({publicMode,stateDirectory}),provenance=await createProvenance(),sourceCommit=provenance.sourceCommit;
  const suiteSha256=createHash('sha256').update(JSON.stringify(scenarios.filter(s=>['grant-transient','workshop-false-success'].includes(s.id)))).digest('hex');
  const clean=provenance.sourceCommitBasis==='git-head'?provenance.codeTreeDirty===false:provenance.runtimeMatchesBuild===true&&a.runtimeSha256===provenance.runtimeSha256;
  if(!clean||a.sourceCommit!==sourceCommit||a.suiteSha256!==suiteSha256||a.model!==process.env.NEBIUS_MODEL||a.maxRequests!==3||a.maxOutputTokens!==8192||a.spendLimitUsd>.02||a.responseContract!=='preflight-then-diagnosis'||JSON.stringify(a.scenarioIds)!==JSON.stringify(['grant-transient','workshop-false-success']))throw new Error('Service source/suite/model/scope mismatch');
  output=resolve(paths.evidenceDirectory,a.id+'.service-report.json');
  account=await reserveAccountBudget({directory:paths.accountDirectory,campaignId:a.id,maxReservedUsd:a.spendLimitUsd,purpose:a.purpose,sourceCommit,suiteSha256:a.suiteSha256,initialSpentUsd:.00022644});
  campaign=await createCampaign({authorization:a,sourceCommit,suiteSha256:a.suiteSha256,ledgerPath:resolve(paths.campaignDirectory,a.id+'.jsonl')});
  const policy=createDiagnosticPolicy({model:a.model,approved:true,temperature:a.diagnosticSampling?.temperature??0,topP:a.diagnosticSampling?.top_p,maxOutputTokens:a.maxOutputTokens,inputUsdPerMillion:a.inputUsdPerMillion,outputUsdPerMillion:a.outputUsdPerMillion,fetchImpl:campaign.fetch});
  stage='serving-local-workbench';
  let ready=false;
  tracked=drainablePolicy({async diagnose(trace){if(!ready)throw new Error('Model capability preflight not ready');try{const result=await policy.diagnose(trace);await appendFile(resolve(paths.evidenceDirectory,a.id+'.diagnoses.jsonl'),JSON.stringify({at:new Date().toISOString(),trace,result})+'\n',{mode:0o600});return result;}catch(error){await appendFile(resolve(paths.evidenceDirectory,a.id+'.diagnoses.jsonl'),JSON.stringify({at:new Date().toISOString(),traceId:trace.id,error:'Diagnostic request rejected',providerOutcome:error.report??null})+'\n',{mode:0o600});throw error;}}});
  tracked.durableBudgetDirectory=paths.budgetDirectory;
  server=await createWorkbench({publicMode,stateDirectory,canonicalOrigin,diagnosticBudgetDirectory:paths.budgetDirectory,port:Number(process.env.PORT??3000),diagnosticPolicy:tracked,diagnosticExecutionKind:'live-nebius',allowedDiagnosticScenarios:a.scenarioIds});
  stage='catalog';const catalog=await checkCatalog();
  if(catalog.inputUsdPerMillion!==a.inputUsdPerMillion||catalog.outputUsdPerMillion!==a.outputUsdPerMillion)throw new Error('Service price drift');
  stage='preflight';const first=await preflight({live:true,approved:true,maxOutputTokens:1024,spendLimitUsd:a.spendLimitUsd,inputUsdPerMillion:a.inputUsdPerMillion,outputUsdPerMillion:a.outputUsdPerMillion,creditEvidence:a.creditEvidence,fetchImpl:campaign.fetch});
  await writeFile(resolve(paths.evidenceDirectory,a.id+'.preflight.json'),JSON.stringify(first,null,2)+'\n',{flag:'wx',mode:0o600});
  ready=true;
  console.log(JSON.stringify({status:'local-service-ready',origin:server.origin,sourceCommit,suiteSha256:a.suiteSha256,maxTotalRequests:a.maxRequests,maxEstimatedReservationUsd:a.spendLimitUsd,publicDeployment:false}));
  const timer=setTimeout(()=>{if(ended)return;finish('approval-expired').then(()=>process.exit(0)).catch(()=>{console.error('Shutdown evidence incomplete; preserve ledger lock for investigation.');process.exit(1);});},Math.max(1,Date.parse(a.expiresAt)-Date.now()));timer.unref();
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(ended)return;clearTimeout(timer);finish('closed-by-operator').then(()=>process.exit(0)).catch(()=>{console.error('Shutdown evidence incomplete; preserve ledger lock for investigation.');process.exit(1);});});
 }
}catch{await finish('stopped','Service stage failed safely; inspect protected campaign ledger');console.error('Live workbench stopped safely; no automatic retry.');process.exitCode=1;}
