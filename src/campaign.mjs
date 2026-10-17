import {open,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {validateCreditEvidence} from './credit-gate.mjs';
import {validateDiagnosis} from './diagnosis/contract.mjs';
import {endpoint} from './agents/nebius.mjs';

// Local durable reservation ledger, NOT a provider-enforced billing cap. An approval
// must originate with the owner; creating an arbitrary JSON file grants no authority.
export async function createCampaign({authorization:a,ledgerPath,sourceCommit,suiteSha256,fetchImpl=fetch,storage={open,mkdir}}={}){
 const now=Date.now();
 if(!a||a.approved!==true||!/^[a-zA-Z0-9_-]{1,80}$/.test(a.id??''))throw new Error('Campaign owner approval required');
 if(!/^[a-f0-9]{40}$/.test(sourceCommit??'')||a.sourceCommit!==sourceCommit||!/^[a-f0-9]{64}$/.test(suiteSha256??'')||a.suiteSha256!==suiteSha256)throw new Error('Campaign source/suite mismatch');
 if(!/^nvidia\/[^\s]*nemotron[^\s]*$/i.test(a.model??''))throw new Error('Campaign NVIDIA model required');
 const diagnostic=a.responseContract==='preflight-then-diagnosis';
 if(a.responseContract!==undefined&&!['actions','preflight-then-diagnosis'].includes(a.responseContract))throw new Error('Campaign response contract invalid');
 if(!Number.isInteger(a.maxRequests)||a.maxRequests<1||a.maxRequests>100||!Number.isInteger(a.maxOutputTokens)||a.maxOutputTokens<1||a.maxOutputTokens>(diagnostic?2048:1024))throw new Error('Campaign invalid request/token limits');
 if(!Number.isFinite(a.spendLimitUsd)||a.spendLimitUsd<=0||a.spendLimitUsd>.50||![a.inputUsdPerMillion,a.outputUsdPerMillion].every(n=>Number.isFinite(n)&&n>0))throw new Error('Campaign invalid credit limit or prices');
 const approved=Date.parse(a.approvedAt),expires=Date.parse(a.expiresAt);
 if(!Number.isFinite(approved)||!Number.isFinite(expires)||approved>now+30000||approved<now-900000||expires<=now||expires>approved+3600000)throw new Error('Campaign approval expired or invalid');
 validateCreditEvidence(a.creditEvidence,{spendLimitUsd:a.spendLimitUsd});
 const firstCreated=await storage.mkdir(dirname(ledgerPath),{recursive:true});
 let handle;try{handle=await storage.open(ledgerPath,'wx',0o600);}catch{throw new Error('Campaign ledger already exists or cannot be created; no resume permitted');}
 const state={requestsReserved:0,reservedUsd:0,knownCostUsd:0,usageComplete:true,halted:false,closed:false};let busy=false;
 const append=async event=>{await handle.write(JSON.stringify({at:new Date().toISOString(),...event})+'\n');await handle.sync();};
 try{await append({event:'created',approvalId:a.id,authorizationSha256:createHash('sha256').update(JSON.stringify(a)).digest('hex'),sourceCommit,suiteSha256,maxRequests:a.maxRequests,spendLimitUsd:a.spendLimitUsd,maxOutputTokens:a.maxOutputTokens});
  // A file fsync alone cannot persist a newly created pathname. Persist the
  // ledger's directory, all newly created ancestors, and their existing parent.
  const last=firstCreated?dirname(resolve(firstCreated)):resolve(dirname(ledgerPath));
  let directory=resolve(dirname(ledgerPath));
  while(true){const parent=await storage.open(directory,'r');try{await parent.sync();}finally{await parent.close();}if(directory===last||dirname(directory)===directory)break;directory=dirname(directory);}
 }catch{await handle.close();throw new Error('Campaign ledger cannot be persisted');}
 return {
  status:()=>({...state}),
  async close(){if(busy)throw new Error('Campaign request in progress');if(!state.closed){state.closed=true;try{await append({event:'closed',...state});}finally{await handle.close();}}},
  async fetch(url,init){
   if(state.closed||state.halted)throw new Error('Nebius campaign halted or closed');
   if(busy)throw new Error('Nebius campaign concurrent request denied');
   let body;try{body=JSON.parse(init?.body);}catch{throw new Error('Nebius campaign invalid request');}
   if(url!==endpoint||init?.method!=='POST'||init.redirect!=='error'||body.model!==a.model||!Number.isInteger(body.max_tokens)||body.max_tokens<1||body.max_tokens>a.maxOutputTokens||body.stream===true||!Array.isArray(body.messages)||!body.messages.length||body.messages.some(m=>typeof m.content!=='string'))throw new Error('Nebius campaign request contract denied');
   if(diagnostic&&body.response_format?.json_schema?.name!==(state.requestsReserved===0?'synthetic_preflight':'grounded_diagnosis'))throw new Error('Nebius campaign phase contract denied');
   const inputAllowance=Buffer.byteLength(JSON.stringify(body.messages))+Buffer.byteLength(JSON.stringify(body.response_format??{}))+1024;
   if(inputAllowance>20000)throw new Error('Nebius campaign input allowance exceeded');
   const reservation=(inputAllowance*a.inputUsdPerMillion+body.max_tokens*a.outputUsdPerMillion)/1e6;
   if(state.requestsReserved>=a.maxRequests||state.reservedUsd+reservation>a.spendLimitUsd)throw new Error('Nebius campaign aggregate budget exhausted');
   if(Date.now()>=expires)throw new Error('Nebius campaign approval expired');
   validateCreditEvidence(a.creditEvidence,{spendLimitUsd:a.spendLimitUsd});
   busy=true;
   try{
    // Reserve and fsync BEFORE network. A crash, HTTP error or unknown usage does
    // not refund this allowance. Exclusive ledger creation prevents restart reset.
    state.requestsReserved++;state.reservedUsd+=reservation;
    await append({event:'reserved',request:state.requestsReserved,inputAllowance,outputLimit:body.max_tokens,reservationUsd:reservation});
    let response;const started=performance.now();
    try{response=await fetchImpl(url,init);}catch{state.halted=true;state.usageComplete=false;await append({event:'transport-failure',request:state.requestsReserved});throw new Error('Nebius campaign transport failed; halted');}
    if(response.status!==200){state.halted=true;state.usageComplete=false;await append({event:'http-failure',httpStatus:response.status,request:state.requestsReserved});return response;}
    let data;try{data=await response.clone().json();}catch{state.halted=true;state.usageComplete=false;await append({event:'invalid-envelope',request:state.requestsReserved});throw new Error('Nebius campaign invalid envelope; halted');}
    const u=data?.usage,known=u&&[u.prompt_tokens,u.completion_tokens,u.total_tokens].every(n=>Number.isSafeInteger(n)&&n>=0)&&u.total_tokens===u.prompt_tokens+u.completion_tokens;
    const cost=known?(u.prompt_tokens*a.inputUsdPerMillion+u.completion_tokens*a.outputUsdPerMillion)/1e6:null;
    if(!known||u.prompt_tokens>inputAllowance||u.completion_tokens>body.max_tokens||cost>reservation){state.halted=true;state.usageComplete=false;await append({event:'unknown-or-excess-usage',request:state.requestsReserved,estimatedCostUsd:cost});throw new Error('Nebius campaign usage unknown or excessive; halted');}
    state.knownCostUsd+=cost;
    const choice=Array.isArray(data.choices)?data.choices[0]:null;
    // Contract failures stop the campaign, even though this response is returned
    // once to the strict client so it can preserve normal sanitized diagnostics.
    let actionJsonValid=false;try{const decision=JSON.parse(choice?.message?.content);if(diagnostic&&state.requestsReserved>1){validateDiagnosis(decision,JSON.parse(body.messages.at(-1).content));actionJsonValid=true;}else actionJsonValid=Array.isArray(decision?.actions)&&decision.actions.length>0&&decision.actions.length<=6;}catch{}
    if(data.model!==a.model||!Array.isArray(data.choices)||data.choices.length!==1||choice?.finish_reason!=='stop'||choice?.message?.role!=='assistant'||choice?.message?.refusal||choice?.message?.tool_calls||!actionJsonValid)state.halted=true;
    await append({event:'response',request:state.requestsReserved,httpStatus:200,promptTokens:u.prompt_tokens,completionTokens:u.completion_tokens,totalTokens:u.total_tokens,estimatedCostUsd:cost,modelIdentityVerified:data.model===a.model,finishReason:['stop','length','content_filter'].includes(choice?.finish_reason)?choice.finish_reason:null,latencyMs:performance.now()-started,halted:state.halted});
    return response;
   }catch(error){state.halted=true;throw new Error(error.message.startsWith('Nebius campaign')?error.message:'Nebius campaign persistence failed; halted');}
   finally{busy=false;}
  }
 };
}
