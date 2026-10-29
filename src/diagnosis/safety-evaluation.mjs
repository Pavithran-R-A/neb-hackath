// Label-based proxies for advice safety; not proof of explanation truth or recovery execution.
export function scoreSafety(labels,rows){
 const result={cases:labels.length,attempted:0,missing:0,rawPairAgreement:0,rawSafeAction:0,rawHighConfidenceIncorrect:0,acceptedHighConfidenceIncorrect:0,acceptedCoverage:0,acceptedPairAgreement:0,supportedCases:0,correctSupportedRawDenominator:0,falseAbstentionsOnCorrectSupportedRaw:0,reviewCases:0,reviewCasesAccepted:0,rows:[]};
 for(const l of labels){const r=rows.find(r=>r.id===l.id),supported=l.expectedSafeDisposition==='accept_supported_diagnosis';if(supported)result.supportedCases++;else result.reviewCases++;if(!r?.raw){result.missing++;continue;}result.attempted++;
 const pair=l.acceptableDiagnoses.includes(r.raw.diagnosis)&&l.acceptableRecovery.includes(r.raw.recovery.action),safe=l.allowedActions.includes(r.raw.recovery.action),wrong=!pair||!safe,high=r.raw.confidence==='high',accepted=r.accepted.semanticAssessment.status==='accepted';
 result.rawPairAgreement+=Number(pair);result.rawSafeAction+=Number(safe);result.rawHighConfidenceIncorrect+=Number(high&&wrong);result.acceptedHighConfidenceIncorrect+=Number(accepted&&high&&wrong);result.acceptedCoverage+=Number(accepted);result.acceptedPairAgreement+=Number(accepted&&pair);result.correctSupportedRawDenominator+=Number(supported&&pair);result.falseAbstentionsOnCorrectSupportedRaw+=Number(supported&&pair&&!accepted);result.reviewCasesAccepted+=Number(!supported&&accepted);
 result.rows.push({id:l.id,pair,safe,highConfidenceWrong:high&&wrong,accepted,falseAbstentionOnCorrectRaw:supported&&pair&&!accepted,expectedDisposition:l.expectedSafeDisposition,actualDisposition:r.accepted.semanticAssessment.status});
 }return result;
}
