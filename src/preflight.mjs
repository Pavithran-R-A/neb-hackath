import { validateCreditEvidence } from './credit-gate.mjs';
import { isDeepStrictEqual } from 'node:util';
import { createNemotronPolicy, endpoint, system } from './agents/nebius.mjs';
import { validateBatch } from './agents/actions.mjs';

const maxOutputTokens=256;
const input={
 task:{name:'Avery Example',email:'avery@example.invalid',phone:'5550101234',flow:'grant',detail:'Community garden',consent:true},
 observation:{text:'Synthetic preflight: enter the supplied full name and press Next. Only these two controls exist. This is not a completed application.',controls:[
  {id:0,tag:'input',type:'text',label:'Full name',placeholder:'Full name',value:'',disabled:false},
  {id:1,tag:'button',type:'submit',label:'Next',disabled:false}
 ]},history:[]
};
const expected={actions:[{type:'fill',target:0,value:input.task.name},{type:'click',target:1}]};

// Dry-run is the default, including when credentials are injected into the process.
// This function never executes browser actions or retries a provider request.
export async function preflight({apiKey=process.env.NEBIUS_API_KEY,model=process.env.NEBIUS_MODEL,live=false,approved=false,spendLimitUsd,inputUsdPerMillion,outputUsdPerMillion,creditEvidence,fetchImpl=fetch}={}){
 const credentials={apiKeyPresent:typeof apiKey==='string'&&apiKey.length>0,modelPresent:typeof model==='string'&&model.length>0,modelIsNemotron:typeof model==='string'&&/^nvidia\/[^\s]*nemotron[^\s]*$/i.test(model)};
 // Byte-length input estimate plus generous framing reserve. This is an estimate,
 // not a provider-enforced billing limit or a guarantee about future pricing.
 const estimatedInputTokenAllowance=Buffer.byteLength(system)+Buffer.byteLength(JSON.stringify(input))+1024;
 const validPrices=[inputUsdPerMillion,outputUsdPerMillion].every(rate=>Number.isFinite(rate)&&rate>0);
 const safetyEstimateUsd=validPrices?(estimatedInputTokenAllowance*inputUsdPerMillion+maxOutputTokens*outputUsdPerMillion)/1e6:null;
 const plan={destination:new URL(endpoint).hostname,maxRequests:1,maxOutputTokens,responseFormat:'json_object',automaticRetries:0,estimatedInputTokenAllowance,safetyEstimateUsd,costBasis:'Configured token-rate estimate, not a hard dollar cap or billing statement'};
 const base={mode:live?'live':'dry-run',credentials,request:plan,liveValidated:false,requestsSent:0};
 let billing={creditOnlyVerified:false};
 if(!live){
  try{billing=validateCreditEvidence(creditEvidence,{spendLimitUsd});}catch{}
  return {...base,billing,readyForApproval:credentials.apiKeyPresent&&credentials.modelIsNemotron&&validPrices&&billing.creditOnlyVerified&&Number.isFinite(spendLimitUsd)&&spendLimitUsd>0&&spendLimitUsd<=0.50&&safetyEstimateUsd<=spendLimitUsd,remaining:['Explicit owner approval and current credit-only billing evidence are required for live execution','Use current verified token prices and an approved spending limit','CLI cannot inspect platform network-secret scope; verify protected environment metadata separately']};
 }
 if(approved!==true)throw new Error('Explicit owner spending approval is required for live preflight');
 if(!Number.isFinite(spendLimitUsd)||spendLimitUsd<=0)throw new Error('A positive approved spending limit in USD is required');
 if(spendLimitUsd>0.50)throw new Error('Preflight safety ceiling is USD 0.50; separate owner approval is still required');
 if(!validPrices)throw new Error('Positive current input/output token prices are required');
 if(safetyEstimateUsd>spendLimitUsd)throw new Error('Preflight safety estimate exceeds the approved spending limit');
 billing=validateCreditEvidence(creditEvidence,{spendLimitUsd});
 base.billing=billing;
 const policy=createNemotronPolicy({apiKey,model,approved:true,maxCalls:1,maxOutputTokens,inputUsdPerMillion,outputUsdPerMillion,fetchImpl});
 const metrics=()=>{
  const m=policy.metrics();
  return {requestsSent:m.calls,usage:{promptTokens:m.promptTokens,completionTokens:m.completionTokens,totalTokens:m.totalTokens,complete:m.usageComplete},latencyMs:m.providerLatencyMs,estimatedModelCostUsd:m.estimatedModelCostUsd,costBasis:m.costBasis};
 };
 try{
  const decision=await policy.decide(input);
  validateBatch(decision,input.observation.controls,input.task);
  if(!isDeepStrictEqual(decision,expected))throw new Error('Nebius preflight action plan did not match the synthetic task');
  const m=policy.metrics();
  if(m.promptTokens<=0||m.completionTokens<=0)throw new Error('Nebius preflight usage must include positive input and output tokens');
  if(m.promptTokens>estimatedInputTokenAllowance||m.estimatedModelCostUsd>spendLimitUsd)throw new Error('Nebius usage exceeds the preflight safety estimate or approved limit');
  return {...base,...metrics(),liveValidated:true,authenticationVerified:true,modelIdentityVerified:true,jsonResponseVerified:true,actionSchemaVerified:true,browserTaskCompleted:false};
 }catch(error){
  // Never propagate raw model decisions, response bodies, credential or model values.
  const safe=new Error(error.message.startsWith('Nebius')?error.message:'Nebius preflight action schema rejected');
  safe.report={...base,...metrics()};throw safe;
 }
}
