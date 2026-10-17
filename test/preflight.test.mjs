import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { preflight } from '../src/preflight.mjs';

const model='nvidia/test-nemotron';
const decision={actions:[{type:'fill',target:0,value:'Avery Example'},{type:'click',target:1}]};
const fixture=(changes={})=>new Response(JSON.stringify({model,choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(decision)}}],usage:{prompt_tokens:100,completion_tokens:30,total_tokens:130},...changes}),{headers:{'content-type':'application/json'}});
const creditEvidence={source:'owner-confirmed-billing-ui',checkedAt:new Date().toISOString(),availableCreditUsd:10,expiresAt:null,automaticChargingDisabled:true,automaticTopupsDisabled:true};
const options={creditEvidence,apiKey:'test-only-preflight-secret',model,live:true,approved:true,spendLimitUsd:0.01,inputUsdPerMillion:0.06,outputUsdPerMillion:0.24};

test('dry-run checks presence without any network call or disclosure',async()=>{
 let calls=0;
 const result=await preflight({...options,live:false,approved:false,fetchImpl:async()=>{calls++;throw new Error('Should never execute');}});
 assert.equal(calls,0);assert.equal(result.mode,'dry-run');assert.equal(result.requestsSent,0);assert.equal(result.liveValidated,false);
 assert.equal(result.credentials.apiKeyPresent,true);assert.equal(result.credentials.modelPresent,true);
 const serialized=JSON.stringify(result);assert.ok(!serialized.includes(options.apiKey));assert.ok(!serialized.includes(model));
});
test('no request without explicit approval, a positive spending limit, valid prices and credentials',async()=>{
 for(const changes of [{approved:false},{spendLimitUsd:undefined},{spendLimitUsd:0},{spendLimitUsd:-1},{spendLimitUsd:NaN},{spendLimitUsd:1e-10},{inputUsdPerMillion:undefined},{outputUsdPerMillion:0},{inputUsdPerMillion:-1},{apiKey:''},{model:''},{model:'other/model'}]){
  let calls=0;await assert.rejects(()=>preflight({...options,...changes,fetchImpl:async()=>{calls++;return fixture();}}));assert.equal(calls,0);
 }
});
test('one request validates exact model, JSON batch and complete usage with sanitized results',async()=>{
 let calls=0;
 const result=await preflight({...options,fetchImpl:async(url,init)=>{
  calls++;assert.equal(url,'https://api.tokenfactory.nebius.com/v1/chat/completions');assert.equal(init.method,'POST');assert.equal(init.redirect,'error');
  assert.equal(init.headers.Authorization,'Bearer '+options.apiKey);
  const body=JSON.parse(init.body);assert.equal(body.model,model);assert.equal(body.max_tokens,1024);assert.equal(body.response_format.type,'json_schema');assert.equal(body.stream,false);
  assert.ok(init.signal instanceof AbortSignal);return fixture();
 }});
 assert.equal(calls,1);assert.equal(result.requestsSent,1);assert.equal(result.liveValidated,true);
 assert.equal(result.modelIdentityVerified,true);assert.equal(result.actionSchemaVerified,true);
 assert.equal(result.usage.totalTokens,130);assert.equal(result.estimatedModelCostUsd,(100*.06+30*.24)/1e6);
 assert.ok(!JSON.stringify(result).includes(options.apiKey));assert.ok(!JSON.stringify(result).includes(model));
});
test('HTTP errors, transport failures and timeouts do not retry or leak provider text',async()=>{
 for(const status of [401,403,404,429,500]){
  let calls=0;await assert.rejects(()=>preflight({...options,fetchImpl:async()=>{calls++;return new Response(options.apiKey,{status});}}),e=>e.message===`Nebius HTTP ${status}`);assert.equal(calls,1);
 }
 for(const name of ['Error','AbortError','TimeoutError']){
  let calls=0;await assert.rejects(()=>preflight({...options,fetchImpl:async()=>{calls++;const e=new Error(options.apiKey);e.name=name;throw e;}}),e=>!e.message.includes(options.apiKey)&&e.message.includes('Nebius'));assert.equal(calls,1);
 }
});
test('unexpected models, malformed JSON/envelopes, truncated/refused responses and bad usage fail closed',async()=>{
 const choice=content=>({choices:[{finish_reason:'stop',message:{role:'assistant',content}}]});
 const variants=[
  [{model:'nvidia/unreviewed-nemotron-alias'},/unexpected model/],
  [{choices:[]},/response choice/],
  [{choices:[{finish_reason:'length',message:{role:'assistant',content:JSON.stringify(decision)}}]},/response choice/],
  [{choices:[{finish_reason:'content_filter',message:{role:'assistant',content:JSON.stringify(decision)}}]},/response choice/],
  [{choices:[{message:{role:'assistant',content:JSON.stringify(decision)}}]},/response choice/],
  [{choices:[{finish_reason:'stop',message:{role:'assistant',refusal:'refused',content:JSON.stringify(decision)}}]},/response choice/],
  [choice('not json'),/action JSON is invalid/],
  [{usage:null},/usage missing/],
  [{usage:{prompt_tokens:100,completion_tokens:30}},/usage missing/],
  [{usage:{prompt_tokens:100,completion_tokens:30,total_tokens:999}},/usage missing/],
  [{usage:{prompt_tokens:100,completion_tokens:0,total_tokens:100}},/positive input and output/],
  [{usage:{prompt_tokens:100,completion_tokens:1025,total_tokens:1125}},/output-token budget/],
  [choice('null'),/action schema rejected/],
  [choice(JSON.stringify({actions:[{type:'goto',url:'https://example.com'}]})),/action schema rejected/],
  [choice(JSON.stringify({actions:[{type:'fill',target:0,value:'Invented Name'}]})),/action schema rejected/],
  [choice(JSON.stringify({actions:[{type:'done'}]})),/action plan did not match/]
 ];
 for(const [payload,pattern] of variants){let calls=0;await assert.rejects(()=>preflight({...options,fetchImpl:async()=>{calls++;return fixture(payload);}}),pattern);assert.equal(calls,1);}
 for(const body of ['null','[]','broken JSON'])await assert.rejects(()=>preflight({...options,fetchImpl:async()=>new Response(body)}));
});
test('CLI defaults to no network and cannot opt into billing accidentally',()=>{
 const env={...process.env,NEBIUS_API_KEY:options.apiKey,NEBIUS_MODEL:model};
 const child=spawnSync(process.execPath,['scripts/preflight.mjs'],{encoding:'utf8',env});
 assert.equal(child.status,0,child.stderr);assert.equal(JSON.parse(child.stdout).requestsSent,0);
 assert.ok(!child.stdout.includes(options.apiKey));assert.ok(!child.stdout.includes(model));
 for(const args of [['--live'],['--approve-paid'],['--live','--spend-limit-usd','0.01'],['--typo'],['--spend-limit-usd'],['--live','--approve-paid']]){
  const bad=spawnSync(process.execPath,['scripts/preflight.mjs',...args],{encoding:'utf8',env});
  assert.equal(bad.status,1);assert.ok(!bad.stderr.includes(options.apiKey));
 }
});
test('valid JSON key ordering does not affect the action contract',async()=>{
 const content=JSON.stringify({actions:[{value:'Avery Example',target:0,type:'fill'},{target:1,type:'click'}]});
 const result=await preflight({...options,fetchImpl:async()=>fixture({choices:[{finish_reason:'stop',message:{role:'assistant',content}}]})});
 assert.equal(result.liveValidated,true);
});
test('unexpected successful HTTP status is rejected',async()=>{
 await assert.rejects(()=>preflight({...options,fetchImpl:async()=>new Response(await fixture().text(),{status:201})}),/Nebius HTTP 201/);
});
test('cleanup failure preserves the sanitized HTTP error',async()=>{
 await assert.rejects(()=>preflight({...options,fetchImpl:async()=>new Response(new ReadableStream({cancel(){throw new Error(options.apiKey);}}),{status:503})}),e=>e.message==='Nebius HTTP 503');
});
test('preflight refuses limits above the project promo-credit ceiling without a request',async()=>{
 let calls=0;
 await assert.rejects(()=>preflight({...options,spendLimitUsd:.51,fetchImpl:async()=>{calls++;return fixture();}}),/0.50/);
 assert.equal(calls,0);
});

