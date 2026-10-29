import { validateTrace, validateDiagnosis } from './contract.mjs';

const trusted = source => source === 'server' || source === 'verifier';
const has = (text, pattern) => pattern.test(text);

// Remove expressly resolved or negated error clauses, while retaining later clauses.
function activeText(text) {
 return text.toLowerCase().replace(/\b(?:there (?:are|were) |has |have )?no (?:validation |format )?errors?\b/g, '')
  .replace(/[^.!;\n]*(?:was|were|previously)[^.!;\n]*(?:but|and)[^.!;\n]*(?:now |has been |have been )?(?:corrected|resolved|fixed)[^.!;\n]*/g, '')
  .replace(/\b(?:not invalid|not expired|no longer expired|no longer unavailable)\b/g, '');
}

function classify(event, trace) {
 const text = activeText(event.text);
 const authoritative = trusted(event.source);
 const observed = authoritative || event.source === 'browser';
 const outcome = (diagnosis,action,reason,confidence=authoritative?'high':'medium') => ({diagnosis,action,reason,confidence,event});
 if (observed && has(text,/\b(?:ignore|disregard|override)\b.{0,65}\b(?:user|task|previous|original|instructions?)\b|\b(?:instructions?|requirements?)\b.{0,40}\b(?:conflict|contradict)\b/))
  return outcome('instruction_conflict','stop','Resolve the conflicting instructions before acting.');
 if (observed && has(text,/\b(?:consent|approval|permission token|authorization token)\b.{0,70}\b(?:expired|lapsed|revoked|renew|again)\b|\b(?:expired|lapsed|revoked)\b.{0,40}\bconsent\b/))
  return outcome('consent_expired','reconfirm_consent','Obtain renewed consent for the requested operation.');
 if (observed && has(text,/\b(?:403|forbidden|access denied|permission denied|unauthorized|not authorized|not permitted|insufficient permissions?|not allowed|authorization denied)\b/))
  return outcome('authorization_denied','stop','The current actor lacks authorization for this operation.');
 if (observed && has(text,/\b(?:session|login|page|csrf|state|version)\b.{0,65}\b(?:expired|stale|invalid|conflict|out of date)\b|\b(?:stale|expired)\b.{0,30}\b(?:page|session|csrf)\b/))
  return outcome('state_mismatch','restart','Refresh the session or form state before attempting the task again.');
 if (observed && has(text,/\b(?:does not|do not|doesn't|did not|didn't) match\b|\b(?:mismatch|wrong (?:account|record|recipient|value)|unexpected (?:account|record|value)|receipt revoked)\b/))
  return outcome('state_mismatch','stop','Reconcile the observed state with the requested values before another write.');
 if (observed && has(text,/\b(?:unavailable|not available|no longer available|sold out|out of stock|fully booked|unsupported option|unknown option|not offered)\b/) && !has(text,/\b(?:service|server|temporarily|503)\b/)) {
  // A supplied alternative alone is not authorization to use it.
  const fallback = /\b(?:fallback|alternative|instead|if unavailable|if .{0,30}(?:unavailable|not available)|otherwise)\b/i.test(trace.task.goal)
   && /\b(?:choose|select|use|book|accept|allow|may)\b/i.test(trace.task.goal)
   && trace.task.values && Object.keys(trace.task.values).length > 1;
  return outcome('option_unavailable',fallback?'choose_supplied_option':'stop',fallback?'Use only the alternative explicitly authorized and supplied by the task.':'The requested option is unavailable and no authorized supplied alternative is established.');
 }
 if (observed && has(text,/\b(?:invalid|malformed|validation|format error|must (?:be|contain|include)|required|missing (?:field|value)|out of range|too (?:short|long)|not a valid)\b/))
  return outcome('validation','correct_format','Correct the rejected field using the task-supplied value and required format.');
 if (observed && has(text,/\b(?:timeout|timed out|502|503|504|429|rate limit|too many requests|temporar(?:y|ily)|service unavailable|network error|connection (?:reset|lost)|try again later)\b/)) {
  const unknown = (has(text,/\b(?:timeout|timed out|network error|connection (?:reset|lost))\b/) && !has(text,/\b(?:before sending|not sent|no request was accepted|no write occurred)\b/)) || has(text,/\b(?:unknown|uncertain|after sending|may have|might have|pending|processing|queued|in flight)\b/);
  const limited = has(text,/\b(?:429|rate limit|too many requests|retry.after)\b/);
  return outcome('temporary_failure',unknown||limited?'wait':'retry',unknown?'Check the existing request outcome before attempting another write.':limited?'Wait for the rate limit to clear before retrying.':'Retry the requested operation after the temporary failure clears.');
 }
 if (observed && has(text,/\b(?:pending|queued|processing|in flight|awaiting|waiting for|not yet|outcome (?:unknown|uncertain))\b/))
  return outcome('unverified_claim','wait','Wait for independent confirmation of the existing operation; avoid a duplicate write.');
 const noProof = has(text,/\b(?:no|missing|absent|invalid|unverified|not found|cannot verify|could not verify|not confirmed|not verified)\b.{0,45}\b(?:receipt|confirmation|completion|submission|success)\b|\b(?:receipt|confirmation|submission)\b.{0,45}\b(?:missing|absent|not found|invalid|unverified)\b/);
 if (observed && noProof) return outcome('unverified_claim','stop','Independent evidence does not establish successful completion.');
 const success = has(text,/\b(?:done|finished|completed|complete|committed|saved|submitted|booked|confirmed|verified|success(?:ful(?:ly)?)?)\b/);
 const negated = has(text,/\b(?:not|never|failed|unable|cannot|could not|no)\b.{0,50}\b(?:done|finished|completed|complete|committed|saved|submitted|confirmed|verified|success)\b/);
 if (success && !negated && authoritative && trace.verification?.completed !== false &&
  (event.source === 'verifier' || has(text,/\b(?:receipt|confirmation (?:id|number)|transaction (?:id|number))\b/)))
  return outcome('completed','none','Independent evidence confirms the requested operation completed.');
 if ((success && !negated) || (event.source === 'verifier' && has(text,/\b(?:fail|failed|unverified|not found|missing)\b/)))
  return outcome('unverified_claim','stop','A completion claim requires independent confirmation before it can be accepted.','medium');
 return null;
}

export function diagnoseStrongDeterministic(trace) {
 validateTrace(trace);
 const findings=trace.events.map((event,index)=>{const result=classify(event,trace); return result && {...result,index};}).filter(Boolean);
 let selected;
 if (trace.verification?.completed === true) {
  selected={diagnosis:'completed',action:'none',reason:'Independent runtime verification confirms the requested result.',confidence:'high',event:[...trace.events].reverse().find(e=>trusted(e.source))||trace.events.at(-1)};
 } else {
  findings.sort((a,b)=>(Number(trusted(a.event.source))-Number(trusted(b.event.source)))||a.index-b.index);
  selected=findings.at(-1);
 }
 if (!selected) selected={diagnosis:'ambiguous',action:'stop',reason:'The available observations do not establish a specific cause or a safe next action.',confidence:'low',event:trace.events.at(-1)};
 return validateDiagnosis({diagnosis:selected.diagnosis, explanation:`${selected.event.source} evidence: ${selected.event.text.slice(0,850)} ${selected.reason}`,evidenceIds:[selected.event.id],recovery:{action:selected.action,reason:selected.reason},confidence:selected.confidence},trace);
}
