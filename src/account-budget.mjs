import {mkdir,open,readFile,unlink} from 'node:fs/promises';import {join,dirname,resolve} from 'node:path';
// Workspace-local cumulative conservative accounting; not a provider balance API.
export async function reserveAccountBudget({directory,campaignId,maxReservedUsd,purpose,sourceCommit,suiteSha256,initialSpentUsd=0}={}){
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(campaignId??'')||!Number.isFinite(maxReservedUsd)||maxReservedUsd<=0||maxReservedUsd>.50||!Number.isFinite(initialSpentUsd)||initialSpentUsd<0)throw new Error('Account reserve invalid');
 const first=await mkdir(directory,{recursive:true}),lock=join(directory,'active.lock'),file=join(directory,'account.jsonl');let handle;
 try{handle=await open(lock,'wx',0o600);}catch{throw new Error('Account ledger locked; investigate interrupted campaign before continuing');}
 const syncDirs=async()=>{let path=resolve(directory),last=first?dirname(resolve(first)):resolve(directory);while(true){const h=await open(path,'r');try{await h.sync();}finally{await h.close();}if(path===last||dirname(path)===path)break;path=dirname(path);}};
 const append=async event=>{const h=await open(file,'a',0o600);try{await h.write(JSON.stringify({at:new Date().toISOString(),...event})+'\n');await h.sync();}finally{await h.close();}await syncDirs();};
 let entries,committed,closed=false;
 try{
  await handle.write(JSON.stringify({campaignId,sourceCommit,createdAt:new Date().toISOString()}));await handle.sync();await syncDirs();
  const raw=await readFile(file,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
  entries=raw.trim()?raw.trim().split('\n').map(JSON.parse):[];
  if(!entries.length){await append({event:'initial',initialAccountUsd:59,judgeReserveUsd:50,initialSpentUsd,basis:'Owner-attested starting account less recorded token estimates; no provider balance claim'});entries=[{event:'initial',initialSpentUsd}];}
  const reservations=entries.filter(e=>e.event==='reserved');
  if(reservations.some(e=>e.campaignId===campaignId))throw new Error('Account campaign ID consumed');
  committed=entries[0].initialSpentUsd;
  for(const r of reservations){const settled=entries.find(e=>e.event==='settled'&&e.campaignId===r.campaignId);committed+=settled?.usageComplete?settled.knownCostUsd:r.maxReservedUsd;}
  if(!Number.isFinite(committed)||committed+maxReservedUsd>9)throw new Error('Account judging reserve would be breached');
  await append({event:'reserved',campaignId,maxReservedUsd,purpose,sourceCommit,suiteSha256,engineeringCommittedBeforeUsd:committed});
 }catch(error){await handle.close();await unlink(lock);await syncDirs();throw error;}
 return {
  async retainReservation(){if(closed)throw new Error('Account campaign already settled');await handle.close();},
  summary:()=>({initialAccountUsd:59,judgeReserveUsd:50,engineeringCommittedUsd:committed,activeReservationUsd:closed?0:maxReservedUsd,remainingEstimatedCreditUsd:59-committed-(closed?0:maxReservedUsd),balanceBasis:'Owner59 minus known token estimates; unresolved campaigns charged full reservations'}),
  async settle({knownCostUsd,usageComplete,requests}){
   if(closed)throw new Error('Account campaign already settled');
   if(typeof usageComplete!=='boolean'||!Number.isSafeInteger(requests)||requests<0||(usageComplete&&(!Number.isFinite(knownCostUsd)||knownCostUsd<0)))throw new Error('Account settlement invalid');
   await append({event:'settled',campaignId,knownCostUsd:usageComplete?knownCostUsd:null,usageComplete,requests,reservationUsd:maxReservedUsd});
   committed+=usageComplete?knownCostUsd:maxReservedUsd;closed=true;await handle.close();await unlink(lock);await syncDirs();
  }
 };
}
