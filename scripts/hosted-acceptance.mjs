import assert from 'node:assert/strict';

// External, synthetic-only acceptance. This makes ZERO NVIDIA/Nebius requests.
// Do not log cookies, task values, signed material or environment credentials.
const origin='https://receiptlab-judge.onrender.com';
const timeout=ms=>AbortSignal.timeout(ms);
async function request(path,{cookie,body,expected=[200],originHeader=origin}={}){
  const headers={};
  if(cookie)headers.cookie=cookie;
  if(body!==undefined){headers.origin=originHeader;headers['content-type']='application/json';}
  const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers,redirect:'error',signal:timeout(90000),body:body===undefined?undefined:JSON.stringify(body)});
  assert.ok(expected.includes(response.status),path+' returned '+response.status+', expected '+expected.join('/'));
  const raw=await response.text();
  let data;
  try{data=JSON.parse(raw);}catch{data=null;}
  return {status:response.status,data,raw,response};
}
async function session(){
  const result=await request('/');
  const header=result.response.headers.get('set-cookie')??'';
  assert.match(header,/^receiptlab=[a-f0-9]{64};/);
  assert.match(header,/;\s*Secure/i);
  return header.split(';')[0];
}
async function start(cookie,scenarioId){
  const r=await request('/api/runs',{cookie,body:{scenarioId},expected:[201]});
  assert.equal(r.data?.task?.email,'avery@example.invalid');
  assert.equal(new URL(r.data.url).origin,origin);
  return r.data;
}
async function submit(cookie,run,thirdStatus){
  const path='/forms/api/runs/'+run.id;
  for(const [step,values,expected] of [
    [0,run.task,[200]],
    [1,run.task,[200]],
    [2,{consent:true},[thirdStatus]],
  ]){
    await request(path,{cookie,body:{step,values},expected});
  }
}
async function verify(cookie,run,completed){
  const r=await request('/api/runs/'+run.id+'/verify',{cookie,body:{claimedCompletion:true}});
  assert.equal(r.data?.verification?.completed,completed);
  return r.data;
}
const health=await request('/health');
assert.equal(health.data?.ok,true);
assert.equal(health.data?.storageMode,'postgresql');
assert.equal(health.data?.liveInferenceEnabled,false);
const cookie=await session();
const meta=await request('/api/session',{cookie});
assert.equal(meta.data?.storageMode,'retained');
assert.equal(meta.data?.liveInferenceEnabled,false);

const positive=await start(cookie,'grant-transient');
await submit(cookie,positive,503);
await verify(cookie,positive,false);
const advice=await request('/api/runs/'+positive.id+'/diagnose',{cookie,body:{mode:'deterministic'}});
assert.equal(advice.data?.recoveryExecutable,true);
assert.equal(advice.data?.suggestion?.recovery?.action,'retry');
const approval={approve:true,diagnosisId:advice.data.id,traceDigest:advice.data.traceDigest};
const recovered=await request('/api/runs/'+positive.id+'/recover',{cookie,body:approval});
assert.equal(recovered.data?.verification?.completed,true);
await verify(cookie,positive,true);
await request('/api/runs/'+positive.id+'/recover',{cookie,body:approval,expected:[409]});
const exported=await request('/api/runs/'+positive.id+'/evidence',{cookie});
assert.equal(exported.data?.verification?.completed,true);
assert.ok(!exported.raw.includes(positive.task.email),'Evidence export leaked synthetic contact values');

const negative=await start(cookie,'workshop-false-success');
await submit(cookie,negative,200);
const falseClaim=await verify(cookie,negative,false);
assert.equal(falseClaim?.rejectedCompletionClaim,true);
const rejected=await request('/api/runs/'+negative.id+'/diagnose',{cookie,body:{mode:'deterministic'}});
assert.equal(rejected.data?.recoveryExecutable,false);
await request('/api/runs/'+negative.id+'/recover',{cookie,body:{approve:true,diagnosisId:rejected.data.id,traceDigest:rejected.data.traceDigest},expected:[409]});
await request('/api/runs',{cookie,body:{scenarioId:'grant-clean'},expected:[201],originHeader:'https://evil.example.invalid'}).then(()=>assert.fail('Untrusted Origin unexpectedly accepted'),error=>{
  if(error?.name==='AssertionError' && /returned 403/.test(error.message))return;
  throw error;
});

const outsider=await session();
await request('/forms/api/runs/'+positive.id,{cookie:outsider,expected:[404]});
console.log(JSON.stringify({result:'PASS',host:origin,storage:'postgresql',modelRequests:0,scenarios:['grant-transient','workshop-false-success'],checks:['public health','Secure session cookie','PostgreSQL retained session','transient failure','independent negative before recovery','deterministic advice','approved recovery','verified receipt','approval replay denied','sanitized export','false success rejected','recovery refused','Origin denied','other session isolated']},null,2));
