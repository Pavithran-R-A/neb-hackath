import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import http from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWorkbench} from '../src/workbench/server.mjs';
import {launchBrowser} from '../src/agents/browser.mjs';

test('real Chromium uses one HTTPS origin and Secure cookie through TLS terminator across runtime restart',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'receiptlab-tls-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(directory,'key.pem'),'-out',join(directory,'cert.pem'),'-days','1','-subj','/CN=127.0.0.1'],{stdio:'ignore'});
 let runtime;
 const gateway=https.createServer({key:await readFile(join(directory,'key.pem')),cert:await readFile(join(directory,'cert.pem'))},(req,res)=>{
  if(!runtime){res.writeHead(503);return res.end();}
  const headers={...req.headers};delete headers.forwarded;delete headers['x-forwarded-host'];delete headers['x-forwarded-proto'];
  const upstream=http.request({hostname:'127.0.0.1',port:runtime.address.port,path:req.url,method:req.method,headers},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
 });
 await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
 const canonicalOrigin='https://127.0.0.1:'+gateway.address().port;
 const options={publicMode:true,canonicalOrigin,stateDirectory:join(directory,'state')};
 runtime=await createWorkbench(options);t.after(()=>runtime?.close());
 const browser=await launchBrowser();t.after(()=>browser.close());const context=await browser.newContext({ignoreHTTPSErrors:true});t.after(()=>context.close());
 const page=await context.newPage();await page.goto(canonicalOrigin);
 const cookies=await context.cookies();assert.equal(cookies.find(c=>c.name==='receiptlab').secure,true);
 const run=await page.evaluate(async()=>await (await fetch('/api/runs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({scenarioId:'grant-clean'})})).json());
 assert.equal(new URL(run.url).origin,canonicalOrigin);
 const form=await context.newPage();form.setDefaultTimeout(5000);const origins=new Set();form.on('request',r=>origins.add(new URL(r.url()).origin));await form.goto(run.url);await form.locator('form').waitFor();
 for(const key of ['name','email','phone'])await form.locator('[data-task-field='+key+']').fill(run.task[key]);
 const advance=async()=>{await Promise.all([form.waitForResponse(r=>r.request().method()==='POST'),form.locator('button[type=submit]').click()]);await form.waitForFunction(()=>!document.querySelector('main button')?.disabled);};
 await advance();await form.locator('[data-task-field=detail]').fill(run.task.detail);await advance();await form.locator('#consent').check();await advance();
 assert.deepEqual([...origins],[canonicalOrigin]);
 const verdict=()=>page.evaluate(async id=>await (await fetch('/api/runs/'+id+'/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({claimedCompletion:true})})).json(),run.id);
 assert.equal((await verdict()).verification.completed,true);
 await runtime.close();runtime=null;runtime=await createWorkbench(options);
 await form.reload();await form.getByRole('heading',{name:'Application received'}).waitFor();assert.equal((await verdict()).verification.completed,true);
 const other=await browser.newContext({ignoreHTTPSErrors:true});t.after(()=>other.close());const outsider=await other.newPage();await outsider.goto(canonicalOrigin);
 assert.equal(await outsider.evaluate(async path=>(await fetch(path)).status,new URL(run.url).pathname),404);
});
