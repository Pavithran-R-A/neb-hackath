export function validateExperiment(a,cases){
 if(!a||!['config-probes-v1','diagnosis-v2','diagnosis-v1-remaining'].includes(a.suiteId)||!/^nvidia\/[^\s]*nemotron[^\s]*$/i.test(a.model??'')||a.responseContract!=='preflight-then-diagnosis')throw new Error('Experiment model/suite/contract invalid');
 if(JSON.stringify(a.caseIds)!==JSON.stringify(cases.map(t=>t.id))||a.maxRequests!==cases.length+1||a.maxRequests>17||!Number.isInteger(a.maxOutputTokens)||a.maxOutputTokens<1||a.maxOutputTokens>8192||!Number.isFinite(a.spendLimitUsd)||a.spendLimitUsd<=0||a.spendLimitUsd>.50)throw new Error('Experiment scope invalid');
 const s=a.diagnosticSampling;if(!s||Object.keys(s).sort().join(',')!=='temperature,top_p'||!Number.isFinite(s.temperature)||s.temperature<0||s.temperature>2||!Number.isFinite(s.top_p)||s.top_p<=0||s.top_p>1)throw new Error('Experiment supported sampling required');
 return a;
}
