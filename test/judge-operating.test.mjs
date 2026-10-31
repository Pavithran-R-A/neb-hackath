import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request as httpRequest} from 'node:http';
import {createWorkbench} from '../src/workbench/server.mjs';
import {openJudgeBudget} from '../src/runtime/judge-budget.mjs';
import {createJudgeController} from '../src/runtime/judge-policy.mjs';

const canonicalOrigin='https://judge-simulated.example.invalid',code='simulated-judge-access-code-only';
const clock=()=>Date.parse('2026-10-18T12:00:00Z');
const plan={id:'simulated-judge-only',model:'nvidia/test-nemotron',sourceCommit:'a'.repeat(40),suiteSha256:'b'.repeat(64),maxRequests:4,dailyRequests:4,sessionRequests:1,maxOutputTokens:8192,spendLimitUsd:.1,inputUsdPerMillion:.1,outputUsdPerMillion:.3,scenarioIds:['grant-transient','workshop-false-success'],expiresAt:'2026-11-01T00:00:00Z'};
const call=(s,path,{cookie='',body,headers={}}={})=>new Promise((resolve,reject)=>{
 const req=httpRequest(`http://127.0.0.1:${s.address.port}${path}`,{method:body===undefined?'GET':'POST',headers:{host:new URL(canonicalOrigin).host,origin:canonicalOrigin,cookie,'content-type':'application/json',...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
});
async function session(s){const r=await call(s,'/');assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict.*; Secure/);return r.headers.get('set-cookie').split(';')[0];}
async function fixture(t,{failure=null,overrides={}}={}){
 const stateDirectory=await mkdtemp(join(tmpdir(),'judge-simulated-integration-')),directory=join(stateDirectory,'judge-budget'),accountDirectory=join(stateDirectory,'simulated-canonical-account');
 await mkdir(accountDirectory);await writeFile(join(accountDirectory,'account.jsonl'),JSON.stringify({event:'initial',initialAccountUsd:59,judgeReserveUsd:50,initialSpentUsd:0,basis:'SIMULATED TEST HISTORY: no real account or balance claim'})+'\n');
 let server,controller,budget,posts=0,catalogChecks=0;
 const selectedPlan={...plan,...overrides};
 const start=async()=>{
  budget=await openJudgeBudget({directory,accountDirectory,plan:selectedPlan,accessCode:code,now:clock});
  controller=createJudgeController({budget,apiKey:'simulated-provider-credential-only',model:selectedPlan.model,checkPrices:async()=>{catalogChecks++;return {inputUsdPerMillion:.1,outputUsdPerMillion:.3};},fetchImpl:async(_url,init)=>{
   posts++;assert.equal(init.redirect,'error');const request=JSON.parse(init.body),trace=JSON.parse(request.messages.at(-1).content);
   if(failure==='http')return new Response(JSON.stringify({error:'SIMULATED provider outage'}),{status:503});
   const event=trace.events.find(e=>e.text.includes('Temporary submission error'));
   const suggestion={diagnosis:'temporary_failure',explanation:'SIMULATED response: server reports temporary submission error.',evidenceIds:[event?.id??trace.events[0].id],recovery:{action:'retry',reason:'SIMULATED response: retry once only with explicit approval.'},confidence:'high'};
   return new Response(JSON.stringify({model:selectedPlan.model,choices:[{finish_reason:'stop',message:{role:'assistant',content:failure==='schema'?'{}':JSON.stringify(suggestion)}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}));
  }});
  controller.durableBudgetDirectory=directory;
  server=await createWorkbench({publicMode:true,canonicalOrigin,stateDirectory,diagnosticBudgetDirectory:directory,judgeOperating:controller,diagnosticExecutionKind:'simulated-test',now:clock});return server;
 };
 const stop=async()=>{if(server){await server.close();server=null;}controller?.close();controller=null;};
 t.after(async()=>{await stop();await rm(stateDirectory,{recursive:true,force:true});});await start();
 return {get server(){return server;},get budget(){return budget;},get posts(){return posts;},get catalogChecks(){return catalogChecks;},stateDirectory,accountDirectory,start,stop};
}
async function run(s,cookie,scenarioId='grant-transient'){
 const response=await call(s,'/api/runs',{cookie,body:{scenarioId}});assert.equal(response.status,201);const result=await response.json();
 for(const [step,values] of [[0,result.task],[1,result.task],[2,{consent:true}]])assert.equal((await call(s,'/forms/api/runs/'+result.id,{cookie,body:{step,values}})).status,step===2&&scenarioId==='grant-transient'?503:200);
 return result;
}
const diagnose=(s,cookie,id)=>call(s,'/api/runs/'+id+'/diagnose',{cookie,body:{mode:'nemotron'}});
async function unlock(s,cookie){assert.equal((await call(s,'/api/judge-access',{cookie,body:{code}})).status,200);}

test('real retained judge HTTP routes isolate access/session ownership and allow code-free deterministic checks',async t=>{
 const f=await fixture(t),s=f.server,a=await session(s),b=await session(s),r=await run(s,a);
 const meta=await(await call(s,'/api/session',{cookie:a})).json();assert.equal(meta.judgeOperatingMode,true);assert.equal(meta.judgeAccessRequired,true);assert.equal(meta.storageMode,'retained');
 assert.equal((await diagnose(s,a,r.id)).status,403);assert.equal((await call(s,'/api/judge-access',{body:{code}})).status,401);
 assert.equal((await call(s,'/api/judge-access',{cookie:a,body:{code:'incorrect'}})).status,403);
 assert.equal((await call(s,'/api/judge-access',{cookie:a,body:{code},headers:{origin:'https://attacker.invalid'}})).status,403);
 assert.equal((await call(s,'/api/judge-access',{cookie:a,body:{code,extra:'denied'}})).status,400);
 assert.equal((await call(s,'/api/runs/'+r.id+'/diagnose',{cookie:a,body:{mode:'deterministic'}})).status,200);assert.equal(f.posts,0);
 await unlock(s,a);assert.equal((await(await call(s,'/api/session',{cookie:a})).json()).judgeAccessRequired,false);assert.equal((await(await call(s,'/api/session',{cookie:b})).json()).judgeAccessRequired,true);
 assert.equal((await diagnose(s,b,r.id)).status,404);
 for(let i=0;i<5;i++)assert.equal((await call(s,'/api/judge-access',{cookie:b,body:{code:'incorrect'}})).status,403);
 assert.equal((await call(s,'/api/judge-access',{cookie:b,body:{code}})).status,429);assert.equal(f.posts,0);
 const stored=await readFile(join(f.accountDirectory,'account.jsonl'),'utf8');assert.ok(!stored.includes(code));
});

test('simulated provider positive diagnosis needs explicit approval and verifies a signed receipt; run and session quota survive restart',async t=>{
 const f=await fixture(t),a=await session(f.server),r=await run(f.server,a);await unlock(f.server,a);
 const response=await diagnose(f.server,a,r.id);assert.equal(response.status,200);const diagnosis=await response.json();assert.equal(diagnosis.executionKind,'simulated-test');assert.equal(diagnosis.recoveryExecutable,true);assert.equal(f.posts,1);
 const verify=()=>call(f.server,'/api/runs/'+r.id+'/verify',{cookie:a,body:{claimedCompletion:true}});
 assert.equal((await(await verify()).json()).verification.completed,false);
 const recovery={diagnosisId:diagnosis.id,traceDigest:diagnosis.traceDigest};assert.equal((await call(f.server,'/api/runs/'+r.id+'/recover',{cookie:a,body:{...recovery,approve:false}})).status,400);
 assert.equal((await call(f.server,'/api/runs/'+r.id+'/recover',{cookie:a,body:{...recovery,approve:true}})).status,200);assert.equal((await(await verify()).json()).verification.completed,true);
 assert.equal((await diagnose(f.server,a,r.id)).status,429);assert.equal(f.posts,1);assert.equal(f.budget.summary().halted,false);
 await f.stop();await f.start();assert.equal((await(await call(f.server,'/api/session',{cookie:a})).json()).judgeAccessRequired,false);assert.equal((await(await verify()).json()).verification.completed,true);
 const fresh=await run(f.server,a);assert.equal((await diagnose(f.server,a,fresh.id)).status,429);assert.equal(f.posts,1);assert.equal(f.budget.summary().requests,1);
 assert.equal((await call(f.server,'/api/runs/'+r.id+'/recover',{cookie:a,body:{...recovery,approve:true}})).status,409);
 const b=await session(f.server);await unlock(f.server,b);const other=await run(f.server,b);assert.equal((await diagnose(f.server,b,other.id)).status,200);assert.equal(f.posts,2);
});

for(const failure of ['http','schema'])test('simulated '+failure+' model failure halts persistent budget and cannot generate a second provider call',async t=>{
 const f=await fixture(t,{failure}),a=await session(f.server),r=await run(f.server,a);await unlock(f.server,a);
 assert.equal((await diagnose(f.server,a,r.id)).status,502);assert.equal(f.posts,1);assert.equal(f.budget.summary().halted,true);assert.equal(f.budget.summary().requests,1);assert.equal(f.budget.summary().unknownRequests,failure==='http'?1:0);
 assert.equal((await(await call(f.server,'/api/runs/'+r.id+'/verify',{cookie:a,body:{claimedCompletion:true}})).json()).verification.completed,false);
 assert.equal((await diagnose(f.server,a,r.id)).status,429);assert.equal(f.posts,1);
 await f.stop();await f.start();assert.equal(f.budget.summary().halted,true);const b=await session(f.server);await unlock(f.server,b);const fresh=await run(f.server,b);assert.equal((await diagnose(f.server,b,fresh.id)).status,429);assert.equal(f.posts,1);
});

test('global one-call judge envelope survives restart and denies a different authorized session before provider POST',async t=>{
 const f=await fixture(t,{overrides:{maxRequests:1}}),a=await session(f.server),r=await run(f.server,a);await unlock(f.server,a);
 assert.equal((await diagnose(f.server,a,r.id)).status,200);assert.equal(f.posts,1);await f.stop();await f.start();
 const b=await session(f.server);await unlock(f.server,b);const second=await run(f.server,b);assert.equal((await diagnose(f.server,b,second.id)).status,429);assert.equal(f.posts,1);assert.equal(f.budget.summary().requests,1);assert.equal(f.budget.summary().halted,false);
});

test('judge scenario scope cannot be expanded by choosing another catalog challenge',async t=>{
 const f=await fixture(t),cookie=await session(f.server),r=await run(f.server,cookie,'grant-clean');await unlock(f.server,cookie);
 assert.equal((await diagnose(f.server,cookie,r.id)).status,429);assert.equal(f.posts,0);assert.equal(f.budget.summary().requests,0);
});

test('a consumed run cannot POST twice even while the session has another call available',async t=>{
 const f=await fixture(t,{overrides:{sessionRequests:2}}),a=await session(f.server),r=await run(f.server,a);await unlock(f.server,a);
 assert.equal((await diagnose(f.server,a,r.id)).status,200);assert.equal((await diagnose(f.server,a,r.id)).status,429);assert.equal(f.posts,1);
 await f.stop();await f.start();assert.equal((await diagnose(f.server,a,r.id)).status,429);assert.equal(f.posts,1);
 const fresh=await run(f.server,a);assert.equal((await diagnose(f.server,a,fresh.id)).status,200);assert.equal(f.posts,2);assert.equal(f.budget.summary().requests,2);
});

test('judge session separates configured model from live admission after an unresolved provider failure',async t=>{
 const f=await fixture(t,{failure:'http'}),cookie=await session(f.server),r=await run(f.server,cookie);
 const before=await(await call(f.server,'/api/session',{cookie})).json();
 assert.equal(before.liveInferenceEnabled,true);
 assert.equal(before.liveInferenceAvailable,true);
 assert.equal(before.judgeAdmissionState,'available');
 await unlock(f.server,cookie);
 assert.equal((await diagnose(f.server,cookie,r.id)).status,502);
 assert.equal(f.posts,1);
 const after=await(await call(f.server,'/api/session',{cookie})).json();
 assert.equal(after.liveInferenceEnabled,true,'provider adapter remains configured');
 assert.equal(after.liveInferenceAvailable,false,'halt must prohibit misleading model button');
 assert.equal(after.judgeAdmissionState,'halted');
 assert.equal((await call(f.server,'/api/runs/'+r.id+'/diagnose',{cookie,body:{mode:'deterministic'}})).status,200);
 assert.equal(f.posts,1,'status check and local diagnosis must not call Nebius');
});
