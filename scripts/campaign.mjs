import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {evaluationV2,suiteSha256} from '../src/evaluation-v2.mjs';
import {createCampaign} from '../src/campaign.mjs';
import {checkCatalog} from '../src/catalog.mjs';
import {preflight} from '../src/preflight.mjs';
import {createNemotronPolicy} from '../src/agents/nebius.mjs';
import {benchmark} from '../src/benchmark.mjs';

// Default is a completely local plan. There is no accepted approval file in Git.
try{
 let stage='configuration';
 const args=process.argv.slice(2),sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(!args.length){
  console.log(JSON.stringify({mode:'plan-only',inferenceRequestsSent:0,authorized:false,sourceCommit,suiteSha256,scenarioIds:evaluationV2.map(s=>s.id),proposed:{preflightRequests:1,maxTurnsPerTrial:8,repetitions:1,maxRequests:73,maxOutputTokens:1024,inputAllowancePerRequest:20000,inputUsdPerMillion:.06,outputUsdPerMillion:.24,worstCaseEstimateUsd:73*(20000*.06+1024*.24)/1e6},remaining:['New explicit aggregate owner approval','Fresh protected model/catalog prices and credit-only evidence','Exact source/suite-bound approval file; old one-call approval cannot be reused']},null,2));
 }else{
  if(args.length!==3||args[0]!=='--execute'||args[1]!=='--approval')throw new Error('Campaign execution requires --execute --approval PATH');
  const a=JSON.parse(await readFile(args[2],'utf8'));
  if(execFileSync('git',['status','--porcelain','--','src','scripts','test','package.json','package-lock.json'],{encoding:'utf8'}).trim())throw new Error('Campaign requires clean tracked implementation');
  if(a.model!==process.env.NEBIUS_MODEL||!process.env.NEBIUS_API_KEY)throw new Error('Campaign protected credentials/model mismatch');
  if(!Array.isArray(a.scenarioIds)||!a.scenarioIds.length||new Set(a.scenarioIds).size!==a.scenarioIds.length||a.scenarioIds.some(id=>!evaluationV2.some(s=>s.id===id))||!Number.isInteger(a.repetitions)||a.repetitions<1||a.repetitions>2||a.maxRequests<2||a.maxRequests>1+a.scenarioIds.length*a.repetitions*8)throw new Error('Campaign invalid frozen scenario/repetition/request selection');
  // Only a real, separately approved invocation can reach this branch. Exclusive
  // reservation occurs before even the catalog GET; no automatic retry/resume.
  const base=resolve('.cache/campaigns'),ledgerPath=resolve(base,a.id+'.jsonl');
  let campaign,account;
  try{
   account=await reserveAccountBudget({directory:'.cache/account-budget',campaignId:a.id,maxReservedUsd:a.spendLimitUsd,purpose:'Owner-approved action integration campaign',sourceCommit,suiteSha256,initialSpentUsd:.00022644});
   campaign=await createCampaign({authorization:a,sourceCommit,suiteSha256,ledgerPath});
   const catalog=await checkCatalog();
   if(catalog.inputUsdPerMillion!==a.inputUsdPerMillion||catalog.outputUsdPerMillion!==a.outputUsdPerMillion)throw new Error('Campaign current catalog prices differ from approval');
   stage='preflight';
   const first=await preflight({live:true,approved:true,spendLimitUsd:a.spendLimitUsd,maxOutputTokens:a.maxOutputTokens,inputUsdPerMillion:a.inputUsdPerMillion,outputUsdPerMillion:a.outputUsdPerMillion,creditEvidence:a.creditEvidence,fetchImpl:campaign.fetch});
   await writeFile(resolve(base,a.id+'.preflight.json'),JSON.stringify({sourceCommit,suiteSha256,result:first},null,2)+'\n',{flag:'wx',mode:0o600});
   stage='browser-evaluation';
   const policy=createNemotronPolicy({approved:true,maxCalls:a.maxRequests-1,maxOutputTokens:a.maxOutputTokens,inputUsdPerMillion:a.inputUsdPerMillion,outputUsdPerMillion:a.outputUsdPerMillion,fetchImpl:campaign.fetch});
   const output=resolve(base,a.id+'.report.json');await mkdir(dirname(output),{recursive:true});
   const result=await benchmark({livePolicy:policy,scenarioIds:a.scenarioIds,repetitions:a.repetitions,baselines:['dom-autofill'],onRow:async row=>{
    await appendFile(output+'.jsonl',JSON.stringify(row)+'\n');
    if(campaign.status().halted||(row.mode==='nebius-nemotron'&&row.errors.some(e=>e.startsWith('Nebius')||e.includes('guard rejected'))))throw new Error('Campaign stopped on provider/action contract failure');
   }});
   await writeFile(output,JSON.stringify({schemaVersion:1,sourceCommit,suiteSha256,catalog,preflight:first,...result,campaign:campaign.status()},null,2)+'\n',{flag:'wx',mode:0o600});
   console.log(JSON.stringify({status:'completed',sourceCommit,suiteSha256,output,campaign:campaign.status(),summary:result.summary},null,2));
  }catch(error){await writeFile(resolve(base,a.id+'.failure.json'),JSON.stringify({sourceCommit,suiteSha256,stage,error:error.message.startsWith('Nebius')?error.message:'Campaign stage failed',report:error.report??null,campaign:campaign?.status()},null,2)+'\n',{flag:'wx',mode:0o600});throw error;}finally{if(campaign)await campaign.close();if(account)await account.settle({knownCostUsd:campaign?.status().knownCostUsd??0,usageComplete:campaign?.status().usageComplete??true,requests:campaign?.status().requestsReserved??0});}
 }
}catch{console.error('Campaign stopped safely; inspect protected local ledger and approval prerequisites. No retry is authorized automatically.');process.exitCode=1;}
