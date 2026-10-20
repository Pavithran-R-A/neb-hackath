import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkbench} from '../src/workbench/server.mjs';
const openSession=async server=>{const r=await fetch(server.origin);return r.headers.get('set-cookie').split(';')[0];};
const request=(server,cookie,path,body)=>fetch(server.origin+path,{method:body===undefined?'GET':'POST',headers:{cookie,origin:server.origin,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
test('workbench provides a functional synthetic task, run-bound verdict and downloadable safe evidence',async t=>{
 const server=await createWorkbench();t.after(()=>server.close());const cookie=await openSession(server);
 const session=await (await request(server,cookie,'/api/session')).json();assert.equal(session.liveInferenceEnabled,false);assert.ok(session.scenarios.length>=3);
 const r=await request(server,cookie,'/api/runs',{scenarioId:'grant-clean'});assert.equal(r.status,201);const run=await r.json();assert.equal(run.task.email,'avery@example.invalid');
 const verdict=await (await request(server,cookie,`/api/runs/${run.id}/verify`,{claimedCompletion:true})).json();
 assert.equal(verdict.reportedCompletion,false);assert.equal(verdict.rejectedCompletionClaim,true);assert.equal(verdict.verification.reason,'No unique committed server submission');
 const exported=await request(server,cookie,`/api/runs/${run.id}/evidence`);assert.match(exported.headers.get('content-disposition'),/attachment/);
 const report=await exported.text();assert.ok(!report.includes('signature'));assert.ok(!report.includes('apiKey'));assert.ok(!report.includes('avery@'));
});
test('parallel sessions and an unauthenticated browser cannot read each other’s evaluator state',async t=>{
 const s=await createWorkbench();t.after(()=>s.close());const [a,b]=await Promise.all([openSession(s),openSession(s)]);
 const run=await (await request(s,a,'/api/runs',{scenarioId:'grant-clean'})).json();
 assert.equal((await request(s,b,`/api/runs/${run.id}/verify`,{claimedCompletion:true})).status,404);
 assert.equal((await fetch(s.origin+'/api/session')).status,401);
 assert.equal((await fetch(s.origin+'/api/runs',{method:'POST',headers:{cookie:a,origin:'https://external.invalid'},body:'{}'})).status,403);
 const {get}=await import('node:http');
 const status=await new Promise((resolve,reject)=>get(s.origin+'/',{headers:{host:'external.invalid'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject));assert.equal(status,403);
});
test('workbench enforces TTL, run admission, body limits and controlled failures',async t=>{
 let now=Date.now();const s=await createWorkbench({now:()=>now,sessionTtlMs:1000,maxRunsPerSession:1});t.after(()=>s.close());const cookie=await openSession(s);
 assert.equal((await request(s,cookie,'/api/runs',{scenarioId:'unknown'})).status,400);
 assert.equal((await request(s,cookie,'/api/runs',{scenarioId:'grant-clean'})).status,201);
 assert.equal((await request(s,cookie,'/api/runs',{scenarioId:'grant-clean'})).status,429);
 const tooBig=await fetch(s.origin+'/api/runs',{method:'POST',headers:{cookie,origin:s.origin},body:'x'.repeat(5000)});assert.equal(tooBig.status,413);
 now+=1001;assert.equal((await request(s,cookie,'/api/session')).status,401);
});
test('session admission and request rates cap local resource growth',async t=>{
 const s=await createWorkbench({maxSessions:1});t.after(()=>s.close());const cookie=await openSession(s);
 assert.equal((await fetch(s.origin)).status,503);
 for(let i=0;i<120;i++)assert.equal((await request(s,cookie,'/api/session')).status,200);
 assert.equal((await request(s,cookie,'/api/session')).status,429);
});
test('restart invalidates old sessions and private evidence rather than manufacturing persistence',async t=>{
 const first=await createWorkbench();const cookie=await openSession(first);
 const run=await (await request(first,cookie,'/api/runs',{scenarioId:'grant-clean'})).json();await first.close();
 const second=await createWorkbench();t.after(()=>second.close());
 assert.equal((await request(second,cookie,'/api/runs/'+run.id+'/evidence')).status,401);
});
