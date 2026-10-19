import {readFile,realpath} from 'node:fs/promises';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createProvenance} from '../src/provenance.mjs';import {scenarios} from '../src/scenarios.mjs';import {servicePaths} from '../src/runtime/campaign-paths.mjs';import {openJudgeBudget} from '../src/runtime/judge-budget.mjs';import {createJudgeController} from '../src/runtime/judge-policy.mjs';import {createWorkbench} from '../src/workbench/server.mjs';import {checkCatalog} from '../src/catalog.mjs';
const args=process.argv.slice(2);let server,controller;
const repositoryRoot=await realpath(fileURLToPath(new URL('../',import.meta.url)));if(await realpath(process.cwd())!==repositoryRoot)throw Error('Run judge from this repository root only');
const scope=['grant-transient','workshop-false-success'],suiteSha256=createHash('sha256').update(JSON.stringify(scenarios.filter(s=>scope.includes(s.id)))).digest('hex');
if(!args.length)console.log(JSON.stringify({mode:'plan-only',modelRequests:0,expiresAt:'2026-12-15T20:00:00Z',maxRequests:100,dailyRequests:20,sessionRequests:2,maxEnvelopeUsd:.5,suiteSha256,judgeAccess:'Protected RECEIPTLAB_JUDGE_CODE required; never logged or browser-persisted',history:'Existing canonical ledger mandatory; one envelope remains reserved across restarts; no concurrent engineering campaign',publicDeployment:false},null,2));
else try{
 if(args.length!==2||args[0]!=='--config')throw Error('Explicit source-pinned judge configuration required');
 const plan=JSON.parse(await readFile(args[1],'utf8')),p=await createProvenance();
 if(plan.approved!==true||plan.authorizationSource!=='https://github.com/Pavithran-R-A/neb-hackath/pull/2#issuecomment-6235724302'||plan.sourceCommit!==p.sourceCommit||plan.runtimeSha256!==p.runtimeSha256||(p.codeTreeDirty!==false&&p.runtimeMatchesBuild!==true)||plan.suiteSha256!==suiteSha256||plan.model!==process.env.NEBIUS_MODEL)throw Error('Judge source/suite/model/standing authorization mismatch');
 const stateDirectory=process.env.RECEIPTLAB_STATE_DIRECTORY,canonicalOrigin=process.env.RECEIPTLAB_CANONICAL_ORIGIN,paths=await servicePaths({publicMode:true,stateDirectory});
 const budget=await openJudgeBudget({directory:resolve(paths.budgetDirectory,'judge'),accountDirectory:paths.accountDirectory,plan,accessCode:process.env.RECEIPTLAB_JUDGE_CODE});
 controller=createJudgeController({budget,apiKey:process.env.NEBIUS_API_KEY,model:process.env.NEBIUS_MODEL,checkPrices:checkCatalog});controller.durableBudgetDirectory=paths.budgetDirectory;
 server=await createWorkbench({publicMode:true,stateDirectory,canonicalOrigin,diagnosticBudgetDirectory:paths.budgetDirectory,port:Number(process.env.PORT??3000),judgeOperating:controller,allowedDiagnosticScenarios:scope});
 console.log(JSON.stringify({mode:'bounded-judge',sourceCommit:p.sourceCommit,expiresAt:plan.expiresAt,modelRequestsOnStartup:0,budget:budget.summary(),publicDeployment:false}));
 let ending=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(ending)return;ending=true;await server.close();controller.close();process.exit(0);});
}catch{if(server)await server.close();controller?.close();console.error('Judge startup failed closed; preserve account reservation and retained databases for review. No automatic retry.');process.exitCode=1;}
