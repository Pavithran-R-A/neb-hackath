import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
// Offline SQL preparation only. Does not connect to Cloudflare or approve a campaign.
export function accountImport(raw){
 const entries=raw.trim().split('\n').map(line=>JSON.parse(line));const initial=entries[0];
 if(initial?.event!=='initial'||initial.initialAccountUsd!==59||initial.judgeReserveUsd!==50||!Number.isFinite(initial.initialSpentUsd)||initial.initialSpentUsd<0)throw Error('Canonical owner-attested account header required');
 const reserved=new Map(),settled=new Map();for(const e of entries.slice(1)){
  if(e.event==='reserved'){if(typeof e.campaignId!=='string'||reserved.has(e.campaignId)||!Number.isFinite(e.maxReservedUsd)||e.maxReservedUsd<=0||e.maxReservedUsd>.5)throw Error('Invalid or duplicate historical reservation');reserved.set(e.campaignId,e);}
  else if(e.event==='settled'){if(!reserved.has(e.campaignId)||settled.has(e.campaignId)||typeof e.usageComplete!=='boolean'||e.usageComplete&&(!Number.isFinite(e.knownCostUsd)||e.knownCostUsd<0||e.knownCostUsd>reserved.get(e.campaignId).maxReservedUsd))throw Error('Invalid historical settlement');settled.set(e.campaignId,e);}
  else throw Error('Unexpected canonical ledger event');
 }
 const nano=usd=>Math.ceil(Number((usd*1e9).toFixed(6)));let committedNano=nano(initial.initialSpentUsd);const unresolved=[];
 for(const [id,r] of reserved){const s=settled.get(id);committedNano+=nano(s?.usageComplete?s.knownCostUsd:r.maxReservedUsd);if(!s)unresolved.push(id);}
 if(committedNano>9000000000)throw Error('Historical judging reserve breached');
 const digest=createHash('sha256').update(raw).digest('hex'),quote=s=>"'"+String(s).replaceAll("'","''")+"'";
 const statements=[`INSERT INTO accounts(id,imported_digest,imported_history,limit_nano,committed_nano,active) VALUES('nebius',${quote(digest)},CAST(X'${Buffer.from(raw).toString('hex')}' AS TEXT),9000000000,${committedNano},${unresolved.length?quote('imported-unresolved:'+digest):'NULL'});`];
 for(const [id,r] of reserved){statements.push(`INSERT INTO campaigns VALUES(${quote(id)},0,${quote(r.sourceCommit??'historical')},0,0,'historical','historical',0,0,1,0);`);statements.push(`INSERT INTO ledger VALUES(${quote('historical:'+id+':reserved')},${quote(id)},${quote('historical:'+id)},'reserved',${nano(r.maxReservedUsd)},0);`);const s=settled.get(id);if(s)statements.push(`INSERT INTO ledger VALUES(${quote('historical:'+id+':settled')},${quote(id)},${quote('historical:'+id)},'settled',${nano(s.usageComplete?s.knownCostUsd:r.maxReservedUsd)},0);`);}
 return {digest,committedNano,unresolved,reservations:reserved.size,sql:statements.join('\n')+'\n'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/workers-import-account.mjs canonical-account.jsonl output.sql');
 const plan=accountImport(await readFile(input,'utf8'));await writeFile(output,plan.sql,{flag:'wx',mode:0o600});console.log(JSON.stringify({mode:'offline-sql-preparation-only',digest:plan.digest,committedNano:plan.committedNano,unresolved:plan.unresolved,reservations:plan.reservations,output}));
}
