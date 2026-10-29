import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublicConfiguration} from '../src/runtime/durable-state.mjs';
import {trustedPublicRequest} from '../src/runtime/proxy-trust.mjs';
import pg from 'pg';
import {createWorkbench} from '../src/workbench/server.mjs';
import {createPostgresPool} from '../src/runtime/postgres-state.mjs';

test('Neon TLS is pinned even when a provider URL requests sslmode=require',async()=>{
 const pool=createPostgresPool('postgresql://receiptlab:synthetic@db.example.invalid/receiptlab?sslmode=require&channel_binding=require');
 assert.equal(pool.options.ssl.rejectUnauthorized,true);assert.equal(new URL(pool.options.connectionString).searchParams.has('sslmode'),false);await pool.end();
 assert.throws(()=>createPostgresPool('postgresql://receiptlab:synthetic@db.example.invalid/receiptlab?sslmode=disable'),/encrypted/i);
 assert.throws(()=>createPostgresPool('postgresql://receiptlab:synthetic@db.example.invalid/receiptlab?sslmode=require&sslrootcert=%2Ftmp%2Fca.crt'),/TLS trust/i);
});
import http from 'node:http';

test('public durable mode accepts one HTTPS PostgreSQL backend without relying on an ephemeral filesystem', () => {
  assert.doesNotThrow(()=>validatePublicConfiguration({publicMode:true,canonicalOrigin:'https://receiptlab.onrender.com',databaseUrl:'postgres://user:password@ep-example.neon.tech/db?sslmode=require'}));
  assert.throws(()=>validatePublicConfiguration({publicMode:true,canonicalOrigin:'https://receiptlab.onrender.com',stateDirectory:'/tmp/receiptlab',databaseUrl:'postgres://user:password@ep-example.neon.tech/db'}),/choose one|ambiguous/i);
  assert.throws(()=>validatePublicConfiguration({publicMode:true,canonicalOrigin:'https://receiptlab.onrender.com',databaseUrl:'http://db.example/db'}),/PostgreSQL/i);
});

test('Render ingress pins the Host and TLS scheme without trusting forwarded host values', () => {
  const origin='https://receiptlab.onrender.com';
  const request=headers=>({headers:{host:'receiptlab.onrender.com',...headers}});
  assert.equal(trustedPublicRequest(request({'x-forwarded-proto':'https','x-forwarded-host':'attacker.invalid'}),origin,{renderProxy:true}),true);
  assert.equal(trustedPublicRequest(request({'x-forwarded-proto':'http'}),origin,{renderProxy:true}),false);
  assert.equal(trustedPublicRequest(request({'x-forwarded-proto':'https,http'}),origin,{renderProxy:true}),false);
  assert.equal(trustedPublicRequest({headers:{host:'attacker.invalid','x-forwarded-proto':'https','x-forwarded-host':'receiptlab.onrender.com'}},origin,{renderProxy:true}),false);
  assert.equal(trustedPublicRequest(request({'forwarded':'host=attacker.invalid;proto=https'}),origin,{renderProxy:false}),false);
});

test('Render startup consumes PORT, binds all interfaces and emits a Secure cookie', {skip:!process.env.RECEIPTLAB_TEST_DATABASE_URL&&'RECEIPTLAB_TEST_DATABASE_URL not configured'}, async t=>{
 const url=process.env.RECEIPTLAB_TEST_DATABASE_URL,namespace='receiptlab-port-test-'+process.pid,pool=new pg.Pool({connectionString:url,max:2,ssl:false}),priorPort=process.env.PORT;
 process.env.PORT='0';
 t.after(async()=>{if(priorPort===undefined)delete process.env.PORT;else process.env.PORT=priorPort;await pool.query('DELETE FROM receiptlab_runtime_state WHERE namespace=$1',[namespace]).catch(()=>{});await pool.end();});
 const canonicalOrigin='https://receiptlab.onrender.com',server=await createWorkbench({publicMode:true,canonicalOrigin,databaseUrl:url,postgresPool:pool,postgresNamespace:namespace,renderProxy:true});t.after(()=>server.close());
 assert.equal(server.address.address,'0.0.0.0');
 const response=await new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:server.address.port,path:'/',headers:{host:'receiptlab.onrender.com','x-forwarded-proto':'https'}},res=>{res.resume();res.on('end',()=>resolve(res));});req.on('error',reject);req.end();});
 assert.equal(response.statusCode,200);assert.match(response.headers['set-cookie'][0],/HttpOnly; SameSite=Strict; Path=\/; Max-Age=1800; Secure/);
});

