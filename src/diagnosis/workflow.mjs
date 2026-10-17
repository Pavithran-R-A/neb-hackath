import {acceptDiagnosis} from './acceptance.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {verifyCompletion} from '../verification.mjs';
import {diagnoseDeterministic} from './baseline.mjs';
import {validateDiagnosis} from './contract.mjs';
export const traceDigest=trace=>createHash('sha256').update(JSON.stringify(trace)).digest('hex');
export function workflowTrace(run,app){
 const record=app.readRecord(run.id),verification=verifyCompletion(record,run.task,app.key,{runId:run.id});
 const events=structuredClone(record?.journal??[]);
 if(record?.displaySuccess)events.push({id:'ui-claim',source:'browser',kind:'completion-claim',text:'Application received. Your fictional application is complete.'});
 if(record)events.push({id:'state-facts',source:'verifier',kind:'state',text:'Private state observed for the intended current run; intermediate progress is not a commit.',facts:{commitCount:record.completionCount,pending:false,runMatches:true,...(verification.completed?{receiptValid:true}:{}),retryAllowed:executableRecovery('retry',run,app)}});
 events.push({id:'verdict',source:'verifier',kind:'independent-verdict',text:verification.reason});
 return {id:run.id,task:{goal:'Complete the fictional '+run.task.flow+' using the supplied synthetic task data, preserving consent and allowed choices.',protocol:'Events are chronological. Intermediate step acceptance validates draft fields and advances the form; it does not commit a submission. Intermediate progress followed by a submission error and an incomplete verifier result are compatible. Only a unique completed server submission with matching signed receipt proves completion. A temporary submission error with no commit permits one retry with unchanged supplied data and consent. Application received UI text alone never proves a commit.'},events:events.slice(-38),verification:{completed:verification.completed,reason:verification.reason}};
}
export function executableRecovery(action,run,app){
 const r=app.readRecord(run.id);
 if(!r||r.status==='completed'||r.displaySuccess)return false;
 if(action==='retry')return r.step===2&&r.errors.some(e=>/Temporary submission error/.test(e))&&run.task.consent===true;
 if(action==='reconfirm_consent')return r.step===2&&r.errors.some(e=>/Consent expired/.test(e))&&run.task.consent===true;
 if(action==='correct_format')return r.step===0&&r.errors.some(e=>/XXX-XXX-XXXX/.test(e))&&/^\d{10}$/.test(run.task.phone);
 return false;
}
export async function diagnoseWorkflow({run,app,mode,policy,executionKind='live-nebius'}){
 const trace=workflowTrace(run,app);let output;
 if(mode==='deterministic')output={suggestion:diagnoseDeterministic(trace),modelValidated:false,executionKind:'deterministic',estimatedCostUsd:0};
 else if(mode==='nemotron'&&policy)output={...await policy.diagnose(trace),executionKind};
 else throw new Error('Model inactive or diagnosis mode invalid');
 validateDiagnosis(output.suggestion,trace);
 const accepted=acceptDiagnosis(output.suggestion,trace,{allowedActions:['retry','reconfirm_consent','correct_format'].filter(a=>executableRecovery(a,run,app))});
 const result={...output,...accepted,id:randomUUID(),traceDigest:traceDigest(trace),trace,verifiedOutcome:trace.verification.completed,requiresHumanApproval:true,recoveryExecutable:accepted.semanticAssessment.status==='accepted'&&executableRecovery(accepted.suggestion.recovery.action,run,app)};
 run.diagnoses??=[];if(run.diagnoses.length>=8)throw new Error('Run diagnosis limit reached');
 run.diagnoses.push(result);return result;
}
export async function recoverWorkflow({run,app,body}){
 const diagnosis=run.diagnoses?.find(d=>d.id===body.diagnosisId);
 if(!diagnosis||diagnosis.used||run.recovering||body.traceDigest!==diagnosis.traceDigest||traceDigest(workflowTrace(run,app))!==diagnosis.traceDigest||!executableRecovery(diagnosis.suggestion.recovery.action,run,app))throw new Error('Recovery unavailable, stale or already used');
 run.recovering=true;diagnosis.used=true;
 try{
  const record=app.readRecord(run.id),action=diagnosis.suggestion.recovery.action;
  const values=action==='correct_format'?{...run.task,phone:run.task.phone.replace(/^(\d{3})(\d{3})(\d{4})$/,'$1-$2-$3')}:{consent:run.task.consent};
  const response=await fetch(app.origin+'/api/runs/'+run.id,{method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),headers:{'content-type':'application/json'},body:JSON.stringify({step:record.step,values})});
  const verification=verifyCompletion(app.readRecord(run.id),run.task,app.key,{runId:run.id});
  const result={diagnosisId:diagnosis.id,action,humanApproved:true,beforeTraceDigest:diagnosis.traceDigest,afterTraceDigest:traceDigest(workflowTrace(run,app)),httpStatus:response.status,verification,claimedCompletion:false};
  run.recoveryHistory??=[];run.recoveryHistory.push(result);return result;
 }finally{run.recovering=false;}
}
