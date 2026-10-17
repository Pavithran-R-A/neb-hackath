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
const assets=new Map(await Promise.all([['/','index.html','text/html'],['/workbench.js','client.js','text/javascript'],['/workbench.css','style.css','text/css']].map(async([path,file,type])=>[path,{body:await readFile(new URL(file,import.meta.url)),type}])));
const catalog=[...scenarios,...evaluationV2];
export async function createWorkbench({port=0,now=Date.now,sessionTtlMs=1800000,maxRunsPerSession=5,maxSessions=32,diagnosticPolicy=null,diagnosticExecutionKind='live-nebius',allowedDiagnosticScenarios=null}={}){
 const provenance=await createProvenance();
 const suiteHashes={};for(const name of ['cases.json','labels.json','protocol.md','review.json']){try{suiteHashes[name]=createHash('sha256').update(await readFile(new URL('../../evaluation/diagnosis-v1/'+name,import.meta.url))).digest('hex');}catch{suiteHashes[name]=null;}}
 const app=await createApp(),sessions=new Map();let origin;
 const sourceCommit=provenance.sourceCommit??'unrecorded';
 const cleanup=()=>{for(const [id,s] of sessions)if(s.expiresAt<=now()){for(const r of s.runs.values())app.deleteRun(r.id);sessions.delete(id);}};
 const evidence=(run,claimedCompletion)=>{
  const record=app.readRecord(run.id),verification=verifyCompletion(record,run.task,app.key,{runId:run.id});
  const liveAccepted=(run.diagnoses??[]).some(d=>d.executionKind==='live-nebius'),liveAttempted=(run.diagnosisFailures??[]).some(d=>d.mode==='nemotron'&&d.executionKind==='live-nebius');
  const report={schemaVersion:1,product:'ReceiptLab local evidence workbench',sourceCommit,provenance,suiteHashes,diagnosticDataset:'evaluation/diagnosis-v1 (see separate frozen SHA manifest)',diagnoses:(run.diagnoses??[]).map(({trace,...d})=>d),recoveries:run.recoveryHistory??[],evidenceKind:liveAccepted?'Synthetic workflow with live NVIDIA diagnostic suggestions':liveAttempted?'Synthetic workflow with attempted NVIDIA diagnosis; no accepted model suggestion':'Synthetic workflow; no live model inference',runId:run.id,scenarioId:run.scenarioId,checkedAt:new Date(now()).toISOString(),taskDigest:digest(run.task),verification,...finalizeAttempt({claimedCompletion},verification),server:{status:record?.status??'unavailable',step:record?.step??null,completionCount:record?.completionCount??0},model:{execution:liveAccepted?'live-nebius':liveAttempted?'live-nebius-attempted':'NOT RUN',requests:(run.diagnosisFailures??[]).some(d=>d.mode==='nemotron')?null:(run.diagnoses??[]).filter(d=>d.executionKind==='live-nebius').length,costUsd:(run.diagnosisFailures??[]).some(d=>d.mode==='nemotron')?null:(run.diagnoses??[]).filter(d=>d.executionKind==='live-nebius').reduce((n,d)=>n+d.estimatedCostUsd,0)},diagnosisFailures:run.diagnosisFailures??[],limitations:['HMAC verified privately in this process; export is not a public-key proof','Synthetic session state disappears on expiry or restart','Model suggestions do not prove outcomes; this run alone does not establish competitive advantage']};
  return {...report,artifactSha256:createHash('sha256').update(JSON.stringify(report)).digest('hex')};
 };
 const server=http.createServer(async(req,res)=>{
  const send=(status,data,type='application/json',headers={})=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",...headers});res.end(type==='application/json'?JSON.stringify(data):data);};
  try{
   cleanup();
   if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin))return send(403,{error:'Origin or host denied'});
   const path=new URL(req.url,origin).pathname;
   if(path==='/health'&&req.method==='GET')return send(200,{ok:true,mode:'local-synthetic',liveInferenceEnabled:Boolean(diagnosticPolicy)});
   const id=/(?:^|;\s*)receiptlab=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie??'')?.[1];let session=sessions.get(id);
   if(req.method==='GET'&&assets.has(path)){
    const headers={};
    if(path==='/'&&!session){
     if(sessions.size>=maxSessions)return send(503,{error:'Local session capacity reached; wait for expiry'});
     const token=randomBytes(32).toString('hex');session={expiresAt:now()+sessionTtlMs,runs:new Map(),requests:[]};sessions.set(token,session);
     headers['set-cookie']='receiptlab='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+Math.floor(sessionTtlMs/1000);
    }
    const asset=assets.get(path);return send(200,asset.body,asset.type,headers);
   }
   if(!session)return send(401,{error:'Session expired or missing; reload the workbench'});
   session.requests=session.requests.filter(time=>time>now()-60000);
   if(session.requests.length>=120)return send(429,{error:'Session request limit reached; wait one minute'});session.requests.push(now());
   if(path==='/api/session'&&req.method==='GET')return send(200,{liveInferenceEnabled:Boolean(diagnosticPolicy),diagnosticExecutionKind,expiresAt:new Date(session.expiresAt).toISOString(),scenarios:catalog.map(s=>({id:s.id,title:s.purpose??s.id,flow:s.flow}))});
   if(!['GET','POST'].includes(req.method))return send(405,{error:'Method denied'});
   let body;
   if(req.method==='POST'){
    if(req.headers.origin!==origin)return send(403,{error:'Same-origin POST required'});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)return send(413,{error:'Body too large'});}
    try{body=JSON.parse(raw);}catch{return send(400,{error:'Invalid JSON'});}
    if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'Invalid request'});
   }
   if(path==='/api/runs'&&req.method==='POST'){
    const scenario=catalog.find(s=>s.id===body.scenarioId);if(!scenario||Object.keys(body).some(k=>k!=='scenarioId'))return send(400,{error:'Choose a known synthetic challenge'});
    if(session.runs.size>=maxRunsPerSession)return send(429,{error:'Session run limit reached; reset the workbench'});
    const run={...app.createRun(scenario),scenarioId:scenario.id,task:scenario.task};session.runs.set(run.id,run);return send(201,{id:run.id,url:run.url,task:run.task});
   }
   if(path==='/api/reset'&&req.method==='POST'){for(const run of session.runs.values())app.deleteRun(run.id);session.runs.clear();return send(200,{reset:true});}
   const match=/^\/api\/runs\/([\w-]+)\/(verify|evidence|diagnose|recover)$/.exec(path),run=match&&session.runs.get(match[1]);
   if(!run)return send(404,{error:'Run not found in this session'});
   if(match[2]==='diagnose'&&req.method==='POST'){
    if(!['deterministic','nemotron'].includes(body.mode)||Object.keys(body).some(k=>k!=='mode'))return send(400,{error:'Choose a known diagnostic mode'});
    if(body.mode==='nemotron'&&allowedDiagnosticScenarios&&!allowedDiagnosticScenarios.includes(run.scenarioId))return send(409,{error:'This challenge is outside the approved model campaign'});
    if(body.mode==='nemotron'&&!diagnosticPolicy)return send(409,{error:'NVIDIA diagnosis inactive; bounded owner-authorized service configuration required'});
    if(run.diagnosing||(run.diagnoses?.length??0)>=8)return send(429,{error:'Diagnosis in progress or run limit reached'});
    run.diagnosing=true;
    try{return send(200,await diagnoseWorkflow({run,app,mode:body.mode,policy:diagnosticPolicy,executionKind:diagnosticExecutionKind}));}catch(error){run.diagnosisFailures??=[];run.diagnosisFailures.push({mode:body.mode,executionKind:diagnosticExecutionKind,providerOutcome:error.report??null,error:'Diagnosis failed safely; actual POST count is authoritative in the campaign ledger'});return send(502,{error:'Diagnosis failed safely; no recovery action executed'});}finally{run.diagnosing=false;}
   }
   if(match[2]==='recover'&&req.method==='POST'){
    if(body.approve!==true||typeof body.diagnosisId!=='string'||typeof body.traceDigest!=='string'||Object.keys(body).some(k=>!['approve','diagnosisId','traceDigest'].includes(k)))return send(400,{error:'Explicit approval and matching diagnosis/trace are required'});
    try{return send(200,await recoverWorkflow({run,app,body}));}catch{return send(409,{error:'Recovery stale, unsupported, failed or already consumed; no automatic retry'});}
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
  }catch{return send(500,{error:'Local workbench request failed safely'});}
 });
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});}catch(error){await app.close();throw error;}
 origin='http://127.0.0.1:'+server.address().port;
 return {origin,close:async()=>{await new Promise((resolve,reject)=>{server.close(e=>e?reject(e):resolve());server.closeAllConnections();});await app.close();}};
}
