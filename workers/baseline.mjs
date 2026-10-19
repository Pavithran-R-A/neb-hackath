import {validateTrace,validateDiagnosis} from './contract.mjs';
// Frozen general rules, developed without reading independent evaluation cases.
// Both policies receive identical source-tagged events and verifier outcomes.
export function diagnoseDeterministic(trace){
 validateTrace(trace);
 const trusted=trace.events.filter(e=>['server','verifier'].includes(e.source));
 const find=re=>[...trusted].reverse().find(e=>re.test(e.text));
 const answer=(diagnosis,action,event,explanation,reason,confidence='high')=>validateDiagnosis({diagnosis,explanation,evidenceIds:[event.id],recovery:{action,reason},confidence},trace);
 const last=trace.events.at(-1);
 const visibleVerifier=[...trace.events].reverse().find(e=>e.source==='verifier');
 const visibleVerified=!trace.verification&&visibleVerifier&&/verified completion|completion verified|task.*verified|verified.*task/i.test(visibleVerifier.text)&&!/(?:not|no |unverified|mismatch|stale|fail|wrong)/i.test(visibleVerifier.text);
 if(trace.verification?.completed||visibleVerified)return answer('completed','none',trace.events.find(e=>e.source==='verifier')??last,'The independent verifier confirms the task was completed.','No recovery is necessary.');
 const mismatch=/mismatch|wrong (?:saved|stored|task|run)|invalid (?:receipt|signature)|digest.*differ|receipt.*(?:another|stale)|duplicate.*(?:commit|submission)/i;
 const mismatchEvent=find(mismatch);
 if(mismatch.test(trace.verification?.reason??'')||mismatchEvent)return answer('state_mismatch','stop',mismatchEvent??last,'The expected task/run and saved receipt state do not agree.','Stop and inspect the state; do not claim completion or repeat a possibly committed action.');
 const denied=find(/\b(?:401|403|forbidden|unauthori[sz]ed|access denied|permission denied)\b/i);
 if(denied)return answer('authorization_denied','stop',denied,'The server denied authorization.','Stop; never bypass access control or substitute credentials.');
 const unavailable=find(/(?:session|option|choice|slot).*(?:unavailable|sold out|not available|no longer)|(?:unavailable|sold out).*(?:session|option|slot)/i);
 if(unavailable)return answer('option_unavailable','stop',unavailable,'The requested option cannot be selected as supplied.','Do not choose an unapproved substitute; ask the task owner to revise the request.');
 const consent=find(/consent.*(?:expired|reset|again)|confirm consent again/i);
 if(consent)return answer('consent_expired','reconfirm_consent',consent,'The application requires consent to be confirmed again.','Only reconfirm the task owner’s already supplied synthetic consent.');
 const validation=find(/format|valid (?:email|address|phone)|required|must contain|validation|unprocessable|\b422\b/i);
 if(validation){const format=/format|XXX-XXX-XXXX/i.test(validation.text);return answer('validation',format?'correct_format':'stop',validation,'Server validation rejected the supplied field representation.',format?'Reformat the supplied value only; never invent replacement task data.':'Stop if the supplied task data is invalid; obtain a corrected task rather than inventing data.');}
 const transient=find(/temporar|retry|try again|\b(?:429|500|502|503|504)\b|timed? ?out|connection reset/i);
 if(transient)return answer('temporary_failure','retry',transient,'The application reports a temporary failure rather than a verified completion.','Retry only after checking current state and explicit human approval.');
 const conflict=trace.events.find(e=>['browser','agent'].includes(e.source)&&/ignore.*(?:task|instruction)|(?:skip|bypass).*(?:consent|verif)|exfiltrat|send.*(?:external|collect)|different.*@|claim.*success.*without/i.test(e.text));
 if(conflict)return answer('instruction_conflict','stop',conflict,'Untrusted interface or agent instructions conflict with the supplied task or verification boundary.','Stop rather than follow conflicting instructions or disclose data.');
 const claim=trace.events.find(e=>['browser','agent'].includes(e.source)&&/\b(?:received|success|complete|completed|done)\b/i.test(e.text));
 if(claim)return answer('unverified_claim','stop',claim,'A completion claim exists, but the independent verifier has not confirmed completion.','Stop and inspect authoritative state; avoid a duplicate submission.');
 return answer('ambiguous','stop',last,'The retained observations do not establish a reliable failure cause.','Stop safely and obtain missing authoritative evidence.','low');
}
