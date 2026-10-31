const $=id=>document.getElementById(id);let session,run,generation=0,diagnosis;
async function api(path,body){
 let response;try{response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});}catch{throw new Error('Connection lost. Wait for the service to warm up, then retry your action.');}
 let data;try{data=await response.json();}catch{throw new Error('The service is warming up or unavailable. Please retry shortly.');}
 if(!response.ok){const error=new Error(data.error??'Request failed. Please retry.');error.status=response.status;throw error;}return data;
}
function fail(error){$('error').textContent=error.message;if(error.status===401){$('renew-session').hidden=false;$('error').textContent+=' Start a fresh session to continue; expired runs cannot be recovered.';}}
function describe(){const selected=session.scenarios.find(s=>s.id===$('scenario').value);$('description').textContent=selected?.title??'';}
async function busy(button,fn,{diagnostic=false}={}){
 const label=button.textContent,started=Date.now();button.disabled=true;button.setAttribute('aria-busy','true');$('error').textContent='';
 const announce=()=>{$('activity').textContent=diagnostic?'Waiting for diagnosis · '+Math.floor((Date.now()-started)/1000)+'s elapsed. Please wait. A model call can take 9–22 seconds or longer. Request sent; waiting for the server response. No intermediate model progress is available. No automatic retries. Reasoning does not prove completion.':label+'… Please wait. No automatic retries.';};
 announce();const timer=diagnostic?setInterval(announce,1000):undefined;
 try{await fn();$('activity').textContent=diagnostic?'Diagnosis received. Review the cited evidence and safety check. Only a separate receipt check proves completion.':label+' finished.';}catch(error){$('activity').textContent=label+' did not finish. No completion is implied. No automatic retries.';fail(error);}finally{clearInterval(timer);button.removeAttribute('aria-busy');button.disabled=false;}
}
function textNode(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}
function clearDiagnosis(){diagnosis=undefined;$('diagnosis').replaceChildren();$('approval').hidden=true;$('approve-recovery').checked=false;$('recover').disabled=true;$('recovery-result').replaceChildren();}
async function createRun(){
 const current=++generation,created=await api('/api/runs',{scenarioId:$('scenario').value});if(current!==generation)return;run=created;$('empty').hidden=true;$('run').hidden=false;$('task').replaceChildren();
 for(const [key,value] of Object.entries(run.task))$('task').append(textNode('dt',key),textNode('dd',String(value)));
 clearDiagnosis();$('open').href=run.url;$('claim').checked=false;$('verdict').replaceChildren();$('export').hidden=true;
 $('form-guide').textContent='In the form: enter '+run.task.name+', '+run.task.email+', '+run.task.phone+'. Choose Next; '+(run.task.flow==='workshop'?'select ':'enter ')+run.task.detail+'. Choose Next, tick fictional consent, then Submit application. Return here without retrying the submission.';
 $('guide-progress').textContent=$('scenario').value==='workshop-false-success'?'Negative case: submit the form, tick the completion claim here, then check server state. A success screen is not a receipt.':'Positive case: submit once to see the temporary error. Return here, check server state, then request a diagnosis.';$('open').focus();
}
$('scenario').addEventListener('change',describe);
$('create').addEventListener('click',()=>busy($('create'),createRun));
for(const [id,scenario] of [['guided-positive','grant-transient'],['guided-negative','workshop-false-success']])$(id).addEventListener('click',()=>busy($(id),async()=>{$('scenario').value=scenario;describe();await createRun();}));
$('verify').addEventListener('click',()=>busy($('verify'),async()=>{
 const current=generation,result=await api('/api/runs/'+run.id+'/verify',{claimedCompletion:$('claim').checked});if(current!==generation||result.runId!==run?.id)return;
 const title=textNode('h3',result.reportedCompletion?'Verified completion':result.rejectedCompletionClaim?'Completion claim rejected':'Not completed'),detail=textNode('p',result.verification.reason);
 $('verdict').replaceChildren(title,detail,textNode('p','Private verifier evidence: server status '+(result.server?.status??'unavailable')+'; committed submissions '+(result.server?.completionCount??'unknown')+'. Signed receipt validation is separate from any diagnosis.'));$('verdict').dataset.verified=String(result.reportedCompletion);$('export').href='/api/runs/'+run.id+'/evidence';$('export').hidden=false;
 $('guide-progress').textContent=result.reportedCompletion?'Receipt verified. Export the review record, then try the negative case.':'No verified receipt. Inspect a diagnosis and its sources; only approve a permitted recovery.';
}));
$('reset').addEventListener('click',()=>busy($('reset'),async()=>{++generation;await api('/api/reset',{});run=undefined;clearDiagnosis();$('run').hidden=true;$('empty').hidden=false;$('create').focus();}));
async function loadSession(){
 const previousScenario=$('scenario').value;$('retry-session').hidden=true;$('error').textContent='';
  try{const data=await api('/api/session');session=data;
  $('storage-note').textContent=data.storageMode==='retained'?'Sessions expire after 30 minutes; this configured runtime preserves them across restart.':'Sessions expire after 30 minutes; local sessions disappear on restart.';
  const available=data.liveInferenceAvailable??data.liveInferenceEnabled;
  $('judge-access').hidden=!(data.judgeOperatingMode&&data.judgeAccessRequired&&available);
  $('diagnose-model').disabled=!available||Boolean(data.judgeOperatingMode&&data.judgeAccessRequired);
  $('model-status').textContent=!available&&data.judgeAdmissionState==='halted'?
   'NVIDIA diagnosis is temporarily halted due to an unresolved provider outcome. No model request can be made. Local rules and signed-receipt checks remain available; reload this page if the operator restores inference.':
   !available&&data.judgeAdmissionState==='expired'?
   'NVIDIA judge access has expired. Local rules and signed-receipt checks remain available without inference cost.':
   !available&&data.judgeAdmissionState==='unavailable'?
   'NVIDIA admission cannot be verified right now. No model request will be sent. Continue safely using local rules.':
   available?(data.diagnosticExecutionKind==='simulated-test'?'Simulated model transport for integration testing; no live NVIDIA claim.':'NVIDIA Nemotron via Nebius Token Factory: admitted under a bounded credit campaign. One click sends one request; no automatic retry.'):'NVIDIA diagnosis is inactive. Continue the full receipt journey with local rules at no inference cost; this does not demonstrate live NVIDIA functionality.';
 $('scenario').replaceChildren(...data.scenarios.map(s=>{const option=textNode('option',s.id.replaceAll('-',' '));option.value=s.id;return option;}));if(data.scenarios.some(s=>s.id===previousScenario))$('scenario').value=previousScenario;for(const id of ['scenario','create','guided-positive','guided-negative'])$(id).disabled=false;describe();$('guide-progress').textContent='Connected. Start the positive case; no account or model call is required.';
 }catch(error){fail(error);$('retry-session').hidden=false;$('guide-progress').textContent='Connection unavailable. The service may need time to start. Retry connection when ready.';}
}
$('judge-access').addEventListener('submit',event=>{
 event.preventDefault();const code=$('judge-code').value;$('judge-code').value='';
 if(!code.trim())return;
 busy($('unlock-judge'),async()=>{await api('/api/judge-access',{code});$('judge-access-status').textContent='Access accepted for this server session.';await loadSession();});
});
$('retry-session').addEventListener('click',loadSession);$('renew-session').addEventListener('click',()=>location.reload());loadSession();

