import test from 'node:test';
import assert from 'node:assert/strict';
import { createNemotronPolicy } from '../src/agents/nebius.mjs';
const model='nvidia/test-nemotron';
const input={task:{name:'Avery Example'},observation:{text:'Step 1',controls:[]},history:[]};
const response=(overrides={})=>new Response(JSON.stringify({model,choices:[{message:{content:'{"actions":[{"type":"abort"}]}'}}],usage:{prompt_tokens:100,completion_tokens:10,total_tokens:110},...overrides}));
test('live inference requires key, explicit paid approval and NVIDIA Nemotron model',()=>{
 assert.throws(()=>createNemotronPolicy({apiKey:'',model,approved:true}),/NEBIUS_API_KEY/);
 assert.throws(()=>createNemotronPolicy({apiKey:'test-only',model}),/approval/);
 assert.throws(()=>createNemotronPolicy({apiKey:'test-only',model:'other/model',approved:true}),/Nemotron/);
});
test('Nemotron client sends bounded JSON to official endpoint and accounts for measured usage',async()=>{
 let calls=0;
 const policy=createNemotronPolicy({apiKey:'test-only',model,approved:true,maxCalls:1,fetchImpl:async(url,options)=>{
  calls++;assert.equal(url,'https://api.tokenfactory.nebius.com/v1/chat/completions');
  assert.equal(options.headers.Authorization,'Bearer test-only');
  const body=JSON.parse(options.body);assert.equal(body.model,model);assert.equal(body.max_tokens,1024);assert.equal(body.stream,false);
  return response();
 }});
 assert.deepEqual(await policy.decide(input),{actions:[{type:'abort'}]});
 assert.equal(policy.metrics().promptTokens,100);assert.equal(policy.metrics().completionTokens,10);assert.equal(policy.metrics().estimatedModelCostUsd,null);
 await assert.rejects(()=>policy.decide(input),/budget/);assert.equal(calls,1);
});
test('provider errors are sanitized, never retried or silently replaced',async()=>{
 const policy=createNemotronPolicy({apiKey:'test-only-secret',model,approved:true,fetchImpl:async()=>new Response('test-only-secret',{status:401})});
 await assert.rejects(()=>policy.decide(input),e=>e.message==='Nebius HTTP 401');
 assert.equal(policy.metrics().calls,1);
});
test('wrong model, invalid JSON, missing usage and excessive output fail safely',async()=>{
 for(const payload of [ {model:'other/model'}, {choices:[{message:{content:'not JSON'}}]}, {choices:[{message:{content:'x'.repeat(9000)}}]} ]){
  const policy=createNemotronPolicy({apiKey:'test-only',model,approved:true,fetchImpl:async()=>response(payload)});
  await assert.rejects(()=>policy.decide(input));
 }
 const policy=createNemotronPolicy({apiKey:'test-only',model,approved:true,fetchImpl:async()=>response({usage:null})});
 await assert.rejects(()=>policy.decide(input),/usage/);assert.equal(policy.metrics().usageComplete,false);assert.equal(policy.metrics().promptTokens,null);
});
test('provider latency includes streamed response body, not just response headers',async()=>{
 const policy=createNemotronPolicy({apiKey:'test-only',model,approved:true,fetchImpl:async()=>new Response(new ReadableStream({start(controller){
  setTimeout(()=>{controller.enqueue(new TextEncoder().encode(JSON.stringify({model,choices:[{message:{content:'{"actions":[{"type":"abort"}]}'}}],usage:{prompt_tokens:1,completion_tokens:1}})));controller.close();},40);
 }}))});
 await policy.decide(input);assert.ok(policy.metrics().providerLatencyMs>=30);
});
test('malformed null envelope never reports a real attempted call as free',async()=>{
 const policy=createNemotronPolicy({apiKey:'test-only',model,approved:true,inputUsdPerMillion:1,outputUsdPerMillion:2,fetchImpl:async()=>new Response('null')});
 await assert.rejects(()=>policy.decide(input),/Nebius.*envelope/);
 assert.equal(policy.metrics().calls,1);assert.equal(policy.metrics().usageComplete,false);
 assert.equal(policy.metrics().promptTokens,null);assert.equal(policy.metrics().estimatedModelCostUsd,null);
});
