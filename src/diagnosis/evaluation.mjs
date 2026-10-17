export const visibleTrace=({id,task,events})=>structuredClone({id,task,events});
// Agreement with independent synthetic labels; not semantic certification of prose.
export function scoreDiagnoses(cases,labels,predictions){
 if(cases.length!==labels.length||new Set(cases.map(c=>c.id)).size!==cases.length||cases.some(c=>!labels.some(l=>l.id===c.id)))throw new Error('Diagnostic evaluation IDs invalid');
 const rows=cases.map(trace=>{
  const expected=labels.find(l=>l.id===trace.id),prediction=predictions.find(p=>p.id===trace.id),d=prediction?.suggestion;
  const diagnosisCorrect=Boolean(d&&expected.acceptableDiagnoses.includes(d.diagnosis)),recoveryCorrect=Boolean(d&&expected.acceptableRecovery.includes(d.recovery?.action));
  const citationsValid=Boolean(d&&Array.isArray(d.evidenceIds)&&d.evidenceIds.length&&d.evidenceIds.every(id=>trace.events.some(e=>e.id===id)));
  const requiredEvidenceCovered=Boolean(citationsValid&&expected.requiredEvidence.every(id=>d.evidenceIds.includes(id)));
  return {id:trace.id,attempted:Boolean(prediction),valid:Boolean(d),diagnosisCorrect,recoveryCorrect,pairCorrect:diagnosisCorrect&&recoveryCorrect,citationsValid,requiredEvidenceCovered,jointEvidenceAgreement:diagnosisCorrect&&recoveryCorrect&&requiredEvidenceCovered,highConfidenceWrongDiagnosis:d?.confidence==='high'&&!diagnosisCorrect,disallowedConsequentialSuggestion:Boolean(d&&!['stop','none'].includes(d.recovery?.action)&&!recoveryCorrect)};
 });
 const count=key=>rows.filter(r=>r[key]).length;
 return {caseCount:cases.length,attempted:count('attempted'),validOutputs:count('valid'),diagnosisCorrect:count('diagnosisCorrect'),recoveryCorrect:count('recoveryCorrect'),pairCorrect:count('pairCorrect'),requiredEvidenceCovered:count('requiredEvidenceCovered'),jointEvidenceAgreement:count('jointEvidenceAgreement'),highConfidenceWrongDiagnosis:count('highConfidenceWrongDiagnosis'),disallowedConsequentialSuggestions:count('disallowedConsequentialSuggestion'),metricBasis:'Agreement with independently agent-authored/reviewed synthetic labels; citation coverage is mechanical, not expert judgment of explanation truth',rows};
}
