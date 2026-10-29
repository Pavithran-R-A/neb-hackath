import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCampaign} from '../src/campaign.mjs';
const model='nvidia/test-nemotron',sha='a'.repeat(40),suite='b'.repeat(64);
const authorization=()=>({id:'owner-approved-test',approved:true,approvedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+600000).toISOString(),sourceCommit:sha,suiteSha256:suite,model,maxRequests:2,maxOutputTokens:1024,spendLimitUsd:.01,inputUsdPerMillion:.06,outputUsdPerMillion:.24,creditEvidence:{source:'owner-attested-no-card',checkedAt:new Date().toISOString(),availableCreditUsd:59,noBankCardEverAdded:true,existingCreditsOnlyAuthorized:true,paidReplenishmentProhibited:true}});
const init={method:'POST',redirect:'error',body:JSON.stringify({model,max_tokens:1024,messages:[{role:'system',content:'JSON'},{role:'user',content:'synthetic'}],response_format:{type:'json_object'}})};
const endpoint='https://api.tokenfactory.nebius.com/v1/chat/completions';
const response=()=>new Response(JSON.stringify({model,choices:[{finish_reason:"stop",message:{role:"assistant",content:'{"actions":[{"type":"wait"}]}'}}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}}));
async function setup(t,changes={},fetchImpl=async()=>response()){
 const dir=await mkdtemp(join(tmpdir(),'neb-campaign-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const options={authorization:{...authorization(),...changes},ledgerPath:join(dir,'ledger.jsonl'),sourceCommit:sha,suiteSha256:suite,fetchImpl};
 return {options,campaign:await createCampaign(options)};
}
test('campaign reserves before sending and durable ledger cannot be reused after close',async t=>{
 let path,calls=0;
 const {campaign,options}=await setup(t,{},async()=>{calls++;assert.match(await readFile(path,'utf8'),/reserved/);return response();});path=options.ledgerPath;
 await campaign.fetch(endpoint,init);assert.equal(calls,1);assert.equal(campaign.status().requestsReserved,1);assert.ok(campaign.status().reservedUsd>0);
 await campaign.close();await assert.rejects(()=>createCampaign(options),/already exists/);assert.ok(!(await readFile(path,'utf8')).includes('synthetic'));
});
test('campaign rejects wrong source/suite, unapproved and unsafe prices/credit limits before network',async t=>{
 for(const changes of [{approved:false},{sourceCommit:'c'.repeat(40)},{suiteSha256:'c'.repeat(64)},{spendLimitUsd:.51},{maxRequests:101},{maxOutputTokens:1025},{inputUsdPerMillion:0},{creditEvidence:undefined},{expiresAt:new Date(Date.now()-1).toISOString()}])await assert.rejects(()=>setup(t,changes));
});
test('campaign refuses exhausted call or aggregate reservation budgets',async t=>{
 let calls=0;const {campaign}=await setup(t,{maxRequests:1},async()=>{calls++;return response();});
 await campaign.fetch(endpoint,init);await assert.rejects(()=>campaign.fetch(endpoint,init),/budget/);assert.equal(calls,1);await campaign.close();
 const {campaign:tiny}=await setup(t,{spendLimitUsd:.000001},async()=>{throw new Error('must not call');});
 await assert.rejects(()=>tiny.fetch(endpoint,init),/budget/);assert.equal(tiny.status().requestsReserved,0);await tiny.close();
});
test('unknown usage and transport/HTTP failures retain reservation and halt without retry',async t=>{
 for(const fetchImpl of [async()=>{throw new Error('PRIVATE');},async()=>new Response('{}'),async()=>new Response('PRIVATE',{status:429}),async()=>new Response(JSON.stringify({usage:{prompt_tokens:1,completion_tokens:1025,total_tokens:1026}}))]){
  const {campaign,options}=await setup(t,{},fetchImpl);await campaign.fetch(endpoint,init).catch(()=>{});
  assert.equal(campaign.status().halted,true);assert.equal(campaign.status().requestsReserved,1);
  await assert.rejects(()=>campaign.fetch(endpoint,init),/halted/);assert.ok(!(await readFile(options.ledgerPath,'utf8')).includes('PRIVATE'));await campaign.close();
 }
});
test('campaign denies concurrent calls, wrong destination, model and output limits',async t=>{
 let release;const {campaign}=await setup(t,{},()=>new Promise(resolve=>{release=()=>resolve(response());}));
 for(const [url,body] of [['https://example.invalid',init.body],[endpoint,JSON.stringify({...JSON.parse(init.body),model:'other'})],[endpoint,JSON.stringify({...JSON.parse(init.body),max_tokens:1025})]])await assert.rejects(()=>campaign.fetch(url,{...init,body}));
 const pending=campaign.fetch(endpoint,init);await assert.rejects(()=>campaign.fetch(endpoint,init),/concurrent/);
 while(!release)await new Promise(resolve=>setImmediate(resolve));release();await pending;await campaign.close();
});

test('campaign halts on model/choice/JSON contract failure before another request',async t=>{
 for(const changes of [{model:'nvidia/wrong-nemotron'},{choices:[]},{choices:[{finish_reason:'length',message:{role:'assistant',content:'{}'}}]},{choices:[{finish_reason:'stop',message:{role:'assistant',content:'broken'}}]}]){
  const {campaign}=await setup(t,{},async()=>new Response(JSON.stringify({...await response().json(),...changes})));
  await campaign.fetch(endpoint,init);assert.equal(campaign.status().halted,true);await campaign.close();
 }
});
test('campaign CLI defaults to a no-network source/suite-bound plan',async()=>{
 const {spawnSync}=await import('node:child_process');
 const child=spawnSync(process.execPath,['scripts/campaign.mjs'],{encoding:'utf8'});assert.equal(child.status,0,child.stderr);
 const plan=JSON.parse(child.stdout);assert.equal(plan.authorized,false);assert.equal(plan.inferenceRequestsSent,0);assert.equal(plan.scenarioIds.length,9);assert.match(plan.sourceCommit,/^[a-f0-9]{40}$/);
 const bad=spawnSync(process.execPath,['scripts/campaign.mjs','--execute'],{encoding:'utf8'});assert.equal(bad.status,1);
});
test('directory durability failure refuses campaign creation before network',async t=>{
 const fs=await import('node:fs/promises');const dir=await mkdtemp(join(tmpdir(),'neb-dir-sync-'));t.after(()=>rm(dir,{recursive:true,force:true}));let calls=0,dirSyncs=0;
 const storage={mkdir:fs.mkdir,open:async(...args)=>{
  const handle=await fs.open(...args);
  if((await handle.stat()).isDirectory())return {sync:async()=>{dirSyncs++;throw new Error('simulated directory fsync failure');},close:()=>handle.close()};
  return handle;
 }};
 await assert.rejects(()=>createCampaign({authorization:authorization(),ledgerPath:join(dir,'new-parent','ledger.jsonl'),sourceCommit:sha,suiteSha256:suite,storage,fetchImpl:async()=>{calls++;return response();}}),/persist/);
 assert.equal(calls,0);assert.equal(dirSyncs,1);
});
test('diagnosis campaign permits documented 2048 output limit and mixed preflight/diagnosis envelopes',async t=>{
 const fs=await import('node:fs/promises');const dir=await mkdtemp(join(tmpdir(),'neb-diagnosis-campaign-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const a={...authorization(),maxOutputTokens:2048,responseContract:'preflight-then-diagnosis'};
 let calls=0;const campaign=await createCampaign({authorization:a,ledgerPath:join(dir,'ledger'),sourceCommit:sha,suiteSha256:suite,fetchImpl:async()=>{
  calls++;return new Response(JSON.stringify({model,choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(calls===1?{actions:[{type:'wait'}]}:{diagnosis:'ambiguous',explanation:'unknown',evidenceIds:['e1'],recovery:{action:'stop',reason:'insufficient'},confidence:'low'})}}],usage:{prompt_tokens:20,completion_tokens:30,total_tokens:50}}));
 }});
 await campaign.fetch(endpoint,{...init,body:JSON.stringify({...JSON.parse(init.body),response_format:{type:'json_schema',json_schema:{name:'synthetic_preflight'}}})});
 await campaign.fetch(endpoint,{...init,body:JSON.stringify({...JSON.parse(init.body),max_tokens:2048,messages:[{role:'system',content:'JSON'},{role:'user',content:JSON.stringify({id:'fixture',task:{goal:'test'},events:[{id:'e1',source:'server',kind:'error',text:'unknown'}],verification:{completed:false,reason:'unknown'}})}],response_format:{type:'json_schema',json_schema:{name:'grounded_diagnosis'}}})});
 assert.equal(campaign.status().halted,false);assert.equal(calls,2);await campaign.close();
});
test('diagnostic sampling is pinned before reservation and cannot add unsupported controls',async t=>{
 let calls=0;const {campaign}=await setup(t,{responseContract:'preflight-then-diagnosis',maxOutputTokens:8192,diagnosticSampling:{temperature:1,top_p:.95}},async()=>{calls++;return response();});
 const body={...JSON.parse(init.body),temperature:0,response_format:{type:'json_schema',json_schema:{name:'synthetic_preflight'}}};await campaign.fetch(endpoint,{...init,body:JSON.stringify(body)});
 for(const patch of [{temperature:0,top_p:.95},{temperature:1,top_p:.95,reasoning_effort:'none'},{temperature:1,top_p:.95,chat_template_kwargs:{enable_thinking:false}}])await assert.rejects(()=>campaign.fetch(endpoint,{...init,body:JSON.stringify({...body,...patch,response_format:{type:'json_schema',json_schema:{name:'grounded_diagnosis'}}})}),/sampling/);
 assert.equal(calls,1);assert.equal(campaign.status().requestsReserved,1);await campaign.close();
});
