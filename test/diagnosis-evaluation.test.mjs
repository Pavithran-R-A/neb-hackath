import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {visibleTrace,scoreDiagnoses} from '../src/diagnosis/evaluation.mjs';
test('evaluation hides answer-key verification and keeps missing predictions in the denominator',()=>{
 const cases=[{id:'a',task:{goal:'task'},events:[{id:'e',source:'server',kind:'error',text:'Temporary failure'}],verification:{completed:false,reason:'private label'}}];
 assert.equal('verification' in visibleTrace(cases[0]),false);
 const labels=[{id:'a',acceptableDiagnoses:['temporary_failure'],acceptableRecovery:['retry'],requiredEvidence:['e']}];
 const empty=scoreDiagnoses(cases,labels,[]);assert.equal(empty.caseCount,1);assert.equal(empty.attempted,0);assert.equal(empty.pairCorrect,0);
 const wrong=scoreDiagnoses(cases,labels,[{id:'a',suggestion:{diagnosis:'validation',recovery:{action:'correct_format'},evidenceIds:['invented'],confidence:'high'}}]);
 assert.equal(wrong.highConfidenceWrongDiagnosis,1);assert.equal(wrong.disallowedConsequentialSuggestions,1);assert.equal(wrong.requiredEvidenceCovered,0);
});
test('diagnostic campaign plan is non-billable and source/suite pinned',()=>{
 const result=spawnSync(process.execPath,['scripts/diagnosis-campaign.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const plan=JSON.parse(result.stdout);assert.equal(plan.mode,'plan-only');assert.equal(plan.cases,16);assert.equal(plan.maxRequests,17);assert.equal(plan.modelExecution,'NOT RUN');
});
