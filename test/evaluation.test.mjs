import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeAttempt, selectScenarios } from '../src/evaluation.mjs';
import { scenarios } from '../src/scenarios.mjs';

test('application completion claims require independent verification; raw failures remain visible',()=>{
 const result=finalizeAttempt({claimedCompletion:true},{completed:false,reason:'No receipt'});
 assert.equal(result.rawClaimedCompletion,true);assert.equal(result.reportedCompletion,false);assert.equal(result.rejectedCompletionClaim,true);assert.equal(result.completionStatus,'verification-failed');
 assert.equal(finalizeAttempt({claimedCompletion:true},{completed:true,reason:'Verified'}).reportedCompletion,true);
 assert.equal(finalizeAttempt({claimedCompletion:false},{completed:false}).completionStatus,'not-completed');
 assert.throws(()=>finalizeAttempt({claimedCompletion:true},null));
});
test('scenario selectors validate exact IDs and frozen evaluation split',()=>{
 assert.deepEqual(selectScenarios({ids:['grant-clean']}).map(x=>x.id),['grant-clean']);
 assert.equal(selectScenarios({split:'development'}).length,scenarios.length);
 const held=selectScenarios({split:'holdout'});assert.ok(held.length>=6);assert.ok(held.every(x=>x.split==='holdout'));
 assert.throws(()=>selectScenarios({ids:['typo']}));assert.throws(()=>selectScenarios({ids:[]}));assert.throws(()=>selectScenarios({split:'typo'}));
 assert.throws(()=>selectScenarios({split:'development',ids:[held[0].id]}));
});
