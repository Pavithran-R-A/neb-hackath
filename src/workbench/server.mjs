import {openDurableState,validatePublicConfiguration} from '../runtime/durable-state.mjs';
import {diagnoseWorkflow,recoverWorkflow} from '../diagnosis/workflow.mjs';
import {createProvenance} from '../provenance.mjs';
import http from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createApp} from '../app/server.mjs';
import {scenarios} from '../scenarios.mjs';
import {evaluationV2} from '../evaluation-v2.mjs';
import {verifyCompletion,digest} from '../verification.mjs';
import {finalizeAttempt} from '../evaluation.mjs';
import {createPostgresPool,openPostgresState} from '../runtime/postgres-state.mjs';
import {trustedPublicRequest} from '../runtime/proxy-trust.mjs';
const assets=new Map(await Promise.all([['/','index.html','text/html'],['/workbench.js','client.js','text/javascript'],['/workbench.css','style.css','text/css']].map(async([path,file,type])=>[path,{body:await readFile(new URL(file,import.meta.url)),type}])));
const catalog=[...scenarios,...evaluationV2];
export async function createWorkbench({port=Number(process.env.PORT??0),listenHost,now=Date.now,sessionTtlMs=1800000,maxRunsPerSession=5,maxSessions=32,diagnosticPolicy=null,diagnosticExecutionKind='live-nebius',allowedDiagnosticScenarios=null,publicMode=false,canonicalOrigin,stateDirectory,databaseUrl=process.env.DATABASE_URL,postgresPool,postgresNamespace='receiptlab',renderProxy=process.env.RECEIPTLAB_RENDER_PROXY==='true',diagnosticBudgetDirectory,judgeOperating=null}={}){
 validatePublicConfiguration({publicMode,canonicalOrigin,stateDirectory,databaseUrl,diagnosticPolicy:diagnosticPolicy??judgeOperating,diagnosticBudgetDirectory});
 if(publicMode&&databaseUrl&&(diagnosticPolicy||judgeOperating)&&!(judgeOperating?.postgresDurableBudget===true))throw new Error('PostgreSQL judge budget adapter is required before hosted inference can start');
 const provenance=await createProvenance();
 const suiteHashes={};for(const name of ['cases.json','labels.json','protocol.md','review.json']){try{suiteHashes[name]=createHash('sha256').update(await readFile(new URL('../../evaluation/diagnosis-v1/'+name,import.meta.url))).digest('hex');}catch{suiteHashes[name]=null;}}
 const ownsPool=Boolean(publicMode&&databaseUrl&&!postgresPool),pool=postgresPool??(publicMode&&databaseUrl?createPostgresPool(databaseUrl):null);
 const durable=stateDirectory?openDurableState(stateDirectory):publicMode&&databaseUrl?await openPostgresState(pool,{namespace:postgresNamespace}):null;
 const persist=()=>durable?.save();
 const flush=()=>durable?.flush?.()??Promise.resolve();
 const assertHealthy=()=>durable?.assertHealthy();
 let app;try{app=await createApp({now,runTtlMs:sessionTtlMs,records:durable?.state.records,key:durable?Buffer.from(durable.state.key,'hex'):undefined,persist:databaseUrl?()=>{}:persist,assertHealthy});}catch(error){await durable?.close();if(ownsPool)await pool.end();throw error;}
 const sessions=durable?.state.sessions??new Map();let origin;
 const trustedOrigin=()=>publicMode?canonicalOrigin:origin;
 const sourceCommit=provenance.sourceCommit??'unrecorded';
 const cleanup=()=>{for(const [id,s] of sessions)if(s.expiresAt<=now()){for(const r of s.runs.values())app.deleteRun(r.id);sessions.delete(id);}};
 const evidence=(run,claimedCompletion)=>{
  const record=app.readRecord(run.id),verification=verifyCompletion(record,run.task,app.key,{runId:run.id});
  const liveAccepted=(run.diagnoses??[]).some(d=>d.executionKind==='live-nebius'),liveAttempted=(run.diagnosisFailures??[]).some(d=>d.mode==='nemotron'&&d.executionKind==='live-nebius');
  const report={schemaVersion:1,product:'ReceiptLab local evidence workbench',sourceCommit,provenance,suiteHashes,diagnosticDataset:'evaluation/diagnosis-v1 (see separate frozen SHA manifest)',diagnoses:(run.diagnoses??[]).map(({trace,...d})=>d),recoveries:run.recoveryHistory??[],evidenceKind:liveAccepted?'Synthetic workflow with live NVIDIA diagnostic suggestions':liveAttempted?'Synthetic workflow with attempted NVIDIA diagnosis; no accepted model suggestion':'Synthetic workflow; no live model inference',runId:run.id,scenarioId:run.scenarioId,checkedAt:new Date(now()).toISOString(),taskDigest:digest(run.task),verification,...finalizeAttempt({claimedCompletion},verification),server:{status:record?.status??'unavailable',step:record?.step??null,completionCount:record?.completionCount??0},model:{execution:liveAccepted?'live-nebius':liveAttempted?'live-nebius-attempted':'NOT RUN',requests:(run.diagnosisFailures??[]).some(d=>d.mode==='nemotron')?null:(run.diagnoses??[]).filter(d=>d.executionKind==='live-nebius').length,costUsd:(run.diagnosisFailures??[]).some(d=>d.mode==='nemotron')?null:(run.diagnoses??[]).filter(d=>d.executionKind==='live-nebius').reduce((n,d)=>n+d.estimatedCostUsd,0)},diagnosisFailures:run.diagnosisFailures??[],limitations:['HMAC verified privately in this process; export is not a public-key proof',durable?'Retained synthetic state survives restart until expiry; availability depends on retained storage':'Synthetic session state disappears on expiry or restart','Model suggestions do not prove outcomes; this run alone does not establish competitive advantage']};
  return {...report,artifactSha256:createHash('sha256').update(JSON.stringify(report)).digest('hex')};
 };
 const activeRequests=new Set();
 const handle=async(req,res)=>{
  const send=async(status,data,type='application/json',headers={})=>{try{persist();await flush();}catch{status=503;data={error:'Workbench persistence unavailable; operation was not confirmed'};type='application/json';headers={};}res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",...headers});res.end(type==='application/json'?JSON.stringify(data):data);};
  try{
   assertHealthy();
   const expectedOrigin=trustedOrigin();
   if(!trustedPublicRequest(req,expectedOrigin,{renderProxy:publicMode&&renderProxy}))return send(403,{error:'Origin, host or trusted HTTPS proxy denied'});
   const path=new URL(req.url,origin).pathname;
   // Health is read-only: answer without waiting for PostgreSQL persistence or cleanup.
   if(path==='/health'&&req.method==='GET'){
    const data={ok:true,mode:publicMode?'persistent-synthetic':'local-synthetic',storageMode:databaseUrl?'postgresql':durable?'sqlite':'ephemeral',liveInferenceEnabled:Boolean(diagnosticPolicy||judgeOperating)};
    res.writeHead(200,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});
    res.end(JSON.stringify(data));
    return;
   }
   cleanup();
   const id=/(?:^|;\s*)receiptlab=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie??'')?.[1];let session=sessions.get(id);
   if(req.method==='GET'&&assets.has(path)){
    const headers={};
    if(path==='/'&&!session){
     if(sessions.size>=maxSessions)return send(503,{error:'Local session capacity reached; wait for expiry'});
     const token=randomBytes(32).toString('hex');session={expiresAt:now()+sessionTtlMs,runs:new Map(),requests:[]};sessions.set(token,session);
     headers['set-cookie']='receiptlab='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+Math.floor(sessionTtlMs/1000)+(publicMode?'; Secure':'');
    }
    const asset=assets.get(path);return send(200,asset.body,asset.type,headers);
   }
   if(!session)return send(401,{error:'Session expired or missing; reload the workbench'});
   session.requests=session.requests.filter(time=>time>now()-60000);
   if(session.requests.length>=120)return send(429,{error:'Session request limit reached; wait one minute'});session.requests.push(now());
   if(publicMode&&path.startsWith('/forms/')){
    const formMatch=/^\/forms\/(?:form|api\/runs)\/([\w-]+)$/.exec(path),isAsset=['/forms/client.js','/forms/style.css'].includes(path);
    if(!isAsset&&(!formMatch||!session.runs.has(formMatch[1])))return send(404,{error:'Form not found in this session'});
    if(!['GET','POST'].includes(req.method)||(isAsset&&req.method!=='GET'))return send(405,{error:'Method denied'});
    let raw;
    if(req.method==='POST'){
     if(req.headers.origin!==expectedOrigin)return send(403,{error:'Same-origin POST required'});
     raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8192)return send(413,{error:'Body too large'});}
    }
    const response=await fetch(app.origin+path.slice('/forms'.length),{method:req.method,redirect:'error',signal:AbortSignal.timeout(5000),headers:{'content-type':'application/json'},body:raw});
    const type=response.headers.get('content-type');let data=await response.text();
    if(type==='text/html')data=data.replace('href="/style.css"','href="/forms/style.css"').replace('src="/client.js"','src="/forms/client.js"');
    // Only browser-visible state is proxied; evaluator records, receipts and key stay private.
    return send(response.status,type==='application/json'?JSON.parse(data):data,type,{'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});
   }
   if(path==='/api/session'&&req.method==='GET')return send(200,{storageMode:durable?'retained':'ephemeral',liveInferenceEnabled:Boolean(diagnosticPolicy||judgeOperating),diagnosticExecutionKind,judgeOperatingMode:Boolean(judgeOperating),judgeAccessRequired:Boolean(judgeOperating&&!await judgeOperating.authorized(id)),expiresAt:new Date(session.expiresAt).toISOString(),scenarios:catalog.map(s=>({id:s.id,title:s.purpose??s.id,flow:s.flow}))});
   if(!['GET','POST'].includes(req.method))return send(405,{error:'Method denied'});
   let body;
   if(req.method==='POST'){
    if(req.headers.origin!==expectedOrigin)return send(403,{error:'Same-origin POST required'});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)return send(413,{error:'Body too large'});}
    try{body=JSON.parse(raw);}catch{return send(400,{error:'Invalid JSON'});}
    if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'Invalid request'});
   }
   if(path==='/api/judge-access'&&req.method==='POST'&&judgeOperating){if(typeof body.code!=='string'||body.code.length>200||Object.keys(body).some(k=>k!=='code'))return send(400,{error:'A judge access code is required'});try{return await judgeOperating.authorize(id,body.code)?send(200,{authorized:true}):send(403,{error:'Judge access denied'});}catch{return send(429,{error:'Judge access attempt limit reached'});}}
   if(path==='/api/runs'&&req.method==='POST'){
    const scenario=catalog.find(s=>s.id===body.scenarioId);if(!scenario||Object.keys(body).some(k=>k!=='scenarioId'))return send(400,{error:'Choose a known synthetic challenge'});
    if(session.runs.size>=maxRunsPerSession)return send(429,{error:'Session run limit reached; reset the workbench'});
    const run={...app.createRun(scenario),scenarioId:scenario.id,task:scenario.task};session.runs.set(run.id,run);return send(201,{id:run.id,url:publicMode?canonicalOrigin+'/forms/form/'+run.id:run.url,task:run.task});
   }
   if(path==='/api/reset'&&req.method==='POST'){for(const run of session.runs.values())app.deleteRun(run.id);session.runs.clear();return send(200,{reset:true});}
   const match=/^\/api\/runs\/([\w-]+)\/(verify|evidence|diagnose|recover)$/.exec(path),run=match&&session.runs.get(match[1]);
   if(!run)return send(404,{error:'Run not found in this session'});
   if(match[2]==='diagnose'&&req.method==='POST'){
    if(!['deterministic','nemotron'].includes(body.mode)||Object.keys(body).some(k=>k!=='mode'))return send(400,{error:'Choose a known diagnostic mode'});
    if(body.mode==='nemotron'&&allowedDiagnosticScenarios&&!allowedDiagnosticScenarios.includes(run.scenarioId))return send(409,{error:'This challenge is outside the approved model campaign'});
    if(body.mode==='nemotron'&&!diagnosticPolicy&&!judgeOperating)return send(409,{error:'NVIDIA diagnosis inactive; bounded owner-authorized service configuration required'});
    if(body.mode==='nemotron'&&judgeOperating&&!await judgeOperating.authorized(id))return send(403,{error:'Explicit judge access required'});
    if(run.diagnosing||(run.diagnoses?.length??0)>=8)return send(429,{error:'Diagnosis in progress or run limit reached'});
    if(run.interrupted)return send(409,{error:'Interrupted action requires a fresh challenge'});
    run.diagnosing=true;persist();await flush();
    try{return send(200,await diagnoseWorkflow({run,app,mode:body.mode,policy:judgeOperating?.policyFor({sessionId:id,runId:run.id,scenarioId:run.scenarioId})??diagnosticPolicy,executionKind:diagnosticExecutionKind}));}catch(error){if(error.code==='JUDGE_ADMISSION_DENIED')return send(429,{error:'Judge inference quota, expiry or review limit reached; no provider request was sent. Use local rules or contact the operator.'});run.diagnosisFailures??=[];run.diagnosisFailures.push({mode:body.mode,executionKind:diagnosticExecutionKind,providerOutcome:error.report??null,error:'Diagnosis failed safely; actual POST count is authoritative in the campaign ledger'});return send(502,{error:'Diagnosis failed safely; no recovery action executed'});}finally{run.diagnosing=false;persist();await flush();}
   }
   if(match[2]==='recover'&&req.method==='POST'){
    if(run.interrupted)return send(409,{error:'Interrupted action requires a fresh challenge'});
    if(body.approve!==true||typeof body.diagnosisId!=='string'||typeof body.traceDigest!=='string'||Object.keys(body).some(k=>!['approve','diagnosisId','traceDigest'].includes(k)))return send(400,{error:'Explicit approval and matching diagnosis/trace are required'});
    try{return send(200,await recoverWorkflow({run,app,body,persist,flush}));}catch{return send(409,{error:'Recovery stale, unsupported, failed or already consumed; no automatic retry'});}
   }
   if(match[2]==='verify'&&req.method==='POST'){
    if(typeof body.claimedCompletion!=='boolean'||Object.keys(body).some(k=>k!=='claimedCompletion'))return send(400,{error:'A boolean completion claim is required'});
    run.claimedCompletion=body.claimedCompletion;return send(200,evidence(run,body.claimedCompletion));
   }
   if(match[2]==='evidence'&&req.method==='GET'){
    if(run.claimedCompletion===undefined)return send(409,{error:'Check application state before exporting evidence'});
    return send(200,evidence(run,run.claimedCompletion),'application/json',{'content-disposition':'attachment; filename="receiptlab-'+run.id+'.json"'});
   }
   return send(405,{error:'Method denied'});
  }catch{if(!res.headersSent){res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:'Workbench request failed safely; persistent state may be unavailable'}));}else res.destroy();}
 };
 let requestTail=Promise.resolve();
 const server=http.createServer((req,res)=>{
  let health=false;
  try{health=req.method==='GET'&&new URL(req.url,origin).pathname==='/health';}catch{}
  const queued=Boolean(databaseUrl)&&!health;
  const work=queued?requestTail.then(()=>handle(req,res)):handle(req,res);
  if(queued)requestTail=work.catch(()=>{});
  activeRequests.add(work);work.then(()=>activeRequests.delete(work),()=>{activeRequests.delete(work);res.destroy();});
 });
 const host=listenHost??(publicMode?'0.0.0.0':'127.0.0.1');
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});}catch(error){await app.close();await durable?.close();if(ownsPool)await pool.end();throw error;}
 origin=publicMode?canonicalOrigin:'http://127.0.0.1:'+server.address().port;
 return {origin,address:server.address(),close:async()=>{await new Promise((resolve,reject)=>{server.close(e=>e?reject(e):resolve());server.closeAllConnections();});await Promise.allSettled([...activeRequests]);await app.close();await durable?.close();if(ownsPool)await pool.end();}};
}