test('approved live preflight refuses missing current credit confirmation without fetching',async()=>{
 let calls=0;
 await assert.rejects(()=>preflight({...options,creditEvidence:undefined,fetchImpl:async()=>{calls++;return fixture();}}),/Credit-only/);
 assert.equal(calls,0);
});

test('dry-run with credentials and prices but no billing evidence cannot claim readiness',async()=>{
 const result=await preflight({...options,live:false,creditEvidence:undefined});
 assert.equal(result.readyForApproval,false);assert.equal(result.billing.creditOnlyVerified,false);assert.equal(result.requestsSent,0);
});
test('dry-run readiness also enforces the authorized ceiling and safety estimate',async()=>{
 for(const spendLimitUsd of [.51,1e-10]){
  const result=await preflight({...options,live:false,spendLimitUsd});
  assert.equal(result.readyForApproval,false);assert.equal(result.requestsSent,0);
 }
});
test('observed HTTP-200 token-limit outcome retains usage and rejects without retry (simulated response)',async()=>{
 let calls=0;
 const evidence={source:'owner-attested-no-card',checkedAt:new Date().toISOString(),availableCreditUsd:59,noBankCardEverAdded:true,existingCreditsOnlyAuthorized:true,paidReplenishmentProhibited:true};
 await assert.rejects(()=>preflight({...options,maxOutputTokens:256,creditEvidence:evidence,fetchImpl:async()=>{
  calls++;return fixture({choices:[{finish_reason:'length',message:{role:'assistant',content:'{"actions":['}}],usage:{prompt_tokens:391,completion_tokens:256,total_tokens:647}});
 }}),error=>{
  assert.match(error.message,/response choice/);assert.equal(error.report.liveValidated,false);assert.equal(error.report.requestsSent,1);
  assert.equal(error.report.usage.promptTokens,391);assert.equal(error.report.usage.completionTokens,256);assert.equal(error.report.estimatedModelCostUsd,.0000849);return true;
 });
 assert.equal(calls,1);
});