test('Neon-backed Render mode keeps sessions and signed recovery receipts across restart', {skip:!process.env.RECEIPTLAB_TEST_DATABASE_URL && 'RECEIPTLAB_TEST_DATABASE_URL not configured'}, async t => {
  const url=process.env.RECEIPTLAB_TEST_DATABASE_URL,namespace='receiptlab-render-test-'+process.pid;
  const pool=new pg.Pool({connectionString:url,max:4,ssl:false});
  t.after(async()=>{await pool.query('DELETE FROM receiptlab_runtime_state WHERE namespace=$1',[namespace]).catch(()=>{});await pool.end();});
  const canonicalOrigin='https://receiptlab.onrender.com';
  const start=()=>createWorkbench({publicMode:true,canonicalOrigin,databaseUrl:url,postgresPool:pool,postgresNamespace:namespace,renderProxy:true,listenHost:'127.0.0.1',port:0,maxSessions:2});
  const request=(server,path,{method='GET',cookie,body}={})=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:server.address.port,path,method,headers:{host:new URL(canonicalOrigin).host,'x-forwarded-proto':'https',...(cookie?{cookie}:{}),...(body===undefined?{}:{origin:canonicalOrigin,'content-type':'application/json'})}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{const data=Buffer.concat(chunks).toString(),headers={get:name=>{const v=res.headers[name.toLowerCase()];return Array.isArray(v)?v[0]??null:v??null;}};resolve({status:res.statusCode,headers,text:async()=>data,json:async()=>JSON.parse(data)});});});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));});
  let server=await start();
  t.after(()=>server?.close());
  const home=await request(server,'/');assert.equal(home.status,200,await home.text());
  const cookie=home.headers.get('set-cookie').split(';',1)[0];assert.match(home.headers.get('set-cookie'),/; Secure/);
  const created=await request(server,'/api/runs',{method:'POST',cookie,body:{scenarioId:'grant-transient'}});assert.equal(created.status,201);const run=await created.json();
  for(let step=0;step<3;step++){const res=await request(server,`/forms/api/runs/${run.id}`,{method:'POST',cookie,body:{step,values:run.task}});assert.ok([200,503].includes(res.status));}
  const diagnosisResponse=await request(server,`/api/runs/${run.id}/diagnose`,{method:'POST',cookie,body:{mode:'deterministic'}});assert.equal(diagnosisResponse.status,200);const diagnosis=await diagnosisResponse.json();
  const recovery=await request(server,`/api/runs/${run.id}/recover`,{method:'POST',cookie,body:{approve:true,diagnosisId:diagnosis.id,traceDigest:diagnosis.traceDigest}});assert.equal(recovery.status,200);
  const checked=await request(server,`/api/runs/${run.id}/verify`,{method:'POST',cookie,body:{claimedCompletion:true}});assert.equal(checked.status,200);const evidence=await checked.json();assert.equal(evidence.verification.completed,true);
  await server.close();
  server=await start();
  const session=await request(server,'/api/session',{cookie});assert.equal(session.status,200);assert.equal((await session.json()).storageMode,'retained');
  const rechecked=await request(server,`/api/runs/${run.id}/verify`,{method:'POST',cookie,body:{claimedCompletion:true}});assert.equal(rechecked.status,200);assert.equal((await rechecked.json()).verification.completed,true);
});
