import { observe, executeAction } from './browser.mjs';
import { validateBatch } from './actions.mjs';
export async function runGuarded(page,task,policy,{maxTurns=8}={}){
 const history=[];let steps=0,blockedActions=0;
 const result=(claimedCompletion,error)=>({claimedCompletion,steps,blockedActions,inappropriateActionsExecuted:0,errors:error?[error]:[],history});
 for(let turn=0;turn<maxTurns;turn++){
  const observation=await observe(page);let decision;
  try{decision=await policy.decide({task,observation,history:history.slice(-3)});}catch(e){return result(false,e.message.startsWith('Nebius')?e.message:'Policy failed');}
  const actions=decision?.actions;
  // Validate the whole batch before taking any action. Navigation must be last.
  try{
   validateBatch(decision,observation.controls,task);
  }catch{blockedActions++;return result(false,'Action guard rejected policy batch');}
  const record={turn,actions:structuredClone(actions)};history.push(record);
  try{
   for(const action of actions){
    if(action.type==='done')return result(true);
    if(action.type==='abort')return result(false,'Policy aborted');
    await executeAction(page,action,observation.controls,task);steps++;
   }
  }catch{return result(false,'Browser action failed');}
 }
 return result(false,'Turn budget exhausted');
}
