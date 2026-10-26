import {diagnoseTelemetry} from './telemetry-baseline.mjs';
import {validateDiagnosis} from './contract.mjs';
const authoritative=e=>e.source==='server'||e.source==='verifier';
const negative=/\b(no|zero|0)\s+(unique\s+)?(committed|commit|submission|record)|not\s+(completed|committed)|missing\s+receipt/i;
const positiveText=e=>!/(validation|consent)\s+(passed|valid)|no\s+(error|failure)|not\s+(invalid|expired)/i.test(e.text);
function supports(d,e){
 const f=e.facts??{},t=e.text;
 if(d==='instruction_conflict')return ['task','browser','agent'].includes(e.source)&&/ignore|override|contradict|different|instead|untrusted|do not|must not/i.test(t);
 if(!authoritative(e))return false;
 switch(d){
  case 'validation':return positiveText(e)&&(f.httpStatus===422||/VALIDATION|FORMAT|INVALID_FIELD/.test(f.errorCode??'')||/format|invalid|required|must.*digits|rejected.*field/i.test(t));
  case 'consent_expired':return f.consentValid===false||/CONSENT_EXPIRED/.test(f.errorCode??'')||/consent.*(expired|invalid|reset|renew|not valid)/i.test(t);
  case 'temporary_failure':return (f.httpStatus>=500&&f.httpStatus<=599)||f.httpStatus===429||/TEMPORARY|SERVICE_UNAVAILABLE|RATE_LIMIT/.test(f.errorCode??'')||/temporary.*(error|failure)|temporarily unavailable|service unavailable|HTTP\s*50[234]/i.test(t);
  case 'option_unavailable':return /OPTION_UNAVAILABLE|SOLD_OUT/.test(f.errorCode??'')||/(option|session|slot|seat|choice).*(unavailable|not offered|full|not available)/i.test(t);
  case 'state_mismatch':return f.runMatches===false||f.receiptValid===false||/MISMATCH/.test(f.errorCode??'')||/mismatch|wrong run|different.*(task|run)|does not match/i.test(t);
  case 'authorization_denied':return [401,403].includes(f.httpStatus)||/AUTHORIZATION_DENIED|FORBIDDEN|UNAUTHORIZED/.test(f.errorCode??'')||/forbidden|unauthorized|access denied|permission denied/i.test(t);
  case 'unverified_claim':return f.commitCount===0||negative.test(t);
  case 'completed':return e.source==='verifier'&&(f.receiptValid===true&&f.runMatches===true&&f.commitCount===1);
  case 'ambiguous':return true;
  default:return false;
 }
}
const uncertaintyText=/\b(outcome|write|storage|commit|result)\b.{0,70}\b(unknown|uncertain|cannot|can't|not determined|undetermined)\b|\b(cannot|can't|unable to)\b.{0,70}\b(determine|tell|confirm)\b.{0,70}\b(whether|if)\b.{0,50}\b(saved|accepted|committed|succeeded|storage|write)\b|does not (?:indicate|say) whether (?:storage|the write|the request) was? (?:accepted|saved|committed)|says nothing about whether .{0,80}\b(write|storage|request|commit|submission)\b/i;
function unresolvedWriteOutcome(trace){
 if(trace.verification?.completed===true||trace.events.some(e=>e.source==='verifier'&&e.facts?.receiptValid===true&&e.facts?.runMatches===true&&e.facts?.commitCount===1))return false;
 const events=trace.events;
 for(let i=0;i<events.length;i++){
  const event=events[i];if(!authoritative(event))continue;const facts=event.facts??{},uncertain=facts.pending===true||uncertaintyText.test(event.text);
  if(!uncertain)continue;const operationId=facts.operationId;
  const later=events.slice(i+1).filter(e=>authoritative(e)&&((operationId&&e.facts?.operationId===operationId)||(!operationId&&!e.facts?.operationId)));
  const resolved=later.some(e=>e.facts?.pending===false&&(Number.isSafeInteger(e.facts?.commitCount)||typeof e.facts?.receiptValid==='boolean')&&!uncertaintyText.test(e.text));
  if(!resolved)return true;
 }
 return false;
}
// This is a conservative acceptance boundary, not a semantic truth oracle. Source
// facts must come from trusted application/verifier adapters, never model output.
export function acceptDiagnosis(rawSuggestion,trace,{allowedActions}={}){
 validateDiagnosis(rawSuggestion,trace,{allowUnverifiedCompletion:true});const reasons=[],cited=trace.events.filter(e=>rawSuggestion.evidenceIds.includes(e.id)),trusted=trace.events.filter(authoritative);
 const facts={};for(const e of trusted)Object.assign(facts,e.facts??{});
 const d=rawSuggestion.diagnosis,a=rawSuggestion.recovery.action;
 if(d!=='completed'&&d!=='ambiguous'&&(trace.verification?.completed===true||(facts.commitCount===1&&facts.receiptValid===true&&facts.runMatches===true)))reasons.push('Current independent completion supersedes historical failure evidence.');
 if(d==='completed'&&trace.verification?.completed!==true&&!cited.some(e=>supports('completed',e)))reasons.push('Completion lacks a current run-bound verified receipt.');
 else if(d!=='ambiguous'&&d!=='completed'&&!cited.some(e=>supports(d,e)))reasons.push('The cited authoritative evidence does not establish this diagnosis.');
 if(d==='instruction_conflict'&&!trace.events.some(e=>e.source==='task')&&!trace.task.goal)reasons.push('No trusted task constraint establishes an instruction conflict.');
 if(a==='retry'){
  if(!cited.some(e=>supports('temporary_failure',e)))reasons.push('Retry needs an explicitly cited authoritative transient error.');
  if(facts.pending===true||facts.retryAllowed===false||facts.commitCount>0||facts.runMatches===false||facts.receiptValid===false)reasons.push('Current authoritative state prohibits a safe repeat submission.');
  if(facts.commitCount!==0&&trace.verification?.completed!==false)reasons.push('No authoritative no-commit outcome is available; do not repeat an uncertain write.');
  if(facts.retryAllowed!==true&&!cited.some(e=>authoritative(e)&&/retry once|one retry|retry allowed/i.test(e.text)))reasons.push('Retry permission is not established by the application.');
 }
 if(a==='reconfirm_consent'&&!cited.some(e=>supports('consent_expired',e)))reasons.push('Expired consent is not established by the cited server evidence.');
 if(a==='correct_format'&&!cited.some(e=>supports('validation',e)))reasons.push('A repairable formatting error is not established.');
 if(a==='choose_supplied_option'&&!trace.task.values)reasons.push('No supplied alternative is present in the retained task; manual review required.');
 if(a==='restart')reasons.push('Restart may discard state and requires additional review; no automatic endorsement.');
 if(a==='wait'&&facts.pending!==true&&!cited.some(e=>supports('temporary_failure',e)))reasons.push('A pending operation or transient condition supporting wait is not established.');
 if(allowedActions&&!['stop','none','wait'].includes(a)&&!allowedActions.includes(a))reasons.push('Independent private state does not permit the recommended recovery.');
 let reviewRequired=false,independentReview,reviewReason;
 if(!reasons.length&&unresolvedWriteOutcome(trace)){reviewRequired=true;reviewReason='Authoritative write outcome remains pending or unknown; inspect status before treating this advice as resolved.';}
 if(!reasons.length&&rawSuggestion.confidence==='high'&&!allowedActions?.includes(a)){
  const peer=diagnoseTelemetry(trace);independentReview={diagnosis:peer.diagnosis,action:peer.recovery.action,confidence:peer.confidence};
  if(peer.diagnosis!==d||peer.recovery.action!==a){reviewRequired=true;reasons.push('Independent telemetry interpretation disagrees with the high-confidence model advice; additional source review is required.');}
 }
 const rejected=reasons.length>0;
 const suggestion=rejected?{diagnosis:'ambiguous',explanation:'ReceiptLab abstained: the model recommendation is not sufficiently supported by authoritative evidence. Inspect the retained trace and request review.',evidenceIds:rawSuggestion.evidenceIds,recovery:{action:'stop',reason:'No recovery is approved by this diagnostic assessment. Independent verification and additional review are required.'},confidence:'low'}:structuredClone(rawSuggestion);
 validateDiagnosis(suggestion,trace);
 return {suggestion,rawSuggestion:structuredClone(rawSuggestion),semanticAssessment:{status:reviewRequired?'review-required':rejected?'abstained':'accepted',...(independentReview?{independentReview}:{}),reasons:reviewReason?[...reasons,reviewReason]:reasons,rawHighConfidenceRejected:rejected&&rawSuggestion.confidence==='high',scope:'Conservative support checks, not semantic certification; private action guard and verifier remain authoritative'}};
}
