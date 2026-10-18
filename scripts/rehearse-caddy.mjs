import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {once} from 'node:events';
import {createHash} from 'node:crypto';

const flags=process.argv.slice(2);
if(!flags.length){console.log(JSON.stringify({mode:'plan-only',modelRequests:0,publicDeployment:false,execution:'--execute with previously verified cloud-local Caddy binary',checks:'Private HTTPS/header stripping/receipt and process restart only'}));}
else if(flags.length!==1||flags[0]!=='--execute'){console.error('Explicit --execute required');process.exitCode=1;}
else {
const cwd=process.cwd(),tool=resolve('.cache/caddy/caddy');
const directory=await mkdtemp(join(tmpdir(),'receiptlab-caddy-'));
let backend,caddy,tap;
const observations=[],checks={},startedAt=new Date().toISOString();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const freePort=async()=>{const s=http.createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port;};
const backendPort=await freePort(),tlsPort=await freePort(),host='receiptlab.example.invalid:'+tlsPort,canonicalOrigin='https://'+host;
let logs='';
const stop=async child=>{if(!child||child.exitCode!==null||child.signalCode)return;const exited=once(child,'exit');child.kill('SIGTERM');await exited;};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const direct=(path='/health',headers={})=>new Promise((resolve,reject)=>{const req=http.request('http://127.0.0.1:'+backendPort+path,{headers:{host,...headers}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
try{
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(directory,'key.pem'),'-out',join(directory,'cert.pem'),'-days','1','-subj','/CN=receiptlab.example.invalid','-addext','subjectAltName=DNS:receiptlab.example.invalid'],{stdio:'ignore'});
 const ca=await readFile(join(directory,'cert.pem'));
 const request=(path,{cookie='',body,headers={}}={})=>new Promise((resolve,reject)=>{
  const req=https.request({hostname:'127.0.0.1',port:tlsPort,servername:'receiptlab.example.invalid',ca,path,method:body===undefined?'GET':'POST',headers:{host,origin:canonicalOrigin,cookie,'content-type':'application/json',...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString();resolve({status:res.statusCode,headers:res.headers,text,json:()=>JSON.parse(text)});});});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
 });
 const startBackend=async()=>{
  backend=spawn(process.execPath,['scripts/workbench-public.mjs'],{cwd,env:{...process.env,PORT:String(backendPort),RECEIPTLAB_CANONICAL_ORIGIN:canonicalOrigin,RECEIPTLAB_STATE_DIRECTORY:join(directory,'state')},stdio:['ignore','pipe','pipe']});
  backend.stdout.on('data',d=>{logs+='BACKEND '+d;});backend.stderr.on('data',d=>{logs+='BACKEND '+d;});
  for(let n=0;n<100;n++){if(backend.exitCode!==null)throw new Error('Backend exited during startup');try{if(await direct()===200)return;}catch{}await wait(50);}throw new Error('Backend readiness timeout');
 };
 await startBackend();
 tap=http.createServer((req,res)=>{
  observations.push({path:req.url,method:req.method,canonicalHost:req.headers.host===host,forwardedAbsent:['forwarded','x-forwarded-host','x-forwarded-proto','x-forwarded-for'].every(h=>!(h in req.headers))});
  const upstream=http.request('http://127.0.0.1:'+backendPort+req.url,{method:req.method,headers:req.headers},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
 });
 await new Promise(resolve=>tap.listen(0,'127.0.0.1',resolve));
 const candidate=await readFile('deployment/Caddyfile','utf8');
 const config='{\n admin off\n auto_https off\n}\n'+candidate.replaceAll('{$RECEIPTLAB_HOST}',host).replace('127.0.0.1:3000','127.0.0.1:'+tap.address().port).replace(host+' {','https://'+host+' {\n bind 127.0.0.1\n tls '+join(directory,'cert.pem')+' '+join(directory,'key.pem'));
 const configPath=join(directory,'Caddyfile');await writeFile(configPath,config);
 const adapted=JSON.parse(execFileSync(tool,['adapt','--adapter','caddyfile','--config',configPath,'--validate'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 assert.equal(adapted.admin.disabled,true);assert.ok(Object.values(adapted.apps.http.servers).every(s=>s.listen.every(a=>a.startsWith('127.0.0.1:'))));assert.ok(Object.values(adapted.apps.http.servers).every(s=>s.automatic_https?.disable===true));
 checks.actualCaddyConfigValidated=true;checks.adminDisabled=true;checks.automaticHttpsDisabled=true;checks.listenersLoopbackOnly=true;
 caddy=spawn(tool,['run','--adapter','caddyfile','--config',configPath],{cwd,stdio:['ignore','pipe','pipe']});caddy.stdout.on('data',d=>{logs+='CADDY '+d;});caddy.stderr.on('data',d=>{logs+='CADDY '+d;});
 let health;
 for(let n=0;n<100;n++){if(caddy.exitCode!==null)throw new Error('Caddy exited during startup');try{health=await request('/health');if(health.status===200)break;}catch{}await wait(50);}
 assert.equal(health?.status,200);assert.equal(health.json().liveInferenceEnabled,false);checks.httpsHealthAndInferenceDisabled=true;
 assert.equal(await direct('/health',{'x-forwarded-proto':'https'}),403);checks.directSpoofDenied=true;
 const poison={forwarded:'for=attacker.invalid;host=attacker.invalid;proto=http','x-forwarded-host':'attacker.invalid','x-forwarded-proto':'http','x-forwarded-for':'198.51.100.33'};
 const home=await request('/',{headers:poison});assert.equal(home.status,200);assert.match(home.headers['set-cookie'][0],/; Secure/);assert.match(home.headers['set-cookie'][0],/HttpOnly; SameSite=Strict/);checks.secureHttpOnlySameSiteCookie=true;
 const cookie=home.headers['set-cookie'][0].split(';')[0];
 const create=await request('/api/runs',{cookie,body:{scenarioId:'grant-clean'},headers:poison});assert.equal(create.status,201);const run=create.json();
 assert.equal(new URL(run.url).origin,canonicalOrigin);assert.match(new URL(run.url).pathname,/^\/forms\/form\//);checks.singleOriginCanonicalFormLink=true;
 const form=await request(new URL(run.url).pathname,{cookie,headers:poison});assert.equal(form.status,200);assert.match(form.text,/\/forms\/client.js/);
 assert.equal((await request('/forms/client.js',{cookie})).status,200);assert.equal((await request('/forms/style.css',{cookie})).status,200);checks.sameOriginFormAndAssets=true;
 for(const [step,values] of [[0,run.task],[1,run.task],[2,{consent:true}]])assert.equal((await request('/forms/api/runs/'+run.id,{cookie,body:{step,values},headers:poison})).status,200);
 const verify=async()=>{const r=await request('/api/runs/'+run.id+'/verify',{cookie,body:{claimedCompletion:true},headers:poison});assert.equal(r.status,200);return r.json();};
 const before=await verify();assert.equal(before.verification.completed,true);assert.equal(before.model.requests,0);checks.serverReceiptVerifiedBeforeRestart=true;
 await stop(backend);await startBackend();
 const after=await verify();assert.equal(after.verification.completed,true);assert.equal(after.runId,before.runId);assert.equal(after.model.requests,0);checks.serverReceiptAndSessionSurviveActualBackendProcessRestart=true;
 const foreign=await request('/');const foreignCookie=foreign.headers['set-cookie'][0].split(';')[0];assert.equal((await request(new URL(run.url).pathname,{cookie:foreignCookie})).status,404);checks.otherSessionCannotReadForm=true;
 assert.equal((await request('/forms/api/runs/'+run.id,{cookie,body:{step:2,values:{consent:true}}})).status,409);checks.duplicateSubmissionDeniedAfterRestart=true;
 const exported=await request('/api/runs/'+run.id+'/evidence',{cookie});assert.equal(exported.status,200);assert.ok(!/signature|apiKey/.test(exported.text));checks.safeExport=true;
 assert.ok(observations.length>=14);assert.ok(observations.every(o=>o.canonicalHost&&o.forwardedAbsent));checks.actualCaddyStripsAllForwardedHeaders=true;
 const evidence={schemaVersion:1,kind:'private-loopback-actual-Caddy-HTTPS-rehearsal',sourceCommit,startedAt,finishedAt:new Date().toISOString(),outcome:'passed',caddyVersion:execFileSync(tool,['version'],{encoding:'utf8'}).trim(),caddyBinarySha256:sha(await readFile(tool)),candidateCaddyfileSha256:sha(candidate),rehearsalCaddyfileSha256:sha(config),tls:{certificate:'temporary one-day self-signed certificate, trusted explicitly for this test',serverNameVerified:true,acmeDisabled:true,certificateAndPrivateKeyRemovedDuringCleanup:true},checks,observedUpstreamRequests:observations.length,allUpstreamRequestsCanonicalHostAndNoForwardedHeaders:true,modelRequests:0,resourcesCreated:'temporary private loopback processes and temporary filesystem data only',publicDeployment:false,limitations:['No public DNS, public listener, external certificate issuance or hosting resource.','Uses an ephemeral loopback observation hop to inspect Caddy outbound headers before the unchanged runtime.','Source runtime and default public entrypoint are tested; prepared systemd unit is not installed or exercised.','Does not establish provider quotas, durable-volume entitlement, hosted availability, no-charge guarantees or NVIDIA model behavior.']};
 await mkdir('results',{recursive:true});await writeFile('results/rc-caddy-rehearsal.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({outcome:'passed',checks,observedUpstreamRequests:observations.length,sourceCommit},null,2));
}catch(error){console.error(error.stack);await writeFile('.cache/qa/rc-caddy-rehearsal-error.log',logs);process.exitCode=1;}
finally{await stop(caddy);await stop(backend);if(tap)await new Promise(resolve=>{tap.close(resolve);tap.closeAllConnections();});await rm(directory,{recursive:true,force:true});}

}
