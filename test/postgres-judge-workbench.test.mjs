import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {openPostgresJudgeBudget} from '../src/runtime/postgres-judge-budget.mjs';
import {createJudgeController} from '../src/runtime/judge-policy.mjs';
import {createWorkbench} from '../src/workbench/server.mjs';

const url=process.env.RECEIPTLAB_TEST_DATABASE_URL;
const skip=!url&&'RECEIPTLAB_TEST_DATABASE_URL not configured';
const code='postgres-workbench-simulated-code';
const origin='https://receiptlab.onrender.com';
const baseHistory=JSON.stringify({event:'initial',initialAccountUsd:59,judgeReserveUsd:50})+'\n';
const plan={id:'pg-journey-fixture',model:'nvidia/test-nemotron',sourceCommit:'c'.repeat(40),suiteSha256:'d'.repeat(64),accountHistoryBaseSha256:createHash('sha256').update(baseHistory).digest('hex'),maxRequests:2,dailyRequests:2,sessionRequests:1,maxOutputTokens:8192,spendLimitUsd:.1,inputUsdPerMillion:.1,outputUsdPerMillion:.3,scenarioIds:['grant-transient','workshop-false-success'],expiresAt:'2026-11-01T00:00:00Z'};
const history=baseHistory+JSON.stringify({event:'reserved',campaignId:plan.id,maxReservedUsd:.1,sourceCommit:plan.sourceCommit,suiteSha256:plan.suiteSha256})+'\n';

function request(server,path,{cookie,body}={}){return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:server.address.port,path,method:body===undefined?'GET':'POST',headers:{host:new URL(origin).host,'x-forwarded-proto':'https',...(cookie?{cookie}:{}),...(body===undefined?{}:{origin,'content-type':'application/json'})}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>{const raw=Buffer.concat(chunks).toString();resolve({status:res.statusCode,headers:res.headers,json:()=>JSON.parse(raw),text:raw});});});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));});}

test('Neon state and budget power a mocked positive and negative end-to-end journey across restart',{skip},async t=>{
 const pool=new pg.Pool({connectionString:url,ssl:false,max:8}),suffix=`${process.pid}-${Math.random().toString(36).slice(2,8)}`,stateNs='pgjourney-state-'+suffix,budgetNs='pgjourney-budget-'+suffix;
 let budget,controller,server,posts=0;
 const open=async()=>{
  budget=await openPostgresJudgeBudget({pool,namespace:budgetNs,plan,accessCode:code,accountHistory:history,now:()=>Date.parse('2026-10-26T12:00:00Z')});
  controller=createJudgeController({budget,apiKey:'SIMULATED-ONLY',model:plan.model,checkPrices:async()=>({inputUsdPerMillion:.1,outputUsdPerMillion:.3}),fetchImpl:async(_url,init)=>{
   posts++;const body=JSON.parse(init.body),trace=JSON.parse(body.messages.at(-1).content);let result;
   if(trace.verification.completed===false&&trace.events.some(event=>event.id==='ui-claim'))result={diagnosis:'completed',explanation:'SIMULATED model accepts the page success banner.',evidenceIds:['ui-claim'],recovery:{action:'none',reason:'SIMULATED model believes the banner proves success.'},confidence:'high'};
   else {const event=trace.events.find(item=>item.text.includes('Temporary submission error'));result={diagnosis:'temporary_failure',explanation:'SIMULATED provider event reports a temporary submission error.',evidenceIds:[event.id],recovery:{action:'retry',reason:'SIMULATED request may be retried once with explicit approval.'},confidence:'high'};}
   return new Response(JSON.stringify({model:plan.model,choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(result)}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}));
  }});
  server=await createWorkbench({publicMode:true,databaseUrl:url,postgresPool:pool,postgresNamespace:stateNs,canonicalOrigin:origin,renderProxy:true,listenHost:'127.0.0.1',port:0,judgeOperating:controller,diagnosticExecutionKind:'simulated-test'});
 };
 const stop=async()=>{if(server){await server.close();server=null;}await controller?.close();controller=null;};
 t.after(async()=>{await stop();await pool.query('DELETE FROM receiptlab_runtime_state WHERE namespace=$1',[stateNs]);await pool.query('DELETE FROM receiptlab_judge_budget WHERE namespace=$1',[budgetNs]);await pool.end();});
 await open();
 const createSession=async()=>{const home=await request(server,'/');assert.equal(home.status,200);assert.match(home.headers['set-cookie'][0],/; Secure/);return home.headers['set-cookie'][0].split(';',1)[0];};
 const run=async(cookie,scenarioId)=>{const created=await request(server,'/api/runs',{cookie,body:{scenarioId}});assert.equal(created.status,201,created.text);const row=created.json();for(const [step,values]of [[0,row.task],[1,row.task],[2,{consent:true}]])await request(server,`/forms/api/runs/${row.id}`,{cookie,body:{step,values}});return row;};
 const unlock=async cookie=>assert.equal((await request(server,'/api/judge-access',{cookie,body:{code}})).status,200);
 const diagnose=async(cookie,id)=>request(server,`/api/runs/${id}/diagnose`,{cookie,body:{mode:'nemotron'}});
 const positiveCookie=await createSession(),positive=await run(positiveCookie,'grant-transient');await unlock(positiveCookie);
 const diagnosis=await diagnose(positiveCookie,positive.id);assert.equal(diagnosis.status,200,diagnosis.text);const advice=diagnosis.json();assert.equal(advice.executionKind,'simulated-test');assert.equal(advice.semanticAssessment.status,'accepted');assert.equal(advice.recoveryExecutable,true);assert.equal(posts,1);
 const approved=await request(server,`/api/runs/${positive.id}/recover`,{cookie:positiveCookie,body:{approve:true,diagnosisId:advice.id,traceDigest:advice.traceDigest}});assert.equal(approved.status,200,approved.text);
 const verified=await request(server,`/api/runs/${positive.id}/verify`,{cookie:positiveCookie,body:{claimedCompletion:true}});assert.equal(verified.json().verification.completed,true);
 const negativeCookie=await createSession(),negative=await run(negativeCookie,'workshop-false-success');await unlock(negativeCookie);
 const misleading=await diagnose(negativeCookie,negative.id);if(misleading.status!==200){const failure=await request(server,`/api/runs/${negative.id}/verify`,{cookie:negativeCookie,body:{claimedCompletion:true}});assert.fail(`${misleading.text}; ${JSON.stringify(failure.json().diagnosisFailures)}`);}const rejected=misleading.json();assert.equal(rejected.rawSuggestion.diagnosis,'completed');assert.equal(rejected.semanticAssessment.status,'abstained');assert.equal(rejected.suggestion.diagnosis,'ambiguous');assert.equal(rejected.recoveryExecutable,false);assert.equal(posts,2);
 const falseCheck=await request(server,`/api/runs/${negative.id}/verify`,{cookie:negativeCookie,body:{claimedCompletion:true}});assert.equal(falseCheck.json().verification.completed,false);
 assert.equal((await budget.summary()).requests,2);await stop();await open();
 const replay=await request(server,`/api/runs/${positive.id}/verify`,{cookie:positiveCookie,body:{claimedCompletion:true}});assert.equal(replay.json().verification.completed,true);assert.equal((await request(server,`/api/runs/${positive.id}/diagnose`,{cookie:positiveCookie,body:{mode:'nemotron'}})).status,429);assert.equal(posts,2);
});
