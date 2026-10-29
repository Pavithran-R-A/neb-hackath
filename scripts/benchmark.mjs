import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { benchmark } from '../src/benchmark.mjs';
import { createNemotronPolicy } from '../src/agents/nebius.mjs';

const args=process.argv.slice(2);
const option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
try{
 const known=new Set(['--live','--approve-paid','--repetitions','--output','--max-calls','--scenario','--split','--baselines']);
 for(let i=0;i<args.length;i++){if(!known.has(args[i]))throw new Error('Unknown benchmark argument');if(['--repetitions','--output','--max-calls','--scenario','--split','--baselines'].includes(args[i]))i++;}
 const live=args.includes('--live');
 if(live)throw new Error('Nebius live benchmark disabled; use the approved aggregate campaign entrypoint');
 if(live&&(!args.includes('--scenario')||!args.includes('--max-calls')||Number(option('--repetitions','1'))!==1||Number(option('--max-calls','0'))>8))throw new Error('Live evaluation requires one explicit scenario, one repetition and at most 8 calls');
 if(live&&option('--scenario','').includes(','))throw new Error('Live evaluation permits only one scenario');
 if(args.includes('--approve-paid')&&!live)throw new Error('--approve-paid requires --live');
 const policy=live?createNemotronPolicy({approved:args.includes('--approve-paid'),maxCalls:Number(option('--max-calls','24')),inputUsdPerMillion:process.env.NEBIUS_INPUT_USD_PER_MILLION?Number(process.env.NEBIUS_INPUT_USD_PER_MILLION):null,outputUsdPerMillion:process.env.NEBIUS_OUTPUT_USD_PER_MILLION?Number(process.env.NEBIUS_OUTPUT_USD_PER_MILLION):null}):null;
 const path=resolve(option('--output',`results/local/${live?'live':'offline'}.json`));
 await mkdir(dirname(path),{recursive:true});await writeFile(path+'.jsonl','');
 const startedAt=new Date().toISOString();
 const codeCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const codeStatus=execFileSync('git',['status','--porcelain','--','src','scripts','test','package.json','package-lock.json'],{encoding:'utf8'}).trim();
 const result=await benchmark({repetitions:Number(option('--repetitions','1')),livePolicy:policy,split:option('--split',undefined),scenarioIds:args.includes('--scenario')?option('--scenario','').split(','):undefined,baselines:option('--baselines','baseline,dom-autofill').split(','),onRow:async row=>{
  await appendFile(path+'.jsonl',JSON.stringify(row)+'\n');
  console.log(`${row.mode} ${row.scenario} verified=${row.verifiedCompletion} claimed=${row.claimedCompletion} reported=${row.reportedCompletion} ${row.latencyMs}ms`);
 }});
 const report={schemaVersion:2,startedAt,finishedAt:new Date().toISOString(),codeCommit,codeTreeDirty:!!codeStatus,node:process.version,browser:'Playwright pinned Chromium',latencyDefinition:'Per trial: run creation, fresh context/navigation, agent execution, context closure and server verification; excludes browser process launch',...result};
 await writeFile(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary,null,2));console.log(`Report: ${path}`);
}catch(e){console.error(e.message.startsWith('NEBIUS')||e.message.startsWith('Nebius')||e.message.includes('approval')||e.message.includes('Nemotron')?e.message:'Benchmark failed; inspect configuration and browser installation');process.exitCode=1;}
