export const diagnoses=['validation','consent_expired','temporary_failure','option_unavailable','state_mismatch','unverified_claim','instruction_conflict','authorization_denied','ambiguous','completed'];
export const recoveries=['retry','correct_format','reconfirm_consent','restart','choose_supplied_option','wait','stop','none'];
export const diagnosisSchema={type:'object',additionalProperties:false,required:['diagnosis','explanation','evidenceIds','recovery','confidence'],properties:{
 diagnosis:{type:'string',enum:diagnoses},explanation:{type:'string',minLength:1,maxLength:1200},
 evidenceIds:{type:'array',minItems:1,maxItems:6,uniqueItems:true,items:{type:'string'}},
 recovery:{type:'object',additionalProperties:false,required:['action','reason'],properties:{action:{type:'string',enum:recoveries},reason:{type:'string',minLength:1,maxLength:400}}},
 confidence:{type:'string',enum:['high','medium','low']}
}};
const allowed={validation:['correct_format','stop'],consent_expired:['reconfirm_consent','stop'],temporary_failure:['retry','wait','stop'],option_unavailable:['stop','choose_supplied_option'],state_mismatch:['stop','restart'],unverified_claim:['stop','wait'],instruction_conflict:['stop'],authorization_denied:['stop'],ambiguous:['stop'],completed:['none']};
export function validateTrace(t){
 if(!t||typeof t.id!=='string'||!t.task||typeof t.task.goal!=='string'||!Array.isArray(t.events)||!t.events.length||t.events.length>40||new Set(t.events.map(e=>e.id)).size!==t.events.length||(t.verification!==undefined&&(typeof t.verification?.completed!=='boolean'||typeof t.verification.reason!=='string')))throw new Error('Diagnosis trace invalid');
 for(const e of t.events)if(typeof e.id!=='string'||!e.id||typeof e.text!=='string'||typeof e.kind!=='string'||!['task','server','browser','verifier','agent'].includes(e.source))throw new Error('Diagnosis event invalid');
 if(Buffer.byteLength(JSON.stringify(t))>14000)throw new Error('Diagnosis trace too large');return t;
}
export function validateDiagnosis(d,t){
 validateTrace(t);
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).sort().join(',')!=='confidence,diagnosis,evidenceIds,explanation,recovery'||!diagnoses.includes(d.diagnosis)||!['high','medium','low'].includes(d.confidence)||typeof d.explanation!=='string'||!d.explanation.trim()||d.explanation.length>1200)throw new Error('Diagnosis schema rejected');
 if(!Array.isArray(d.evidenceIds)||!d.evidenceIds.length||d.evidenceIds.length>6||new Set(d.evidenceIds).size!==d.evidenceIds.length||d.evidenceIds.some(id=>!t.events.some(e=>e.id===id)))throw new Error('Diagnosis citations rejected');
 const r=d.recovery;
 if(!r||Object.keys(r).sort().join(',')!=='action,reason'||!allowed[d.diagnosis].includes(r.action)||typeof r.reason!=='string'||!r.reason.trim()||r.reason.length>400)throw new Error('Diagnosis recovery rejected');
 if(d.diagnosis==='completed'&&t.verification?.completed===false)throw new Error('Diagnosis cannot override independent verification');
 return d;
}
