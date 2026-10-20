import { createApp } from './app/server.mjs';
import { launchBrowser, createBrowserSession } from './agents/browser.mjs';
import { runBaseline } from './agents/baseline.mjs';
import { runGuarded } from './agents/guarded.mjs';
import { createScriptedPolicy } from './agents/scripted.mjs';
import { verifyCompletion } from './verification.mjs';
import { selectScenarios, finalizeAttempt } from './evaluation.mjs';
import { runDomBaseline } from './agents/dom-baseline.mjs';

const round=n=>Math.round(n*100)/100;
export function summarize(rows){
 const output={};
 for(const mode of new Set(rows.map(r=>r.mode))){
  const group=rows.filter(r=>r.mode===mode),positives=group.filter(r=>r.expectedCompletion);
  const times=group.map(r=>r.latencyMs).sort((a,b)=>a-b),middle=Math.floor(times.length/2);
  output[mode]={trials:group.length,positiveCases:positives.length,negativeCases:group.length-positives.length,verifiedCompletions:group.filter(r=>r.verifiedCompletion).length,positiveCompletionRate:positives.length?positives.filter(r=>r.verifiedCompletion).length/positives.length:null,correctNegativeOutcomes:group.filter(r=>!r.expectedCompletion&&!r.verifiedCompletion&&!r.claimedCompletion).length,falseCompletionClaims:group.filter(r=>r.claimedCompletion&&!r.verifiedCompletion).length,blockedActions:group.reduce((n,r)=>n+r.blockedActions,0),reportedFalseCompletions:group.filter(r=>r.reportedCompletion&&!r.verifiedCompletion).length,rejectedCompletionClaims:group.filter(r=>r.rejectedCompletionClaim).length,inappropriateActionsExecuted:null,inappropriateActionMetricBasis:'Not independently measured',latencyMedianMs:round(times.length%2?times[middle]:(times[middle-1]+times[middle])/2),latencyP95Ms:times[Math.ceil(times.length*.95)-1]};
 }
 return output;
}
export async function benchmark({repetitions=1,livePolicy=null,onRow=()=>{},split,scenarioIds,baselines=['baseline','dom-autofill']}={}){
 if(!Number.isInteger(repetitions)||repetitions<1||repetitions>10)throw new Error('Repetitions must be 1..10');
 const selected=selectScenarios({split,ids:scenarioIds});
 if(!Array.isArray(baselines)||!baselines.length||new Set(baselines).size!==baselines.length||baselines.some(b=>!['baseline','dom-autofill'].includes(b)))throw new Error('Invalid baseline selection');
 const app=await createApp();let browser;const rows=[];
 try{
  browser=await launchBrowser();
  for(let repetition=1;repetition<=repetitions;repetition++)for(const scenario of selected){
   // Alternate order by repetition to reduce systematic warm-up/order effects.
   const modes=[...baselines,livePolicy?'nebius-nemotron':'scripted-control'];if(repetition%2===0)modes.reverse();
   for(const mode of modes){
    const start=performance.now(),run=app.createRun(scenario);let session,result;
    const before=livePolicy?.metrics();
    try{
     session=await createBrowserSession(browser,run);
     result=mode==='baseline'?await runBaseline(session.page,scenario.task):mode==='dom-autofill'?await runDomBaseline(session.page,scenario.task):await runGuarded(session.page,scenario.task,livePolicy??createScriptedPolicy());
    }catch{result={claimedCompletion:false,steps:0,blockedActions:0,inappropriateActionsExecuted:0,errors:['Browser session unavailable']};}
    finally{if(session)await session.context.close();}
    const verdict=verifyCompletion(app.readRecord(run.id),scenario.task,app.key,{runId:run.id});
    const after=livePolicy?.metrics();const isLive=mode==='nebius-nemotron';
    const usageComplete=isLive?before.usageComplete&&after.usageComplete:true;
    const final=finalizeAttempt(result,verdict);
    const row={...final,scenario:scenario.id,split:scenario.split??'development',repetition,mode,expectedCompletion:scenario.expectedCompletion,verifiedCompletion:verdict.completed,verificationReason:verdict.reason,receiptId:verdict.receiptId??null,claimedCompletion:result.claimedCompletion,falseCompletionClaim:result.claimedCompletion&&!verdict.completed,steps:result.steps,blockedActions:result.blockedActions+(session?.blocked.length??0),inappropriateActionsExecuted:null,inappropriateActionMetricBasis:'Not independently measured; previous literal zero retired',errors:result.errors,latencyMs:round(performance.now()-start),modelCalls:isLive?after.calls-before.calls:0,promptTokens:isLive?(usageComplete?after.promptTokens-before.promptTokens:null):0,completionTokens:isLive?(usageComplete?after.completionTokens-before.completionTokens:null):0,estimatedModelCostUsd:isLive?(before.estimatedModelCostUsd!==null&&after.estimatedModelCostUsd!==null?after.estimatedModelCostUsd-before.estimatedModelCostUsd:null):0,costBasis:isLive?after.costBasis:'No inference calls',actions:result.history??null};
    rows.push(row);await onRow(row);
   }
  }
  return {rows,summary:summarize(rows),inference:livePolicy?livePolicy.metrics():{status:'NOT RUN',reason:'Offline control only; live Nemotron requires protected credentials and explicit paid approval',modelCalls:0,modelCostUsd:0}};
 }finally{if(browser)await browser.close();await app.close();}
}
