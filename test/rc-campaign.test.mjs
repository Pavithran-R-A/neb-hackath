import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {validateExperiment} from '../src/diagnosis/experiment.mjs';
const base={suiteId:'config-probes-v1',caseIds:['p1','p2'],maxRequests:3,maxOutputTokens:8192,spendLimitUsd:.05,model:'nvidia/test-nemotron',diagnosticSampling:{temperature:1,top_p:.95},responseContract:'preflight-then-diagnosis'};
test('experiment pins whole case order/configuration and bounds scope before network',()=>{
 const cases=[{id:'p1'},{id:'p2'}];assert.equal(validateExperiment(base,cases),base);
 for(const patch of [{caseIds:['p2','p1']},{maxRequests:4},{maxOutputTokens:8193},{spendLimitUsd:.51},{diagnosticSampling:{temperature:1,top_p:.95,reasoning_effort:'none'}},{model:'other/model'}])assert.throws(()=>validateExperiment({...base,...patch},cases));
});
