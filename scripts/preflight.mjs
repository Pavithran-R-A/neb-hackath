import { readFile } from 'node:fs/promises';
import { preflight } from '../src/preflight.mjs';

try{
 const args=process.argv.slice(2),allowed=new Set(['--live','--approve-paid','--spend-limit-usd','--credit-evidence','--max-output-tokens']);
 let spendLimitUsd,creditEvidencePath,maxOutputTokens;
 for(let i=0;i<args.length;i++){
  if(!allowed.has(args[i])||args.indexOf(args[i])!==i)throw new Error('Invalid or repeated preflight argument');
  if(args[i]==='--max-output-tokens'){
   if(!args[i+1]||args[i+1].startsWith('--'))throw new Error('Missing output-token budget');
   maxOutputTokens=Number(args[++i]);
   if(!Number.isInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>1024)throw new Error('Invalid output-token budget');
  }else if(args[i]==='--credit-evidence'){
   if(!args[i+1]||args[i+1].startsWith('--'))throw new Error('Missing credit evidence path');
   creditEvidencePath=args[++i];
  }else if(args[i]==='--spend-limit-usd'){
   if(!args[i+1]||args[i+1].startsWith('--'))throw new Error('Missing spending limit');
   spendLimitUsd=Number(args[++i]);if(!Number.isFinite(spendLimitUsd)||spendLimitUsd<=0)throw new Error('Invalid spending limit');
  }
 }
 const live=args.includes('--live');
 if(!live&&(args.includes('--approve-paid')||spendLimitUsd!==undefined||creditEvidencePath!==undefined))throw new Error('Paid options require --live');
 let creditEvidence;
 if(creditEvidencePath){try{creditEvidence=JSON.parse(await readFile(creditEvidencePath,'utf8'));}catch{throw new Error('Credit-only billing evidence file cannot be read');}}
 const result=await preflight({creditEvidence,maxOutputTokens,live,approved:args.includes('--approve-paid'),spendLimitUsd,inputUsdPerMillion:process.env.NEBIUS_INPUT_USD_PER_MILLION?Number(process.env.NEBIUS_INPUT_USD_PER_MILLION):undefined,outputUsdPerMillion:process.env.NEBIUS_OUTPUT_USD_PER_MILLION?Number(process.env.NEBIUS_OUTPUT_USD_PER_MILLION):undefined});
 console.log(JSON.stringify(result,null,2));
 if(!result.credentials.apiKeyPresent||!result.credentials.modelIsNemotron)process.exitCode=1;
}catch(error){
 const message=/^(Credit-only|Nebius|NEBIUS|Explicit owner|A positive approved|Positive current|Preflight safety|Configure an eligible|Invalid |Missing |Paid options)/.test(error.message)?error.message:'Preflight failed';
 console.error(JSON.stringify({error:message,...(error.report?{report:error.report}:{})},null,2));process.exitCode=1;
}
