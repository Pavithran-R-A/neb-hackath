import { preflight } from '../src/preflight.mjs';

try{
 const args=process.argv.slice(2),allowed=new Set(['--live','--approve-paid','--spend-limit-usd']);
 let spendLimitUsd;
 for(let i=0;i<args.length;i++){
  if(!allowed.has(args[i])||args.indexOf(args[i])!==i)throw new Error('Invalid or repeated preflight argument');
  if(args[i]==='--spend-limit-usd'){
   if(!args[i+1]||args[i+1].startsWith('--'))throw new Error('Missing spending limit');
   spendLimitUsd=Number(args[++i]);if(!Number.isFinite(spendLimitUsd)||spendLimitUsd<=0)throw new Error('Invalid spending limit');
  }
 }
 const live=args.includes('--live');
 if(!live&&(args.includes('--approve-paid')||spendLimitUsd!==undefined))throw new Error('Paid options require --live');
 const result=await preflight({live,approved:args.includes('--approve-paid'),spendLimitUsd,inputUsdPerMillion:process.env.NEBIUS_INPUT_USD_PER_MILLION?Number(process.env.NEBIUS_INPUT_USD_PER_MILLION):undefined,outputUsdPerMillion:process.env.NEBIUS_OUTPUT_USD_PER_MILLION?Number(process.env.NEBIUS_OUTPUT_USD_PER_MILLION):undefined});
 console.log(JSON.stringify(result,null,2));
 if(!result.credentials.apiKeyPresent||!result.credentials.modelIsNemotron)process.exitCode=1;
}catch(error){
 const message=/^(Nebius|NEBIUS|Explicit owner|A positive approved|Positive current|Preflight safety|Configure an eligible|Invalid |Missing |Paid options)/.test(error.message)?error.message:'Preflight failed';
 console.error(JSON.stringify({error:message,...(error.report?{report:error.report}:{})},null,2));process.exitCode=1;
}
