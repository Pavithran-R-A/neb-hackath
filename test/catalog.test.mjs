import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCatalog } from '../src/catalog.mjs';
const model='nvidia/test-nemotron',apiKey='test-only';
test('non-billable verbose catalog selects only configured model and normalizes per-token pricing',async()=>{
 let calls=0;
 const result=await checkCatalog({model,apiKey,fetchImpl:async(url,options)=>{
  calls++;assert.equal(url,'https://api.tokenfactory.nebius.com/v1/models?verbose=true');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
  return new Response(JSON.stringify({data:[{id:'other',pricing:{}},{id:model,pricing:{prompt:'0.00000006',completion:'0.00000024',request:'0'}}]}));
 }});
 assert.equal(calls,1);assert.equal(result.inputUsdPerMillion,.06);assert.equal(result.outputUsdPerMillion,.24);assert.equal(result.inferenceRequests,0);assert.ok(!JSON.stringify(result).includes(model));
});
test('catalog rejects absent/duplicate models, malformed or non-token pricing, errors without disclosure',async()=>{
 for(const data of [{data:[]},{data:[{id:model},{id:model}]},{data:[{id:model,pricing:{prompt:'bad',completion:'.1'}}]},{data:[{id:model,pricing:{prompt:'.1',completion:'.1',request:'1'}}]},null]){
  await assert.rejects(()=>checkCatalog({model,apiKey,fetchImpl:async()=>new Response(JSON.stringify(data))}));
 }
 await assert.rejects(()=>checkCatalog({model,apiKey,fetchImpl:async()=>new Response(apiKey,{status:403})}),e=>!e.message.includes(apiKey));
});
