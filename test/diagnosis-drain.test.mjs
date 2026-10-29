import test from 'node:test';import assert from 'node:assert/strict';import {drainablePolicy} from '../src/diagnosis/drain.mjs';
test('shutdown stops new admission and drains successful in-flight work before settlement',async()=>{
 let release;const adapter=drainablePolicy({diagnose:()=>new Promise(resolve=>{release=resolve;})});const work=adapter.diagnose({});await Promise.resolve();let drained=false;const shutdown=adapter.drain().then(()=>{drained=true;});
 await assert.rejects(()=>adapter.diagnose({}),/shutting down/);assert.equal(drained,false);release('actual response');assert.equal(await work,'actual response');await shutdown;assert.equal(drained,true);
});
test('shutdown drains rejected work without retry or suppressing original failure',async()=>{
 let reject,calls=0;const adapter=drainablePolicy({diagnose:()=>{calls++;return new Promise((_,r)=>{reject=r;});}}),work=adapter.diagnose({});await Promise.resolve();const shutdown=adapter.drain();reject(new Error('provider rejected'));await assert.rejects(work,/provider rejected/);await shutdown;assert.equal(calls,1);
});
