import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('live browser capture defaults to no-request plan and rejects non-loopback destinations',()=>{
 const directory=mkdtempSync(join(tmpdir(),'receiptlab-capture-plan-'));try{
 const cli=new URL('../scripts/capture-live-journey.mjs',import.meta.url).pathname;
 const plan=spawnSync(process.execPath,[cli],{encoding:'utf8',cwd:directory});assert.equal(plan.status,0);assert.equal(JSON.parse(plan.stdout).modelRequests,0);
 writeFileSync(join(directory,'sentinel'),'keep');
 for(const origin of ['https://example.invalid','http://localhost:3000','http://127.0.0.1:3000/other','http://user@127.0.0.1:3000']){
  const r=spawnSync(process.execPath,[cli,'--origin',origin],{encoding:'utf8',cwd:directory});assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).journeys,0);
 }
 assert.equal(readFileSync(join(directory,'sentinel'),'utf8'),'keep');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('private HTTPS capture requires an explicit certificate pin and rejects untrusted origins',()=>{
 const cli=new URL('../scripts/capture-live-journey.mjs',import.meta.url).pathname;
 for(const args of [['--origin','https://127.0.0.1:9443'],['--origin','https://example.invalid','--tls-spki','a'.repeat(43)+'='],['--origin','https://127.0.0.1:9443','--tls-spki','invalid']]){
 const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).journeys,0);
 }
});
