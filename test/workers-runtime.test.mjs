import {createRuntime,createProviderMock} from '../scripts/workers-runtime.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const schema=await readFile(new URL('../workers/schema.sql',import.meta.url),'utf8');
async function fixture(t,options={}){
 const mf=createRuntime({modules:true,scriptPath:'workers/index.mjs',modulesRules:[{type:'ESModule',include:['**/*.mjs']}],compatibilityDate:'2026-08-06',d1Databases:['DB'],bindings:{RECEIPT_KEY:'synthetic-test-signing-key-at-least-32-characters',MODEL:'nvidia/nemotron-test',INFERENCE_ENABLED:'false',...options.bindings},...(options.fetchMock?{fetchMock:options.fetchMock}:{}),...(options.d1Persist?{d1Persist:options.d1Persist}:{})});
 if(options.cleanup!==false)t.after(()=>mf.dispose());const db=await mf.getD1Database('DB');await db.exec(schema);
 async function api(path,body,cookie,extra={}){const r=await mf.dispatchFetch('http://localhost'+path,{method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(body?{'content-type':'application/json','origin':'http://localhost'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}return {mf,db,api};
}
test('real D1 Worker session isolation, transient form, approved recovery and signed receipt',async t=>{
 const {api}=await fixture(t),a=await api('/api/session',{}),b=await api('/api/session',{});
 const r=await api('/api/runs',{scenarioId:'grant-transient'},a.cookie);assert.equal(r.status,201);const id=r.body.id;
 assert.equal((await api('/api/runs/'+id,undefined,b.cookie)).status,404);
 for(let step=0;step<3;step++){const p=await api('/api/runs/'+id+'/step',{step,values:r.body.task},a.cookie);assert.equal(p.status,step===2?503:200);}
 assert.equal((await api('/api/runs/'+id+'/verify',undefined,a.cookie)).body.completed,false);
 const d=await api('/api/runs/'+id+'/diagnose',{mode:'deterministic'},a.cookie);assert.equal(d.body.recoveryExecutable,true);
 const approval=await api('/api/runs/'+id+'/approve',{diagnosisId:d.body.id,traceDigest:d.body.traceDigest,approved:true},a.cookie);assert.equal(approval.status,201);
 const body={diagnosisId:d.body.id,approvalId:approval.body.id,traceDigest:d.body.traceDigest};
 const recovery=await Promise.all([api('/api/runs/'+id+'/recover',body,a.cookie),api('/api/runs/'+id+'/recover',body,a.cookie)]);assert.deepEqual(recovery.map(r=>r.status).sort(),[200,409]);
 assert.equal((await api('/api/runs/'+id+'/verify',undefined,a.cookie)).body.completed,true);
});
test('HTTPS Worker request URL sets a Secure session cookie with same-origin policy',async t=>{
 const {mf}=await fixture(t);const response=await mf.dispatchFetch('https://localhost/api/session',{method:'POST',headers:{origin:'https://localhost','content-type':'application/json'},body:'{}'});assert.equal(response.status,201);assert.match(response.headers.get('set-cookie'),/^receiptlab=[\w-]+; HttpOnly; SameSite=Strict; Path=\/; Max-Age=1800; Secure$/);
});
test('misleading success and invalid supplied email never become verified or executable',async t=>{
 const {api}=await fixture(t),s=await api('/api/session',{});
 for(const scenarioId of ['workshop-false-success','grant-invalid-email']){const r=await api('/api/runs',{scenarioId},s.cookie);for(let step=0;step<3;step++)await api('/api/runs/'+r.body.id+'/step',{step,values:r.body.task},s.cookie);assert.equal((await api('/api/runs/'+r.body.id+'/verify',undefined,s.cookie)).body.completed,false);const d=await api('/api/runs/'+r.body.id+'/diagnose',{mode:'deterministic'},s.cookie);assert.equal(d.body.recoveryExecutable,false);assert.equal((await api('/api/runs/'+r.body.id+'/approve',{diagnosisId:d.body.id,traceDigest:d.body.traceDigest,approved:true},s.cookie)).status,409);}
});
test('real D1 account reservation is atomic, history is immutable, crash cannot retry',async t=>{
 const {db}=await fixture(t);const {reserve,settle}=await import('../workers/store.mjs');
 await assert.rejects(reserve(db,{id:'missing',campaignId:'c',sourceDigest:'source',reservationNano:20000000}));
 await db.prepare("INSERT INTO accounts VALUES('nebius','digest','{}',9000000000,84893300,NULL)").run();
 await db.prepare("INSERT INTO campaigns VALUES('c',1,'source',3,60000000,'nvidia/nemotron-test','catalog',60,240,1024,?)").bind(Date.now()+3600000).run();
 const admissions=await Promise.allSettled(['one','two'].map(id=>reserve(db,{id,campaignId:'c',sourceDigest:'source',reservationNano:20000000})));assert.equal(admissions.filter(r=>r.status==='fulfilled').length,1);const winner=admissions.find(r=>r.status==='fulfilled').value;
 await assert.rejects(reserve(db,{id:'after-crash',campaignId:'c',sourceDigest:'source',reservationNano:20000000}));
 assert.equal((await db.prepare("SELECT committed_nano FROM accounts").first()).committed_nano,104893300);
 await assert.rejects(db.prepare("UPDATE accounts SET imported_digest='tampered'").run());
 await assert.rejects(db.prepare('DELETE FROM ledger').run());
 await settle(db,winner,100000);await assert.rejects(reserve(db,{id:winner.id,campaignId:'c',sourceDigest:'source',reservationNano:20000000}));
 assert.equal((await db.prepare('SELECT committed_nano FROM accounts').first()).committed_nano,84993300);
 const later=await reserve(db,{id:'later',campaignId:'c',sourceDigest:'source',reservationNano:20000000});await settle(db,later,200000);
});
test('receipt tampering, state mismatch, expired session and cross-origin writes are denied',async t=>{
 const {api,db,mf}=await fixture(t),s=await api('/api/session',{}),r=await api('/api/runs',{scenarioId:'grant-clean'},s.cookie);for(let step=0;step<3;step++)assert.equal((await api('/api/runs/'+r.body.id+'/step',{step,values:r.body.task},s.cookie)).status,200);
 const row=await db.prepare('SELECT state FROM runs WHERE id=?').bind(r.body.id).first(),state=JSON.parse(row.state);state.receipt.signature='00'.repeat(32);await db.prepare('UPDATE runs SET state=? WHERE id=?').bind(JSON.stringify(state),r.body.id).run();assert.equal((await api('/api/runs/'+r.body.id+'/verify',undefined,s.cookie)).body.completed,false);
 state.id='wrong-run';await db.prepare('UPDATE runs SET state=? WHERE id=?').bind(JSON.stringify(state),r.body.id).run();assert.equal((await api('/api/runs/'+r.body.id+'/verify',undefined,s.cookie)).status,409);
 const denied=await mf.dispatchFetch('http://localhost/api/runs',{method:'POST',headers:{cookie:s.cookie,origin:'https://evil.invalid'},body:'{}'});assert.equal(denied.status,403);
 await db.prepare('UPDATE sessions SET expires=0').run();assert.equal((await api('/api/runs/'+r.body.id,undefined,s.cookie)).status,401);
});
test('mocked NVIDIA over real Worker fetch/D1 reserves first, validates provider, settles exactly once',async t=>{
 const mock=createProviderMock();mock.disableNetConnect();
 const {api,db}=await fixture(t,{fetchMock:mock,bindings:{INFERENCE_ENABLED:'true',ACCESS_CODE:'synthetic-protected-access',NEBIUS_API_KEY:'synthetic-provider-secret',SOURCE_DIGEST:'source',CATALOG_DIGEST:'catalog'}});
 await db.prepare("INSERT INTO accounts VALUES('nebius','digest','{}',9000000000,84893300,NULL)").run();await db.prepare("INSERT INTO campaigns VALUES('c',1,'source',3,60000000,'nvidia/nemotron-test','catalog',60,240,1024,?)").bind(Date.now()+3600000).run();
 const session=await api('/api/session',{}),r=await api('/api/runs',{scenarioId:'grant-transient'},session.cookie);for(let step=0;step<3;step++)await api('/api/runs/'+r.body.id+'/step',{step,values:r.body.task},session.cookie);
 const suggestion={diagnosis:'temporary_failure',explanation:'Server reports temporary submission error.',evidenceIds:['e3'],recovery:{action:'retry',reason:'Server permits a single retry with zero commits.'},confidence:'high'};
 mock.get('https://api.tokenfactory.nebius.com').intercept({path:'/v1/chat/completions',method:'POST'}).reply(200,{model:'nvidia/nemotron-test',usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150},choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(suggestion)}}]});
 const path='/api/runs/'+r.body.id+'/diagnose';assert.equal((await api(path,{mode:'nemotron',campaignId:'c',requestId:'post-1'},session.cookie)).status,403);
 const success=await api(path,{mode:'nemotron',campaignId:'c',requestId:'post-1'},session.cookie,{'x-access-code':'synthetic-protected-access'});assert.equal(success.status,200);assert.equal(success.body.modelValidated,true);assert.equal(success.body.recoveryExecutable,true);assert.equal(JSON.stringify(success.body).includes('synthetic-provider-secret'),false);
 assert.equal((await db.prepare('SELECT committed_nano FROM accounts').first()).committed_nano,84911300);
 assert.equal((await api(path,{mode:'nemotron',campaignId:'c',requestId:'post-1'},session.cookie,{'x-access-code':'synthetic-protected-access'})).status,409);
 mock.get('https://api.tokenfactory.nebius.com').intercept({path:'/v1/chat/completions',method:'POST'}).reply(500,'synthetic failure');
 assert.equal((await api(path,{mode:'nemotron',campaignId:'c',requestId:'post-2'},session.cookie,{'x-access-code':'synthetic-protected-access'})).status,409);
 assert.equal((await db.prepare('SELECT active FROM accounts').first()).active,'post-2');
 assert.equal((await api(path,{mode:'nemotron',campaignId:'c',requestId:'post-3'},session.cookie,{'x-access-code':'synthetic-protected-access'})).status,409);
 mock.assertNoPendingInterceptors();
});
test('canonical account history import preserves known costs and full unknown reservation',async t=>{
 const {accountImport}=await import('../scripts/workers-import-account.mjs');
 const raw=await readFile(new URL('../workers/account-history.jsonl',import.meta.url),'utf8');const plan=accountImport(raw);
 assert.equal(plan.committedNano,90000440);assert.deepEqual(plan.unresolved,[]);assert.equal(plan.reservations,12);
 const {db}=await fixture(t);await db.exec(plan.sql);assert.equal((await db.prepare('SELECT committed_nano FROM accounts').first()).committed_nano,90000440);await assert.rejects(db.exec(plan.sql));
 const header=JSON.stringify({event:'initial',initialAccountUsd:59,judgeReserveUsd:50,initialSpentUsd:0});const unresolved=accountImport(header+'\n'+JSON.stringify({event:'reserved',campaignId:'interrupted',maxReservedUsd:.02}));assert.equal(unresolved.committedNano,20000000);assert.deepEqual(unresolved.unresolved,['interrupted']);
 assert.throws(()=>accountImport(header+'\n'+JSON.stringify({event:'settled',campaignId:'missing',usageComplete:true,knownCostUsd:0})));
});
test('D1 admission enforces lifetime, daily, session and half-dollar envelope before reservation',async t=>{
 const {db}=await fixture(t);const {reserve,settle}=await import('../workers/store.mjs');await db.prepare("INSERT INTO accounts VALUES('nebius','digest','{}',9000000000,84893300,NULL)").run();await db.prepare("INSERT INTO campaigns VALUES('quota',1,'source',100,500000000,'nvidia/nemotron-test','catalog',60,240,1024,?)").bind(Date.now()+3600000).run();
 const request=(id,sessionId='s')=>reserve(db,{id,campaignId:'quota',sourceDigest:'source',reservationNano:20000000,sessionId});
 for(const id of ['one','two']){const r=await request(id);await settle(db,r,1000);}await assert.rejects(request('session-three'));
 const day='inference:day:'+Math.floor(Date.now()/86400000);await db.prepare('UPDATE quotas SET count=20 WHERE id=?').bind(day).run();await assert.rejects(request('daily','fresh'));await db.prepare('UPDATE quotas SET count=0 WHERE id=?').bind(day).run();
 await db.prepare("UPDATE quotas SET count=100 WHERE id='inference:total'").run();await assert.rejects(request('total','fresh'));await db.prepare("UPDATE quotas SET count=0 WHERE id='inference:total'").run();
 await db.prepare("INSERT INTO ledger VALUES('envelope','quota','envelope','reserved',480000001,0)").run();await assert.rejects(request('envelope-exceeded','fresh'));
 assert.equal((await db.prepare('SELECT active FROM accounts').first()).active,null);assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM ledger WHERE kind='reserved'").first()).n,3);
});
test('D1 campaign and global account history checks use covering ledger indexes',async t=>{
 const {db}=await fixture(t);
 const campaign=await db.prepare("EXPLAIN QUERY PLAN SELECT COUNT(*) FROM ledger WHERE campaign_id=? AND kind='reserved'").bind('campaign').all();
 const global=await db.prepare("EXPLAIN QUERY PLAN SELECT COALESCE(SUM(nano),0) FROM ledger WHERE kind='reserved' AND id NOT LIKE 'historical:%'").all();
 const campaignPlan=campaign.results.map(row=>row.detail).join(' '),globalPlan=global.results.map(row=>row.detail).join(' ');
 assert.match(campaignPlan,/ledger_campaign_kind_nano/);
 assert.match(globalPlan,/ledger_kind_id_nano/);
});
test('public session quota and session write quota reject excess without creating state',async t=>{
 const {api,db}=await fixture(t);const s=await api('/api/session',{}),sessionId=s.cookie.split('=')[1],day=Math.floor(Date.now()/86400000);
 await db.prepare('INSERT INTO quotas VALUES(?,200)').bind(sessionId+':'+day).run();assert.equal((await api('/api/runs',{scenarioId:'grant-clean'},s.cookie)).status,429);
 await db.prepare('UPDATE quotas SET count=100 WHERE id=?').bind('sessions:'+day).run();assert.equal((await api('/api/session',{})).status,429);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM runs').first()).n,0);
});
test('Worker ports preserve diagnosis source parity and Node HMAC receipt compatibility',async()=>{
 const {createHash}=await import('node:crypto'),manifest=JSON.parse(await readFile(new URL('../workers/ports.json',import.meta.url),'utf8'));for(const [path,hash]of Object.entries(manifest.sources))assert.equal(createHash('sha256').update(await readFile(new URL('../'+path,import.meta.url))).digest('hex'),hash);
 for(const name of ['acceptance','baseline','telemetry-baseline'])assert.equal(await readFile(new URL('../workers/'+name+'.mjs',import.meta.url),'utf8'),await readFile(new URL('../src/diagnosis/'+name+'.mjs',import.meta.url),'utf8'));
 const {diagnosticSystem:nodeSystem}=await import('../src/diagnosis/nebius.mjs'),{diagnosticSystem:workerSystem}=await import('../workers/provider-contract.mjs');assert.equal(workerSystem,nodeSystem);
 const workerContract=await readFile(new URL('../workers/contract.mjs',import.meta.url),'utf8'),nodeContract=await readFile(new URL('../src/diagnosis/contract.mjs',import.meta.url),'utf8');assert.equal(workerContract.split('\n').slice(1).join('\n'),nodeContract.replace('Buffer.byteLength(JSON.stringify(t))','new TextEncoder().encode(JSON.stringify(t)).byteLength'));
 const worker=await import('../workers/crypto.mjs'),node=await import('../src/verification.mjs'),{scenarios}=await import('../src/scenarios.mjs'),key='synthetic-interop-signing-key-at-least-32';
 for(const {task}of scenarios){const receipt=await worker.receipt('interop-run',task,key);assert.equal(receipt.digest,node.digest(task));assert.equal(receipt.signature,node.signReceipt(receipt,key));const record={id:'interop-run',task,status:'completed',completionCount:1,payload:task,receipt};assert.equal(node.verifyCompletion(record,task,key,{runId:'interop-run'}).completed,true);assert.equal((await worker.verify(record,key)).completed,true);record.task={...task,detail:'Wrong task'};assert.equal((await worker.verify(record,key)).completed,false);}
});
test('D1 persistence retains signed receipt, consumed approval and interrupted reservation across runtime restart',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');const directory=await mkdtemp(join(tmpdir(),'receiptlab-workers-'));
 const first=await fixture(t,{d1Persist:directory,cleanup:false}),s=await first.api('/api/session',{}),r=await first.api('/api/runs',{scenarioId:'grant-transient'},s.cookie);for(let step=0;step<3;step++)await first.api('/api/runs/'+r.body.id+'/step',{step,values:r.body.task},s.cookie);const path='/api/runs/'+r.body.id,d=await first.api(path+'/diagnose',{mode:'deterministic'},s.cookie),a=await first.api(path+'/approve',{diagnosisId:d.body.id,traceDigest:d.body.traceDigest,approved:true},s.cookie),body={diagnosisId:d.body.id,traceDigest:d.body.traceDigest,approvalId:a.body.id};assert.equal((await first.api(path+'/recover',body,s.cookie)).status,200);
 await first.db.prepare("INSERT INTO accounts VALUES('nebius','digest','{}',9000000000,84893300,NULL)").run();await first.db.prepare("INSERT INTO campaigns VALUES('crash',1,'source',3,60000000,'nvidia/nemotron-test','catalog',60,240,1024,?)").bind(Date.now()+3600000).run();const {reserve}=await import('../workers/store.mjs');await reserve(first.db,{id:'interrupted',campaignId:'crash',sourceDigest:'source',reservationNano:20000000});await first.mf.dispose();
 const second=await fixture(t,{d1Persist:directory});assert.equal((await second.api(path+'/verify',undefined,s.cookie)).body.completed,true);assert.equal((await second.api(path+'/recover',body,s.cookie)).status,409);assert.equal((await second.db.prepare('SELECT active FROM accounts').first()).active,'interrupted');await assert.rejects(reserve(second.db,{id:'retry',campaignId:'crash',sourceDigest:'source',reservationNano:20000000}));t.after(()=>rm(directory,{recursive:true,force:true}));
});
test('unsupported scenarios and expired or mismatched campaigns fail before provider admission',async t=>{
 const {api,db}=await fixture(t,{bindings:{INFERENCE_ENABLED:'true',ACCESS_CODE:'synthetic-code',NEBIUS_API_KEY:'synthetic-key',SOURCE_DIGEST:'source',CATALOG_DIGEST:'catalog'}}),s=await api('/api/session',{});
 for(const scenarioId of ['grant-renamed','workshop-unlabeled','workshop-injection'])assert.equal((await api('/api/runs',{scenarioId},s.cookie)).status,400);
 const r=await api('/api/runs',{scenarioId:'grant-clean'},s.cookie);await db.prepare("INSERT INTO accounts VALUES('nebius','digest','{}',9000000000,84893300,NULL)").run();await db.prepare("INSERT INTO campaigns VALUES('expired',1,'source',3,60000000,'nvidia/nemotron-test','catalog',60,240,1024,0)").run();
 assert.equal((await api('/api/runs/'+r.body.id+'/diagnose',{mode:'nemotron',campaignId:'expired',requestId:'never-send'},s.cookie,{'x-access-code':'synthetic-code'})).status,403);
 await db.prepare("UPDATE campaigns SET expires=?,catalog_digest='wrong'").bind(Date.now()+3600000).run();assert.equal((await api('/api/runs/'+r.body.id+'/diagnose',{mode:'nemotron',campaignId:'expired',requestId:'never-send2'},s.cookie,{'x-access-code':'synthetic-code'})).status,403);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM ledger').first()).n,0);assert.equal((await db.prepare('SELECT active FROM accounts').first()).active,null);
});
