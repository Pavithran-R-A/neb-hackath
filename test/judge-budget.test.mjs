import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm,readFile,mkdir,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {openJudgeBudget} from '../src/runtime/judge-budget.mjs';import {JUDGE_ACCESS_END} from '../src/runtime/judge-window.mjs';
import {JUDGE_ACCESS_END as WORKER_JUDGE_ACCESS_END} from '../workers/judge-window.mjs';
const sourceCommit='a'.repeat(40),suiteSha256='b'.repeat(64),code='fictional-judge-access-secret-0001';
async function fixture(t){const d=await mkdtemp(join(tmpdir(),'receiptlab-judge-'));t.after(()=>rm(d,{recursive:true,force:true}));await mkdir(join(d,'account'));await writeFile(join(d,'account','account.jsonl'),JSON.stringify({event:'initial',initialAccountUsd:59,judgeReserveUsd:50,initialSpentUsd:.0848933})+'\n');return d;}
const plan={id:'judge-release',sourceCommit,suiteSha256,model:'nvidia/test-nemotron',maxRequests:4,dailyRequests:3,sessionRequests:2,spendLimitUsd:.02,inputUsdPerMillion:.06,outputUsdPerMillion:.24,maxOutputTokens:8192,expiresAt:JUDGE_ACCESS_END,scenarioIds:['grant-transient','workshop-false-success']};
test('judge reservations, access and request quotas survive restart; unknown calls never replay',async t=>{
 const d=await fixture(t);let time=Date.parse('2026-10-18T00:00:00Z');let b=await openJudgeBudget({directory:join(d,'judge'),accountDirectory:join(d,'account'),plan,accessCode:code,now:()=>time});
 assert.equal(b.authorized('s1'),false);assert.equal(b.authorize('s1','wrong'),false);assert.equal(b.authorize('s1',code),true);
 const first=b.reserve({sessionId:'s1',runId:'r1',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192});assert.throws(()=>b.reserve({sessionId:'s1',runId:'r1',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/already|consumed/);
 b.settle(first,{inputTokens:100,outputTokens:50});b.finalize(first);b.close();b=await openJudgeBudget({directory:join(d,'judge'),accountDirectory:join(d,'account'),plan,accessCode:code,now:()=>time});t.after(()=>b.close());assert.equal(b.authorized('s1'),true);
 assert.equal(b.summary().requests,1);assert.equal(b.summary().unknownRequests,0);assert.throws(()=>b.reserve({sessionId:'s1',runId:'r1',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/already|consumed/);
 const second=b.reserve({sessionId:'s1',runId:'r2',scenarioId:'workshop-false-success',inputAllowance:1000,outputLimit:8192});b.settle(second,{inputTokens:100,outputTokens:50});b.finalize(second);assert.throws(()=>b.settle(second,{inputTokens:100,outputTokens:50}),/settled/);
 assert.throws(()=>b.reserve({sessionId:'s1',runId:'r3',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/quota/);
 assert.equal(b.summary().requests,2);assert.ok(b.summary().committedUsd>0);assert.equal(b.summary().knownCostUsd,.000036);
 assert.ok((await readFile(join(d,'account','account.jsonl'),'utf8')).includes('judge-release'));
});
test('judge campaign expiry permits the official December 23 end and rejects later plans and calls',async t=>{
 assert.equal(WORKER_JUDGE_ACCESS_END,JUDGE_ACCESS_END);
 const d=await fixture(t),opts={directory:join(d,'judge'),accountDirectory:join(d,'account'),plan,accessCode:code,now:()=>Date.parse('2026-10-18T00:00:00Z')},b=await openJudgeBudget(opts);t.after(()=>b.close());
 b.authorize('judge',code);
 await assert.rejects(()=>openJudgeBudget({...opts,plan:{...plan,expiresAt:'2026-12-23T20:00:00.001Z'}}),/Invalid bounded judge configuration/);
 const end=Date.parse(JUDGE_ACCESS_END);let time=end-1,endDir=await fixture(t);
 const atEnd=await openJudgeBudget({directory:join(endDir,'judge'),accountDirectory:join(endDir,'account'),plan:{...plan,expiresAt:new Date(end).toISOString()},accessCode:code,now:()=>time});t.after(()=>atEnd.close());atEnd.authorize('judge',code);time=end;
 assert.throws(()=>atEnd.reserve({sessionId:'judge',runId:'at-end',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/expired/);
});
test('judge access throttles failures and denies foreign scope, expiry and concurrent instance',async t=>{
 const d=await fixture(t),opts={directory:join(d,'judge'),accountDirectory:join(d,'account'),plan,accessCode:code,now:()=>Date.parse('2026-10-18')},b=await openJudgeBudget(opts);t.after(()=>b.close());
 await assert.rejects(openJudgeBudget(opts),/active|locked/);for(let i=0;i<5;i++)assert.equal(b.authorize('bad','wrong'),false);assert.throws(()=>b.authorize('bad',code),/attempt/);
 assert.throws(()=>b.reserve({sessionId:'unapproved',runId:'r',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/access/);b.authorize('ok',code);
 assert.throws(()=>b.reserve({sessionId:'ok',runId:'r',scenarioId:'other',inputAllowance:1000,outputLimit:8192}),/scope/);
 assert.throws(()=>b.reserve({sessionId:'ok',runId:'r',scenarioId:'grant-transient',inputAllowance:20001,outputLimit:8192}),/allowance/);
});

test('global judge access attempts are capped per day and recover on the next day',async t=>{
 const d=await fixture(t);let time=Date.parse('2026-10-18T23:59:00Z');const opts={directory:join(d,'judge'),accountDirectory:join(d,'account'),plan,accessCode:code,now:()=>time},b=await openJudgeBudget(opts);t.after(()=>b.close());
 for(let i=0;i<200;i++)assert.equal(b.authorize(`daily-${i}`,'wrong'),false);
 assert.throws(()=>b.authorize('daily-overflow','wrong'),/daily.*capacity/i);
 time+=24*60*60*1000;assert.equal(b.authorize('new-day','wrong'),false);
});

test('crash reservation remains fully charged and halts admission on restart',async t=>{const d=await fixture(t),opts={directory:join(d,'judge'),accountDirectory:join(d,'account'),plan,accessCode:code,now:()=>Date.parse('2026-10-18')};let b=await openJudgeBudget(opts);b.authorize('s',code);b.reserve({sessionId:'s',runId:'r',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192});const held=b.summary().committedUsd;b.close();b=await openJudgeBudget(opts);t.after(()=>b.close());assert.equal(b.summary().committedUsd,held);assert.equal(b.summary().unknownRequests,1);assert.equal(b.summary().halted,true);assert.throws(()=>b.reserve({sessionId:'s',runId:'other',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/halted/);});

test('known usage remains pending until strict provider validation and halts admission after restart',async t=>{
 const d=await fixture(t),opts={directory:join(d,'judge'),accountDirectory:join(d,'account'),plan,accessCode:code,now:()=>Date.parse('2026-10-18')};let b=await openJudgeBudget(opts);b.authorize('s',code);
 const id=b.reserve({sessionId:'s',runId:'r',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192});b.settle(id,{inputTokens:100,outputTokens:50});b.close();b=await openJudgeBudget(opts);t.after(()=>b.close());
 assert.equal(b.summary().knownCostUsd,.000018);assert.equal(b.summary().unknownRequests,0);assert.equal(b.summary().halted,true);assert.throws(()=>b.reserve({sessionId:'s',runId:'next',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/halted/);
});

test('SQLite write failure poisons admission even when the state directory is restored',async t=>{
 const {rename}=await import('node:fs/promises');const d=await fixture(t),directory=join(d,'judge'),b=await openJudgeBudget({directory,accountDirectory:join(d,'account'),plan,accessCode:code,now:()=>Date.parse('2026-10-18')});t.after(()=>b.close());b.authorize('s',code);
 const id=b.reserve({sessionId:'s',runId:'r',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192});await rename(directory,join(d,'detached'));assert.throws(()=>b.settle(id,{inputTokens:100,outputTokens:50}));assert.throws(()=>b.halt());await rename(join(d,'detached'),directory);
 assert.throws(()=>b.summary(),/unavailable|poison/i);assert.throws(()=>b.reserve({sessionId:'s',runId:'next',scenarioId:'grant-transient',inputAllowance:1000,outputLimit:8192}),/unavailable|poison/i);
});

for(const invalid of [false,true])test('judge controller finalizes only strictly validated provider output ('+(invalid?'rejected schema':'valid schema')+')',async t=>{
 const {createJudgeController}=await import('../src/runtime/judge-policy.mjs');const d=await fixture(t),opts={directory:join(d,'judge'),accountDirectory:join(d,'account'),plan,accessCode:code,now:()=>Date.parse('2026-10-18')};let b=await openJudgeBudget(opts);t.after(()=>b.close());b.authorize('s',code);let posts=0;
 const trace={id:'r',task:{goal:'Complete fictional application'},events:[{id:'s',source:'server',kind:'error',text:'Temporary submission error. Please retry once.'}],verification:{completed:false,reason:'No commit'}};
 const suggestion={diagnosis:'temporary_failure',explanation:'The server reports a transient error.',evidenceIds:['s'],recovery:{action:'retry',reason:'Retry once with supplied data.'},confidence:'high'};
 const controller=createJudgeController({budget:b,apiKey:'synthetic-only',model:plan.model,checkPrices:async()=>({inputUsdPerMillion:plan.inputUsdPerMillion,outputUsdPerMillion:plan.outputUsdPerMillion}),fetchImpl:async()=>{posts++;return new Response(JSON.stringify({model:plan.model,choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(invalid?{}:suggestion)}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}));}});
 const work=()=>controller.policyFor({sessionId:'s',runId:'r',scenarioId:'grant-transient'}).diagnose(trace);if(invalid)await assert.rejects(work(),/schema/);else assert.deepEqual((await work()).suggestion,suggestion);
 assert.equal(posts,1);assert.equal(b.summary().knownCostUsd,.000018);assert.equal(b.summary().unknownRequests,0);assert.equal(b.summary().pendingRequests,invalid?1:0);assert.equal(b.summary().halted,invalid);
 b.close();b=await openJudgeBudget(opts);assert.equal(b.summary().halted,invalid);assert.equal(b.summary().pendingRequests,invalid?1:0);
});
