import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import {createHash,X509Certificate} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {createWorkbench} from '../src/workbench/server.mjs';
import {runDomBaseline} from '../src/agents/dom-baseline.mjs';
import {allowedBrowserUrl,clickAndSettle} from '../src/agents/browser.mjs';

async function fixture(t){
 const directory=await mkdtemp(join(tmpdir(),'receiptlab-agent-tls-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(directory,'key.pem'),'-out',join(directory,'cert.pem'),'-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'ignore'});
 const cert=await readFile(join(directory,'cert.pem'));
 const spki=createHash('sha256').update(new X509Certificate(cert).publicKey.export({type:'spki',format:'der'})).digest('base64');
 let runtime;
 const gateway=https.createServer({key:await readFile(join(directory,'key.pem')),cert},(req,res)=>{
  const headers={...req.headers};for(const h of ['forwarded','x-forwarded-host','x-forwarded-proto'])delete headers[h];
  const upstream=http.request(runtime.origin+req.url,{method:req.method,headers},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
 });
 await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
 const canonicalOrigin='https://127.0.0.1:'+gateway.address().port;
 runtime=await createWorkbench({publicMode:true,canonicalOrigin,stateDirectory:join(directory,'state')});t.after(()=>runtime.close());
 // Only this temporary certificate's SPKI is trusted; no context-wide TLS bypass.
 const browser=await chromium.launch({headless:true,args:['--ignore-certificate-errors-spki-list='+spki]});t.after(()=>browser.close());
 const context=await browser.newContext();t.after(()=>context.close());const page=await context.newPage();page.setDefaultTimeout(1500);await page.goto(canonicalOrigin);
 const run=await page.evaluate(async()=>await (await fetch('/api/runs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({scenarioId:'grant-clean'})})).json());
 return {page,run,canonicalOrigin};
}

test('simulated DOM policy completes all three public HTTPS form steps and independent receipt verification',async t=>{
 const {page,run,canonicalOrigin}=await fixture(t);const posts=[];page.on('response',response=>{if(response.request().method()==='POST')posts.push(response.url());});
 await page.goto(run.url);await page.locator('form').waitFor();
 const result=await runDomBaseline(page,run.task);
 assert.equal(result.claimedCompletion,true,JSON.stringify(result));
 assert.deepEqual(posts,[0,1,2].map(()=>canonicalOrigin+'/forms/api/runs/'+run.id));
 const verdict=await page.evaluate(async id=>await (await fetch('/api/runs/'+id+'/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({claimedCompletion:true})})).json(),run.id);
 assert.equal(verdict.verification.completed,true);assert.equal(verdict.model.requests,0);
 // Supporting public response waiting does not expand the separate browser session allowlist.
 assert.equal(allowedBrowserUrl(run.url,canonicalOrigin,run.id),false);
 assert.equal(allowedBrowserUrl(canonicalOrigin+'/form/'+run.id,canonicalOrigin,run.id),true);
});

test('settling binds POST responses to the current form run, prefix and origin',async()=>{
 for(const prefix of ['', '/forms']){
  const origin='https://receiptlab.example.invalid',endpoint=origin+prefix+'/api/runs/run-123';let predicate,clicked=false;
  const page={url:()=>origin+prefix+'/form/run-123',waitForResponse:async accept=>{predicate=accept;},waitForFunction:async()=>{}};
  await clickAndSettle(page,{click:async()=>{clicked=true;}});assert.equal(clicked,true);
  const response=(url,method='POST')=>({url:()=>url,request:()=>({method:()=>method})});
  assert.equal(predicate(response(endpoint)),true);
  for(const wrong of [origin+prefix+'/api/runs/other',endpoint+'/verify',endpoint+'?extra=1',endpoint+'-suffix','https://attacker.invalid'+prefix+'/api/runs/run-123',origin+(prefix?'':'/forms')+'/api/runs/run-123'])assert.equal(predicate(response(wrong)),false,wrong);
  assert.equal(predicate(response(endpoint,'GET')),false);
 }
 let clicked=false;await assert.rejects(clickAndSettle({url:()=> 'https://receiptlab.example.invalid/form/run-123?other=1'},{click:async()=>{clicked=true;}}),/run-bound/);assert.equal(clicked,false);
});
