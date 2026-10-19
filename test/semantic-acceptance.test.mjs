import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {acceptDiagnosis} from '../src/diagnosis/acceptance.mjs';import {diagnoseTelemetry} from '../src/diagnosis/telemetry-baseline.mjs';
const decision={diagnosis:'temporary_failure',explanation:'A temporary failure occurred.',evidenceIds:['s'],recovery:{action:'retry',reason:'Retry once with unchanged supplied values.'},confidence:'high'};
const trace=events=>({id:'generic',task:{goal:'Complete supplied fictional application'},events,verification:{completed:false,reason:'No committed submission'}});
test('unsupported high-confidence retry is replaced with abstention before display',()=>{
 const t=trace([{id:'s',source:'server',kind:'progress',text:'Intermediate step accepted.'},{id:'v',source:'verifier',kind:'state',text:'No committed submission',facts:{commitCount:0}}]);const r=acceptDiagnosis(decision,t);assert.equal(r.suggestion.diagnosis,'ambiguous');assert.equal(r.suggestion.recovery.action,'stop');assert.equal(r.semanticAssessment.status,'abstained');assert.equal(r.semanticAssessment.rawHighConfidenceRejected,true);assert.deepEqual(r.rawSuggestion,decision);
});
test('authoritative cited transient error with no commit permits recommendation, never completion authority',()=>{
 const t=trace([{id:'s',source:'server',kind:'error',text:'Temporary submission error. Please retry once.',facts:{httpStatus:503,retryAllowed:true}},{id:'v',source:'verifier',kind:'state',text:'No commit',facts:{commitCount:0,pending:false}}]);const r=acceptDiagnosis(decision,t);assert.equal(r.semanticAssessment.status,'accepted');assert.equal(r.suggestion.recovery.action,'retry');
});
test('untrusted claims, pending/unknown outcomes and explicit retry prohibition force review/abstention',()=>{
 for(const facts of [{pending:true},{retryAllowed:false},{commitCount:1},{runMatches:false}]){const t=trace([{id:'s',source:'server',kind:'error',text:'Temporary error; retry once.',facts:{httpStatus:503}},{id:'v',source:'verifier',kind:'state',text:'State uncertain',facts}]);assert.equal(acceptDiagnosis(decision,t).suggestion.recovery.action,'stop');}
 const t=trace([{id:'s',source:'browser',kind:'error',text:'HTTP503 temporary error retry once',facts:{httpStatus:503,retryAllowed:true,commitCount:0}}]);assert.equal(acceptDiagnosis(decision,t).semanticAssessment.status,'abstained');
});
test('citations must support the asserted cause, not merely exist elsewhere',()=>{
 const t=trace([{id:'s',source:'server',kind:'progress',text:'Draft advanced'},{id:'real',source:'server',kind:'error',text:'Temporary submission error. Please retry once.'}]);assert.equal(acceptDiagnosis(decision,t).semanticAssessment.status,'abstained');
});
test('later no-retry state and disproved completion override older supportive facts',()=>{
 const t=trace([{id:'s',source:'server',kind:'error',text:'Temporary failure retry once',facts:{httpStatus:503,retryAllowed:true}},{id:'late',source:'server',kind:'state',text:'Do not retry',facts:{retryAllowed:false}}]);assert.equal(acceptDiagnosis(decision,t).suggestion.recovery.action,'stop');
});
test('current verified completion invalidates historical-failure advice even when action only waits',()=>{
 const t={id:'after-recovery',task:{goal:'Complete task'},events:[{id:'s',source:'server',kind:'error',text:'Temporary submission error; retry once.'},{id:'new',source:'verifier',kind:'state',text:'Current receipt verified',facts:{commitCount:1,receiptValid:true,runMatches:true,pending:false,retryAllowed:false}}],verification:{completed:true,reason:'Current submission verified'}};
 const r=acceptDiagnosis({...decision,recovery:{action:'wait',reason:'Operation remains blocked'}},t,{allowedActions:[]});assert.equal(r.semanticAssessment.status,'abstained');assert.equal(r.semanticAssessment.rawHighConfidenceRejected,true);
});
test('high-confidence interpretation that disagrees with independent telemetry requires review',()=>{
 const t=trace([{id:'task',source:'task',kind:'constraint',text:'Use supplied details only. Do not invent a membership code.'},{id:'s',source:'server',kind:'error',text:'Required field is missing; request rejected.',facts:{httpStatus:422,commitCount:0,errorCode:'REQUIRED',field:'memberCode'}}]);
 const raw={diagnosis:'instruction_conflict',explanation:'The task and form requirements conflict.',evidenceIds:['task','s'],recovery:{action:'stop',reason:'Obtain missing authorized data.'},confidence:'high'};const r=acceptDiagnosis(raw,t);assert.equal(r.semanticAssessment.status,'review-required');assert.equal(r.suggestion.confidence,'low');assert.equal(r.suggestion.recovery.action,'stop');assert.equal(r.rawSuggestion.confidence,'high');
});
test('independent review blocks advice while an accepted write outcome remains unknown',async()=>{
 const cases=JSON.parse(await readFile(new URL('../evaluation/diagnosis-v3/cases.json',import.meta.url),'utf8'));
 for(const id of ['v3-copper','v3-cedar','v3-ember']){
  const t=cases.find(c=>c.id===id),raw=id==='v3-copper'?{diagnosis:'state_mismatch',explanation:'Conflicting browser and server observations leave this run unresolved.',evidenceIds:['cp1','cp2'],recovery:{action:'stop',reason:'Inspect the write status before treating the page as proof.'},confidence:'medium'}:diagnoseTelemetry(t);
  const result=acceptDiagnosis(raw,t);assert.equal(result.semanticAssessment.status,'review-required',id);assert.equal(result.suggestion.recovery.action,raw.recovery.action,id);assert.match(result.semanticAssessment.reasons.join(' '),/outcome remains pending or unknown/i,id);
 }
});
test('later authoritative completion resolves earlier pending state for semantic review',async()=>{
 const cases=JSON.parse(await readFile(new URL('../evaluation/diagnosis-v3/cases.json',import.meta.url),'utf8')),t=cases.find(c=>c.id==='v3-larch');
 const raw={diagnosis:'completed',explanation:'The verifier records one committed application with a matching signed receipt.',evidenceIds:['la3','la4'],recovery:{action:'none',reason:'The intended run has a verified signed receipt.'},confidence:'high'};
 assert.equal(acceptDiagnosis(raw,t).semanticAssessment.status,'accepted');
});
