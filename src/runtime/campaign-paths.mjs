import {lstat,readFile,mkdir} from 'node:fs/promises';import {resolve,isAbsolute,join} from 'node:path';
// Public mode must continue the existing account history, never silently seed a
// fresh balance when an ephemeral filesystem or missing volume is presented.
export async function servicePaths({publicMode=false,stateDirectory}={}){
 if(!publicMode)return {accountDirectory:resolve('.cache/account-budget'),campaignDirectory:resolve('.cache/campaigns'),evidenceDirectory:resolve('.cache/campaigns')};
 if(!isAbsolute(stateDirectory??''))throw new Error('Absolute retained state directory required');
 const budgetDirectory=join(resolve(stateDirectory),'budgets'),accountDirectory=join(budgetDirectory,'account'),campaignDirectory=join(budgetDirectory,'campaigns'),evidenceDirectory=join(budgetDirectory,'evidence');
 for(const p of [stateDirectory,budgetDirectory,accountDirectory]){const stat=await lstat(p).catch(e=>{if(e.code==='ENOENT')throw new Error('Existing cumulative account ledger must be imported before public inference');throw e;});if(stat.isSymbolicLink()||!stat.isDirectory())throw new Error('Public budget symlink or invalid directory denied');}
 let entries;try{entries=(await readFile(join(accountDirectory,'account.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);}catch{throw new Error('Existing cumulative account ledger required');}
 if(entries[0]?.event!=='initial'||entries[0].initialAccountUsd!==59||entries[0].judgeReserveUsd!==50)throw new Error('Cumulative account ledger basis invalid');
 for(const p of [campaignDirectory,evidenceDirectory]){await mkdir(p,{mode:0o700,recursive:true});if((await lstat(p)).isSymbolicLink())throw new Error('Public budget symlink denied');}
 return {budgetDirectory,accountDirectory,campaignDirectory,evidenceDirectory};
}
