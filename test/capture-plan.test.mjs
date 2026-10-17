import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('live browser capture defaults to no-request plan and rejects non-loopback destinations',()=>{
 const cli=new URL('../scripts/capture-live-journey.mjs',import.meta.url).pathname;
 const plan=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.equal(plan.status,0);assert.equal(JSON.parse(plan.stdout).modelRequests,0);
 for(const origin of ['https://example.invalid','http://localhost:3000','http://127.0.0.1:3000/other','http://user@127.0.0.1:3000']){
  const r=spawnSync(process.execPath,[cli,'--origin',origin],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).journeys,0);
 }
});
