const $=id=>document.getElementById(id);let session,run,generation=0,diagnosis;
async function api(path,body){const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error??'Request failed');return data;}
function fail(error){$('error').textContent=error.message;}
function describe(){const selected=session.scenarios.find(s=>s.id===$('scenario').value);$('description').textContent=selected?.title??'';}
async function busy(button,fn){button.disabled=true;$('error').textContent='';try{await fn();}catch(error){fail(error);}finally{button.disabled=false;}}
$('scenario').addEventListener('change',describe);
$('create').addEventListener('click',()=>busy($('create'),async()=>{
 const current=++generation;const created=await api('/api/runs',{scenarioId:$('scenario').value});if(current!==generation)return;run=created;$('empty').hidden=true;$('run').hidden=false;$('task').replaceChildren();
 for(const [key,value] of Object.entries(run.task)){const term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=key;detail.textContent=String(value);$('task').append(term,detail);}
 diagnosis=undefined;$('diagnosis').replaceChildren();$('approval').hidden=true;$('recovery-result').replaceChildren();
 $('open').href=run.url;$('claim').checked=false;$('verdict').replaceChildren();$('export').hidden=true;$('open').focus();
}));
$('verify').addEventListener('click',()=>busy($('verify'),async()=>{
 const current=generation;const result=await api('/api/runs/'+run.id+'/verify',{claimedCompletion:$('claim').checked});if(current!==generation||result.runId!==run?.id)return;
 const title=document.createElement('h3'),detail=document.createElement('p');title.textContent=result.reportedCompletion?'Verified completion':result.rejectedCompletionClaim?'Completion claim rejected':'Not completed';detail.textContent=result.verification.reason;
 $('verdict').replaceChildren(title,detail);$('verdict').dataset.verified=String(result.reportedCompletion);$('export').href='/api/runs/'+run.id+'/evidence';$('export').hidden=false;
}));
$('reset').addEventListener('click',()=>busy($('reset'),async()=>{++generation;await api('/api/reset',{});run=undefined;$('run').hidden=true;$('empty').hidden=false;$('create').focus();}));
api('/api/session').then(data=>{session=data;$('diagnose-model').disabled=!data.liveInferenceEnabled;$('model-status').textContent=data.liveInferenceEnabled?(data.diagnosticExecutionKind==='simulated-test'?'Simulated model transport for integration testing; no live NVIDIA claim.':'NVIDIA diagnosis enabled under a bounded owner-authorized credit campaign.'):'Local rules are available. NVIDIA diagnosis is inactive until a bounded cloud campaign is configured.';$('scenario').replaceChildren(...data.scenarios.map(s=>{const option=document.createElement('option');option.value=s.id;option.textContent=s.id.replaceAll('-',' ');return option;}));$('scenario').disabled=false;$('create').disabled=false;describe();}).catch(fail);

async function diagnose(mode,button){await busy(button,async()=>{
 const current=generation,id=run.id,result=await api('/api/runs/'+id+'/diagnose',{mode});
 if(current!==generation||run?.id!==id)return;diagnosis=result;
 const title=document.createElement('h4'),explanation=document.createElement('p'),action=document.createElement('p'),sources=document.createElement('ul');
 title.textContent=(result.executionKind==='deterministic'?'Rules diagnosis':result.executionKind==='simulated-test'?'Simulated model suggestion':'NVIDIA model suggestion')+' — '+result.suggestion.diagnosis.replaceAll('_',' ');
 explanation.textContent=result.suggestion.explanation;action.textContent='Suggested recovery: '+result.suggestion.recovery.action.replaceAll('_',' ')+'. '+result.suggestion.recovery.reason;
 for(const id of result.suggestion.evidenceIds){const e=result.trace.events.find(e=>e.id===id),li=document.createElement('li');li.textContent=id+' / '+e.source+': '+e.text;sources.append(li);}
 const limit=document.createElement('p');limit.textContent=result.recoveryExecutable?'Recovery is available only after your explicit approval.':'This suggestion is not executable here. Stop or investigate manually.';
 const metrics=document.createElement('p');metrics.className='muted';metrics.textContent=result.executionKind==='deterministic'?'Local deterministic rules; no inference cost.':(result.executionKind==='simulated-test'?'Simulated provider metrics: ':'Actual provider metrics: ')+(result.usage?.totalTokens??'unknown')+' total tokens; '+(Number.isFinite(result.latencyMs)?Math.round(result.latencyMs)+'ms':'latency unknown')+'; estimated token cost '+(Number.isFinite(result.estimatedCostUsd)?'$'+result.estimatedCostUsd.toFixed(6):'unknown')+'.';
 const trace=document.createElement('details'),summary=document.createElement('summary'),events=document.createElement('ul');summary.textContent='Inspect all retained trace events';for(const e of result.trace.events){const li=document.createElement('li');li.textContent=e.id+' / '+e.source+' / '+e.kind+': '+e.text;events.append(li);}trace.append(summary,events);
 $('diagnosis').replaceChildren(title,explanation,action,sources,limit,metrics,trace);$('approval').hidden=!result.recoveryExecutable;$('approve-recovery').checked=false;$('recover').disabled=true;$('recovery-result').replaceChildren();
});}
$('diagnose-rules').addEventListener('click',()=>diagnose('deterministic',$('diagnose-rules')));
$('diagnose-model').addEventListener('click',()=>diagnose('nemotron',$('diagnose-model')));
$('approve-recovery').addEventListener('change',()=>{$('recover').disabled=!$('approve-recovery').checked;});
$('recover').addEventListener('click',()=>busy($('recover'),async()=>{
 if(!$('approve-recovery').checked||!diagnosis)throw new Error('Explicit approval required');
 const current=generation,id=run.id,result=await api('/api/runs/'+id+'/recover',{approve:true,diagnosisId:diagnosis.id,traceDigest:diagnosis.traceDigest});
 if(current!==generation||run?.id!==id)return;
 $('approval').hidden=true;$('recovery-result').textContent=result.verification.completed?'Recovery applied. Independent verification confirms completion.':'Recovery applied. Completion is not yet verified: '+result.verification.reason;
 $('verdict').replaceChildren();$('export').hidden=true;
}));