async function diagnose(mode,button){await busy(button,async()=>{
 const current=generation,id=run.id;clearDiagnosis();const result=await api('/api/runs/'+id+'/diagnose',{mode});if(current!==generation||run?.id!==id)return;diagnosis=result;
 const suggestion=result.suggestion,assessment=result.semanticAssessment,blocked=assessment&&assessment.status!=='accepted',adviceSource=result.executionKind==='deterministic'?'rules':'model';
 const title=textNode('h4',(result.executionKind==='deterministic'?'Rules diagnosis':result.executionKind==='simulated-test'?'Simulated model suggestion':'NVIDIA model suggestion')+' — '+suggestion.diagnosis.replaceAll('_',' '));
 const explanation=textNode('p',suggestion.explanation),action=textNode('p','Suggested recovery: '+suggestion.recovery.action.replaceAll('_',' ')+'. '+suggestion.recovery.reason),sources=document.createElement('ul');
 for(const evidenceId of suggestion.evidenceIds){const e=result.trace.events.find(e=>e.id===evidenceId);const item=textNode('li',evidenceId+' / '+(e?.source??'unresolved source')+': '+(e?.text??'Source unavailable; investigate.'));if(e){const link=textNode('a','Inspect cited event '+evidenceId);link.href='#trace-event-'+result.trace.events.indexOf(e);link.addEventListener('click',event=>{event.preventDefault();trace.open=true;const target=document.getElementById(link.hash.slice(1));target?.focus();target?.scrollIntoView({block:'nearest'});});item.append(document.createTextNode(' '),link);}sources.append(item);}
 const gate=document.createElement('div');gate.className='safety-check';gate.append(textNode('p',assessment?'Semantic safety check: '+assessment.status.replaceAll('-',' '):'Action guard: only permitted recovery can execute.'));if(assessment)for(const reason of assessment.reasons??[])gate.append(textNode('p',reason));if(assessment?.rawHighConfidenceRejected)gate.append(textNode('p','A high-confidence '+adviceSource+' recommendation was blocked. Inspect the source evidence before trusting it.'));
 const executable=result.recoveryExecutable&&!blocked;
 const limit=textNode('p',executable?'Recovery is available only after your explicit approval.':'This suggestion is not executable here. Stop or investigate manually.');
 const metrics=textNode('p',result.executionKind==='deterministic'?'Local deterministic rules; no inference cost.':(result.executionKind==='simulated-test'?'Simulated provider metrics: ':'Actual provider metrics: ')+(result.usage?.totalTokens??'unknown')+' total tokens; '+(Number.isFinite(result.latencyMs)?Math.round(result.latencyMs)+'ms':'latency unknown')+'; estimated token cost '+(Number.isFinite(result.estimatedCostUsd)?'$'+result.estimatedCostUsd.toFixed(6):'unknown')+'.');metrics.className='muted';
 const trace=document.createElement('details'),events=document.createElement('ul');trace.append(textNode('summary','Inspect all retained trace events'));for(const [index,e] of result.trace.events.entries()){const event=textNode('li',e.id+' · Source: '+e.source+' · Event kind: '+e.kind+' · '+e.text);event.id='trace-event-'+index;event.tabIndex=-1;events.append(event);}trace.append(events);
 $('diagnosis').replaceChildren(title,textNode('p','Task status: unverified by this diagnosis. Model reasoning does not prove completion. Check server state for the independent receipt verdict.'),explanation,action,gate,textNode('h4','Cited source evidence'),sources,limit,metrics,trace);
 if(result.rawSuggestion){const raw=document.createElement('details');raw.className='raw-review';raw.append(textNode('summary',blocked?'Review rejected raw '+adviceSource+' output (untrusted)':'Review raw '+adviceSource+' output (untrusted)'),textNode('p',blocked?'Warning: rejected raw '+adviceSource+' output is retained for audit only. It is not accepted advice and must not be executed.':'Raw '+adviceSource+' output is retained for provenance. The accepted suggestion and safety check above govern whether any recovery is permitted; the raw output cannot authorize execution.'),textNode('p',result.rawSuggestion.explanation),textNode('pre',JSON.stringify(result.rawSuggestion,null,2)));$('diagnosis').append(raw);}
 $('approval').hidden=!executable;$('approve-recovery').checked=false;$('recover').disabled=true;$('recovery-result').replaceChildren();
},{diagnostic:true});}
$('diagnose-rules').addEventListener('click',()=>diagnose('deterministic',$('diagnose-rules')));
$('diagnose-model').addEventListener('click',()=>diagnose('nemotron',$('diagnose-model')));
$('approve-recovery').addEventListener('change',()=>{$('recover').disabled=!$('approve-recovery').checked;});
$('recover').addEventListener('click',()=>busy($('recover'),async()=>{
 if(!$('approve-recovery').checked||!diagnosis)throw new Error('Explicit approval required');
 const current=generation,id=run.id;const result=await api('/api/runs/'+id+'/recover',{approve:true,diagnosisId:diagnosis.id,traceDigest:diagnosis.traceDigest});if(current!==generation||run?.id!==id)return;
 $('approval').hidden=true;$('recovery-result').textContent=result.verification.completed?'Recovery applied. Independent verification confirms completion.':'Recovery applied. Completion is not yet verified: '+result.verification.reason;$('verdict').replaceChildren();$('export').hidden=true;$('verify').focus();
}));
