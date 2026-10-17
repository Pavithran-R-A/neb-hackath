import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,writeFile,rm,access} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {execFileSync,spawnSync} from 'node:child_process';
import {reserveAccountBudget} from '../src/account-budget.mjs';import {suiteSha256} from '../src/evaluation-v2.mjs';
test('legacy action campaign cannot bypass an active cumulative account lock',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'neb-action-lock-'));const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
 git('init','-q');await writeFile(join(dir,'README'),'test');git('add','.');git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture');const sourceCommit=git('rev-parse','HEAD');
 const holder=await reserveAccountBudget({directory:join(dir,'.cache/account-budget'),campaignId:'held',maxReservedUsd:.01,purpose:'fixture',sourceCommit,suiteSha256});t.after(async()=>{await holder.settle({knownCostUsd:0,usageComplete:true,requests:0});await rm(dir,{recursive:true,force:true});});
 const now=new Date().toISOString(),a={id:'blocked',approved:true,approvedAt:now,expiresAt:new Date(Date.now()+600000).toISOString(),sourceCommit,suiteSha256,model:'nvidia/test-nemotron',scenarioIds:['v2-validation-chain'],repetitions:1,maxRequests:2,maxOutputTokens:1024,spendLimitUsd:.01,inputUsdPerMillion:.06,outputUsdPerMillion:.24,creditEvidence:{source:'owner-attested-no-card',checkedAt:now,availableCreditUsd:59,noBankCardEverAdded:true,existingCreditsOnlyAuthorized:true,paidReplenishmentProhibited:true}};
 await mkdir(join(dir,'.cache/campaigns'),{recursive:true});await writeFile(join(dir,'approval.json'),JSON.stringify(a));
 await writeFile(join(dir,'mock-fetch.mjs'),"import {writeFileSync} from 'node:fs';globalThis.fetch=async()=>{writeFileSync('NETWORK_ATTEMPT','blocked mock');throw new Error('simulated');};");
 const cli=new URL('../scripts/campaign.mjs',import.meta.url).pathname;
 const result=spawnSync(process.execPath,['--import',join(dir,'mock-fetch.mjs'),cli,'--execute','--approval',join(dir,'approval.json')],{cwd:dir,encoding:'utf8',env:{...process.env,NEBIUS_API_KEY:'test-only',NEBIUS_MODEL:a.model}});
 assert.equal(result.status,1);await assert.rejects(()=>access(join(dir,'NETWORK_ATTEMPT')));
});
