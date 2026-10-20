import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDiagnosis,diagnosisSchema} from '../src/diagnosis/contract.mjs';
import {diagnoseDeterministic} from '../src/diagnosis/baseline.mjs';
import {createDiagnosticPolicy} from '../src/diagnosis/nebius.mjs';
const trace={id:'synthetic',task:{goal:'Complete the fictional grant using supplied task data'},events:[{id:'e1',source:'server',kind:'validation',text:'Telephone format must be XXX-XXX-XXXX.'},{id:'e2',source:'verifier',kind:'verdict',text:'No unique committed server submission'}],verification:{completed:false,reason:'No unique committed server submission'}};
const answer={diagnosis:'validation',explanation:'The server rejected the telephone format.',evidenceIds:['e1'],recovery:{action:'correct_format',reason:'Format the supplied digits without changing the number.'},confidence:'high'};
const model='nvidia/test-nemotron';
const fixture=(overrides={})=>new Response(JSON.stringify({model,choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(answer)}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150},...overrides}));
test('diagnosis contract requires known citations and constrained recovery without completion authority',()=>{
 assert.deepEqual(validateDiagnosis(answer,trace),answer);assert.equal(diagnosisSchema.additionalProperties,false);
 for(const changes of [{evidenceIds:['invented']},{evidenceIds:[]},{evidenceIds:['e1','e1']},{diagnosis:'completed'},{recovery:{action:'run_script',reason:'execute'}},{recovery:{action:'retry',reason:'just retry'}},{verifiedCompletion:true},{confidence:'certain'},{explanation:'x'.repeat(1201)}])assert.throws(()=>validateDiagnosis({...answer,...changes},trace));
});
test('competent baseline grounds validation, verifier mismatch, authorization denial and uncertainty',()=>{
 assert.equal(diagnoseDeterministic(trace).diagnosis,'validation');
 for(const [text,diagnosis,action] of [['Receipt/task/state mismatch','state_mismatch','stop'],['HTTP 403 Forbidden','authorization_denied','stop'],['Provider unreachable: no observations retained','ambiguous','stop'],['Temporary submission error. Please retry once.','temporary_failure','retry']]){
  const t={...trace,events:[{id:'s',source:'server',kind:'error',text}]};const result=diagnoseDeterministic(t);validateDiagnosis(result,t);assert.equal(result.diagnosis,diagnosis);assert.equal(result.recovery.action,action);
 }
});
test('diagnostic client sends one schema request and preserves actual model/usage/latency',async()=>{
 let calls=0;const policy=createDiagnosticPolicy({apiKey:'test-only',model,approved:true,fetchImpl:async(url,init)=>{calls++;const body=JSON.parse(init.body);assert.equal(body.max_tokens,1024);assert.ok(body.messages[0].content.includes(JSON.stringify(diagnosisSchema)));assert.ok(body.messages[0].content.includes('Allowed diagnosis-to-recovery mapping'));assert.equal(body.response_format.type,'json_schema');assert.ok(!('reasoning_effort' in body));assert.ok(!('verifiedCompletion' in body.response_format.json_schema.schema.properties));return fixture();}});
 const result=await policy.diagnose(trace);assert.deepEqual(result.suggestion,answer);assert.equal(result.modelValidated,true);assert.equal(result.verifiedOutcome,false);assert.equal(result.usage.totalTokens,150);assert.equal(calls,1);
});
test('diagnostic client refuses malformed, truncated, refused, mismatched, ungrounded and missing usage with no retry',async()=>{
 for(const patch of [{model:'nvidia/other-nemotron'},{usage:null},{choices:[{finish_reason:'length',message:{role:'assistant',content:JSON.stringify(answer)}}]},{choices:[{finish_reason:'stop',message:{role:'assistant',refusal:'PRIVATE',content:JSON.stringify(answer)}}]},{choices:[{finish_reason:'stop',message:{role:'assistant',content:'PRIVATE malformed'}}]},{choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({...answer,evidenceIds:['bad']})}}]}]){
  let calls=0;const p=createDiagnosticPolicy({apiKey:'test-only-secret',model,approved:true,fetchImpl:async()=>{calls++;return fixture(patch);}});
  await assert.rejects(()=>p.diagnose(trace),e=>!e.message.includes('PRIVATE')&&!e.message.includes('test-only-secret'));assert.equal(calls,1);
 }
});
test('static evaluation can omit hidden verification labels without becoming a completion authority',()=>{
 const visible={id:'visible-only',task:{goal:'Finish task'},events:[{id:'e1',source:'verifier',kind:'receipt',text:'Verified completion for the current run and supplied task.'}]};
 const d=diagnoseDeterministic(visible);assert.equal(d.diagnosis,'completed');assert.equal(d.recovery.action,'none');validateDiagnosis(d,visible);
});

test('larger reasoning budget retains schema and reports reasoning usage without unsupported parameters',async()=>{
 const policy=createDiagnosticPolicy({apiKey:'test-only',model,approved:true,maxOutputTokens:8192,fetchImpl:async(_url,init)=>{
  const body=JSON.parse(init.body);assert.equal(body.max_tokens,8192);assert.equal(body.reasoning_effort,undefined);assert.equal(body.chat_template_kwargs,undefined);
  return fixture({usage:{prompt_tokens:100,completion_tokens:6000,total_tokens:6100,completion_tokens_details:{reasoning_tokens:5900}}});
 }});const result=await policy.diagnose(trace);assert.equal(result.reasoningTokens,5900);assert.equal(result.usage.outputTokens,6000);
 assert.throws(()=>createDiagnosticPolicy({apiKey:'test-only',model,approved:true,maxOutputTokens:8193}));
});
test('explicit supported sampling and alternate NVIDIA model are bounded and never changed globally',async()=>{
 const alternative='nvidia/test-nemotron-alternative';let calls=0;const p=createDiagnosticPolicy({apiKey:'test-only',model:alternative,approved:true,temperature:1,topP:.95,maxOutputTokens:2048,fetchImpl:async(_url,init)=>{calls++;const b=JSON.parse(init.body);assert.equal(b.model,alternative);assert.equal(b.temperature,1);assert.equal(b.top_p,.95);assert.equal(b.reasoning_effort,undefined);assert.equal(b.chat_template_kwargs,undefined);return fixture({model:alternative});}});await p.diagnose(trace);assert.equal(calls,1);
 for(const options of [{temperature:-1},{temperature:3},{topP:0},{topP:1.1}])assert.throws(()=>createDiagnosticPolicy({apiKey:'test-only',model,approved:true,...options}));
});
