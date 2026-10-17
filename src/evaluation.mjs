import { evaluationV2 } from './evaluation-v2.mjs';
import { scenarios } from './scenarios.mjs';
import { holdoutScenarios } from './holdout.mjs';
export function selectScenarios({split,ids}={}){
 if(split!==undefined&&!['development','holdout','evaluation-v2','all'].includes(split))throw new Error('Unknown evaluation split');
 const all=[...scenarios,...holdoutScenarios,...evaluationV2];
 const pool=split==='evaluation-v2'?evaluationV2:split==='holdout'?holdoutScenarios:split==='all'?all:scenarios;
 if(ids!==undefined){
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw new Error('Empty or duplicate scenario selection');
  return ids.map(id=>{const s=(split?pool:all).find(s=>s.id===id);if(!s)throw new Error('Unknown scenario or split mismatch');return s;});
 }
 return pool;
}
// All agents get the same final verification gate. Raw claims are NEVER rewritten.
export function finalizeAttempt(attempt,verdict){
 if(!verdict||typeof verdict.completed!=='boolean')throw new Error('Independent verification verdict required');
 const rawClaimedCompletion=attempt.claimedCompletion===true;
 return {rawClaimedCompletion,reportedCompletion:verdict.completed,rejectedCompletionClaim:rawClaimedCompletion&&!verdict.completed,completionStatus:verdict.completed?'verified':rawClaimedCompletion?'verification-failed':'not-completed'};
}
