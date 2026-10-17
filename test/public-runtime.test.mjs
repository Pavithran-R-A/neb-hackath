import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request as httpRequest} from 'node:http';
import {createWorkbench} from '../src/workbench/server.mjs';
const canonicalOrigin='https://receiptlab.example.invalid';
async function fixture(t){const directory=await mkdtemp(join(tmpdir(),'receiptlab-public-'));t.after(()=>rm(directory,{recursive:true,force:true}));return directory;}
const call=(s,path,{cookie='',body,headers={}}={})=>new Promise((resolve,reject)=>{
 const req=httpRequest(s.origin+path,{method:body===undefined?'GET':'POST',headers:{host:new URL(canonicalOrigin).host,origin:canonicalOrigin,cookie,'content-type':'application/json',...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
});
const session=async s=>{const r=await call(s,'/');assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/; Secure/);return r.headers.get('set-cookie').split(';')[0];};
test('public startup requires explicit trusted HTTPS origin and durable state, independent of forwarded headers',async t=>{
 await assert.rejects(createWorkbench({publicMode:true}),/origin|persistent|directory/i);
 const stateDirectory=await fixture(t);
 await assert.rejects(createWorkbench({publicMode:true,stateDirectory,canonicalOrigin:'http://receiptlab.example.invalid'}),/HTTPS/);
 const s=await createWorkbench({publicMode:true,stateDirectory,canonicalOrigin});t.after(()=>s.close());
 assert.equal((await fetch(s.origin+'/',{headers:{'x-forwarded-host':new URL(canonicalOrigin).host,'x-forwarded-proto':'https'}})).status,403);
 assert.equal((await call(s,'/',{headers:{'x-forwarded-host':'attacker.invalid','x-forwarded-proto':'http'}})).status,403);
 assert.equal((await call(s,'/',{headers:{origin:'https://attacker.invalid'}})).status,403);
});
test('single origin forms enforce cookie ownership and committed receipts survive restart',async t=>{
 const stateDirectory=await fixture(t);let s=await createWorkbench({publicMode:true,stateDirectory,canonicalOrigin});t.after(()=>s?.close());
 const cookie=await session(s),other=await session(s);
 const run=await (await call(s,'/api/runs',{cookie,body:{scenarioId:'grant-clean'}})).json();
 assert.equal(new URL(run.url).origin,canonicalOrigin);assert.match(new URL(run.url).pathname,/^\/forms\/form\//);assert.ok(!JSON.stringify(run).includes('127.0.0.1'));
 assert.equal((await call(s,new URL(run.url).pathname,{cookie:other})).status,404);
 const page=await (await call(s,new URL(run.url).pathname,{cookie})).text();assert.match(page,/\/forms\/client.js/);
 for(const [step,values] of [[0,run.task],[1,run.task],[2,{consent:true}]])assert.equal((await call(s,'/forms/api/runs/'+run.id,{cookie,body:{step,values}})).status,200);
 const verify=()=>call(s,'/api/runs/'+run.id+'/verify',{cookie,body:{claimedCompletion:true}});
 assert.equal((await (await verify()).json()).verification.completed,true);
 await s.close();s=null;s=await createWorkbench({publicMode:true,stateDirectory,canonicalOrigin});
 assert.equal((await (await verify()).json()).verification.completed,true);
 assert.equal((await call(s,'/forms/api/runs/'+run.id,{cookie,body:{step:2,values:{consent:true}}})).status,409);
 const publicRecord=await (await call(s,'/forms/api/runs/'+run.id,{cookie})).text();assert.ok(!/signature|receipt|journal|payload/.test(publicRecord));
 assert.equal((await call(s,'/forms/api/runs/'+run.id,{cookie:other})).status,404);
});
test('durable runtime excludes concurrent instances and rejects damaged state without resetting it',async t=>{
 const stateDirectory=await fixture(t),s=await createWorkbench({publicMode:true,stateDirectory,canonicalOrigin});
 await assert.rejects(createWorkbench({publicMode:true,stateDirectory,canonicalOrigin}),/locked|active|instance/i);await s.close();
 await writeFile(join(stateDirectory,'runtime.sqlite'),'corrupt');
 await assert.rejects(createWorkbench({publicMode:true,stateDirectory,canonicalOrigin}),/database|state|malformed/i);
});
test('public model startup rejects missing or escaped durable budget roots',async t=>{
 const stateDirectory=await fixture(t),diagnosticPolicy={diagnose(){throw new Error('must not call');}};
 for(const diagnosticBudgetDirectory of [undefined,join(stateDirectory,'..','elsewhere')])await assert.rejects(createWorkbench({publicMode:true,stateDirectory,canonicalOrigin,diagnosticPolicy,diagnosticBudgetDirectory}),/budget/i);
 diagnosticPolicy.durableBudgetDirectory=join(stateDirectory,'budgets');
 const s=await createWorkbench({publicMode:true,stateDirectory,canonicalOrigin,diagnosticPolicy,diagnosticBudgetDirectory:diagnosticPolicy.durableBudgetDirectory});t.after(()=>s.close());
 assert.equal((await call(s,'/health')).status,200);
});
test('durability fault poisons the store instead of serving uncommitted state',async t=>{
 const {openDurableState}=await import('../src/runtime/durable-state.mjs');const {rename}=await import('node:fs/promises');
 const stateDirectory=await fixture(t),directory=join(stateDirectory,'volume');const store=openDurableState(directory);
 t.after(()=>store.close());store.state.records.set('committed',{value:1});store.save();
 await rename(directory,join(stateDirectory,'detached'));
 store.state.records.set('uncommitted',{value:2});assert.throws(()=>store.save());assert.throws(()=>store.assertHealthy(),/unavailable/);assert.throws(()=>store.save(),/unavailable/);
});
test('consumed recovery approval remains single-use after durable restart',async t=>{
 const stateDirectory=await fixture(t);let s=await createWorkbench({publicMode:true,stateDirectory,canonicalOrigin});t.after(()=>s?.close());
 const cookie=await session(s),run=await (await call(s,'/api/runs',{cookie,body:{scenarioId:'grant-transient'}})).json();
 for(const [step,values] of [[0,run.task],[1,run.task],[2,{consent:true}]])await call(s,'/forms/api/runs/'+run.id,{cookie,body:{step,values}});
 const diagnosis=await (await call(s,'/api/runs/'+run.id+'/diagnose',{cookie,body:{mode:'deterministic'}})).json();
 const body={approve:true,diagnosisId:diagnosis.id,traceDigest:diagnosis.traceDigest};
 assert.equal((await call(s,'/api/runs/'+run.id+'/recover',{cookie,body})).status,200);
 await s.close();s=null;s=await createWorkbench({publicMode:true,stateDirectory,canonicalOrigin});
 assert.equal((await call(s,'/api/runs/'+run.id+'/recover',{cookie,body})).status,409);
 assert.equal((await (await call(s,'/api/runs/'+run.id+'/verify',{cookie,body:{claimedCompletion:true}})).json()).verification.completed,true);
});
test('SIGKILL releases single-instance lock while committed receipt/session survive actual process restart',async t=>{
 const {spawn}=await import('node:child_process');const {once}=await import('node:events');
 const stateDirectory=await fixture(t);let child;
 const start=async()=>{
  child=spawn(process.execPath,['--input-type=module','-e',`import {createWorkbench} from './src/workbench/server.mjs';const s=await createWorkbench(${JSON.stringify({publicMode:true,stateDirectory,canonicalOrigin})});process.send({origin:s.origin});`],{cwd:process.cwd(),stdio:['ignore','ignore','pipe','ipc']});
  let stderr='';child.stderr.on('data',data=>{stderr+=data;});
  return await new Promise((resolve,reject)=>{child.once('message',resolve);child.once('error',reject);child.once('exit',code=>reject(new Error('child exit '+code+' '+stderr)));});
 };
 t.after(()=>{if(child?.exitCode===null)child.kill('SIGKILL');});
 let s=await start();const cookie=await session(s),run=await (await call(s,'/api/runs',{cookie,body:{scenarioId:'grant-clean'}})).json();
 for(const [step,values] of [[0,run.task],[1,run.task],[2,{consent:true}]])assert.equal((await call(s,'/forms/api/runs/'+run.id,{cookie,body:{step,values}})).status,200);
 const exit=once(child,'exit');child.kill('SIGKILL');await exit;s=await start();
 assert.equal((await (await call(s,'/api/runs/'+run.id+'/verify',{cookie,body:{claimedCompletion:true}})).json()).verification.completed,true);
});
test('interrupted recovery is quarantined after restart with consumed approval retained',async t=>{
 const {openDurableState}=await import('../src/runtime/durable-state.mjs');const directory=await fixture(t);let store=openDurableState(directory);
 store.state.sessions.set('session',{runs:new Map([['run',{recovering:true,diagnoses:[{id:'approval',used:true}]}]])});store.save();store.close();
 store=openDurableState(directory);t.after(()=>store.close());const run=store.state.sessions.get('session').runs.get('run');
 assert.equal(run.interrupted,true);assert.equal(run.recovering,false);assert.equal(run.diagnoses[0].used,true);
});
