import {createDiagnosticPolicy} from '../diagnosis/nebius.mjs';import {endpoint} from '../agents/nebius.mjs';
// Each per-request wrapper has one persistent reservation and one POST; no retry.
export function createJudgeController({budget,apiKey,model,fetchImpl=fetch,checkPrices=async()=>{throw Error('Fresh catalog check required');}}){
 const plan=budget.plan;if(model!==plan.model||!apiKey)throw Error('Judge model/credential mismatch');
 return {postgresDurableBudget:Boolean(budget.postgresDurableBudget),authorize:(session,code)=>budget.authorize(session,code),authorized:session=>budget.authorized(session),summary:()=>budget.summary(),
 policyFor({sessionId,runId,scenarioId}){return {async diagnose(trace){
  let reservation,admissionDenied;
  try{
   const rates=await checkPrices();if(rates.inputUsdPerMillion!==plan.inputUsdPerMillion||rates.outputUsdPerMillion!==plan.outputUsdPerMillion)throw Error('Judge catalog price drift');
   const policy=createDiagnosticPolicy({apiKey,model,approved:true,temperature:1,topP:1,maxOutputTokens:plan.maxOutputTokens,inputUsdPerMillion:plan.inputUsdPerMillion,outputUsdPerMillion:plan.outputUsdPerMillion,fetchImpl:async(url,init)=>{
    const body=JSON.parse(init.body);if(reservation||url!==endpoint||init.method!=='POST'||init.redirect!=='error'||body.model!==plan.model||body.response_format?.json_schema?.name!=='grounded_diagnosis')throw Error('Judge request contract denied');
    const inputAllowance=Buffer.byteLength(JSON.stringify(body.messages))+Buffer.byteLength(JSON.stringify(body.response_format))+1024;
    try{reservation=await budget.reserve({sessionId,runId,scenarioId,inputAllowance,outputLimit:body.max_tokens});}catch(error){admissionDenied=true;throw error;}
    const response=await fetchImpl(url,init);if(response.status===200){let data;try{data=await response.clone().json();}catch{throw Error('Judge provider envelope invalid');}const u=data.usage;if(!u||u.total_tokens!==u.prompt_tokens+u.completion_tokens)throw Error('Judge usage inconsistent');await budget.settle(reservation,{inputTokens:u.prompt_tokens,outputTokens:u.completion_tokens});}return response;
   }});const result=await policy.diagnose(trace);await budget.finalize(reservation);return result;
  }catch(error){if(reservation)await budget.halt();if(admissionDenied)throw Object.assign(new Error('Judge inference admission closed: quota, expiry, access or operator review required'),{code:'JUDGE_ADMISSION_DENIED'});throw error;}
 } };},close:()=>budget.close()};
}
