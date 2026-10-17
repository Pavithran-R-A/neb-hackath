const $=id=>document.getElementById(id);let session,run,generation=0;
async function api(path,body){const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error??'Request failed');return data;}
function fail(error){$('error').textContent=error.message;}
function describe(){const selected=session.scenarios.find(s=>s.id===$('scenario').value);$('description').textContent=selected?.title??'';}
async function busy(button,fn){button.disabled=true;$('error').textContent='';try{await fn();}catch(error){fail(error);}finally{button.disabled=false;}}
$('scenario').addEventListener('change',describe);
$('create').addEventListener('click',()=>busy($('create'),async()=>{
 const current=++generation;const created=await api('/api/runs',{scenarioId:$('scenario').value});if(current!==generation)return;run=created;$('empty').hidden=true;$('run').hidden=false;$('task').replaceChildren();
 for(const [key,value] of Object.entries(run.task)){const term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=key;detail.textContent=String(value);$('task').append(term,detail);}
 $('open').href=run.url;$('claim').checked=false;$('verdict').replaceChildren();$('export').hidden=true;$('open').focus();
}));
$('verify').addEventListener('click',()=>busy($('verify'),async()=>{
 const current=generation;const result=await api('/api/runs/'+run.id+'/verify',{claimedCompletion:$('claim').checked});if(current!==generation||result.runId!==run?.id)return;
 const title=document.createElement('h3'),detail=document.createElement('p');title.textContent=result.reportedCompletion?'Verified completion':result.rejectedCompletionClaim?'Completion claim rejected':'Not completed';detail.textContent=result.verification.reason;
 $('verdict').replaceChildren(title,detail);$('verdict').dataset.verified=String(result.reportedCompletion);$('export').href='/api/runs/'+run.id+'/evidence';$('export').hidden=false;
}));
$('reset').addEventListener('click',()=>busy($('reset'),async()=>{++generation;await api('/api/reset',{});run=undefined;$('run').hidden=true;$('empty').hidden=false;$('create').focus();}));
api('/api/session').then(data=>{session=data;$('scenario').replaceChildren(...data.scenarios.map(s=>{const option=document.createElement('option');option.value=s.id;option.textContent=s.id.replaceAll('-',' ');return option;}));$('scenario').disabled=false;$('create').disabled=false;describe();}).catch(fail);
