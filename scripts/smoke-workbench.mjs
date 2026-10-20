import assert from 'node:assert/strict';
// Only the isolated loopback rehearsal. Never a public or external form.
const origin='http://127.0.0.1:'+Number(process.env.PORT??3000);
const health=await fetch(origin+'/health');assert.equal(health.status,200);assert.equal((await health.json()).liveInferenceEnabled,false);
const landing=await fetch(origin);assert.equal(landing.status,200);const cookie=landing.headers.get('set-cookie').split(';')[0];
const call=async(path,body)=>{const res=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{cookie,origin,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.ok(res.ok);return res;};
const run=await (await call('/api/runs',{scenarioId:'grant-clean'})).json();assert.equal(new URL(run.url).hostname,'127.0.0.1');
const formOrigin=new URL(run.url).origin;
for(const step of [0,1,2]){const res=await fetch(formOrigin+'/api/runs/'+run.id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({step,values:run.task})});assert.equal(res.status,200);}
const verdict=await (await call('/api/runs/'+run.id+'/verify',{claimedCompletion:true})).json();assert.equal(verdict.reportedCompletion,true);
const exported=await call('/api/runs/'+run.id+'/evidence');const text=await exported.text();assert.ok(!text.includes(run.task.email));assert.ok(!text.includes('signature'));
await call('/api/reset',{});
console.log(JSON.stringify({status:'passed',sourceCommit:verdict.sourceCommit,checks:['health','isolated session','three real form steps','run-bound signed verdict','sanitized export','reset'],inferenceRequests:0},null,2));