test('compact schema preflight defaults to 1024 tokens without enabling reasoning parameters',async()=>{
 const result=await preflight({...options,fetchImpl:async(_url,init)=>{
  const body=JSON.parse(init.body);
  assert.equal(body.max_tokens,1024);
  assert.equal(body.response_format.type,'json_schema');
  assert.equal(body.response_format.json_schema.strict,true);
  assert.equal(body.response_format.json_schema.schema.additionalProperties,false);
  assert.ok(body.messages[0].content.length<600);
  assert.equal('reasoning_effort' in body,false);assert.equal('chat_template_kwargs' in body,false);
  return fixture();
 }});
 assert.equal(result.request.responseFormat,'json_schema');assert.equal(result.provider.httpStatus,200);
 assert.equal(result.provider.finishReason,'stop');assert.equal(result.provider.modelIdentityVerified,true);
});
test('preflight budget is configurable, bounded before fetching and used in cost estimates',async()=>{
 for(const maxOutputTokens of [0,1025,1.5,NaN,'1024']){
  let calls=0;await assert.rejects(()=>preflight({...options,maxOutputTokens,fetchImpl:async()=>{calls++;return fixture();}}),/output-token budget/);assert.equal(calls,0);
 }
 const small=await preflight({...options,live:false,maxOutputTokens:256});
 const large=await preflight({...options,live:false,maxOutputTokens:1024});
 assert.ok(Math.abs(large.request.safetyEstimateUsd-small.request.safetyEstimateUsd-768*.24/1e6)<1e-12);
 await preflight({...options,maxOutputTokens:512,fetchImpl:async(_url,init)=>{assert.equal(JSON.parse(init.body).max_tokens,512);return fixture();}});
});
test('truncation retains sanitized diagnostics, never reasoning or partial content and never retries',async()=>{
 let calls=0;
 await assert.rejects(()=>preflight({...options,fetchImpl:async()=>{
  calls++;return fixture({choices:[{finish_reason:'length',message:{role:'assistant',content:'PRIVATE PARTIAL',reasoning_content:'PRIVATE REASONING'}}],usage:{prompt_tokens:100,completion_tokens:1024,total_tokens:1124,completion_tokens_details:{reasoning_tokens:1000}}});
 }}),error=>{
  assert.equal(error.report.provider.finishReason,'length');assert.equal(error.report.provider.reasoningTokens,1000);
  assert.equal(error.report.provider.contentCharacters,15);assert.equal(error.report.provider.modelIdentityVerified,true);
  assert.ok(!JSON.stringify(error.report).includes('PRIVATE'));return true;
 });assert.equal(calls,1);
});
test('excessive content is rejected even with valid usage and stop reason',async()=>{
 await assert.rejects(()=>preflight({...options,fetchImpl:async()=>fixture({choices:[{finish_reason:'stop',message:{role:'assistant',content:' '.repeat(8193)}}]})}),/excessive/);
});
test('CLI accepts safe dry-run token configuration and rejects invalid budgets',()=>{
 const env={...process.env,NEBIUS_API_KEY:options.apiKey,NEBIUS_MODEL:model};
 const good=spawnSync(process.execPath,['scripts/preflight.mjs','--max-output-tokens','512'],{encoding:'utf8',env});
 assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).request.maxOutputTokens,512);assert.equal(JSON.parse(good.stdout).requestsSent,0);
 for(const value of ['0','1025','oops'])assert.equal(spawnSync(process.execPath,['scripts/preflight.mjs','--max-output-tokens',value],{encoding:'utf8',env}).status,1);
});
