import {readFile,realpath} from 'node:fs/promises';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createProvenance} from '../src/provenance.mjs';import {scenarios} from '../src/scenarios.mjs';import {openPostgresJudgeBudget} from '../src/runtime/postgres-judge-budget.mjs';import {createPostgresPool,POSTGRES_STATE_NAMESPACE} from '../src/runtime/postgres-state.mjs';import {createJudgeController} from '../src/runtime/judge-policy.mjs';import {createWorkbench} from '../src/workbench/server.mjs';import {checkCatalog} from '../src/catalog.mjs';import {JUDGE_ACCESS_END} from '../src/runtime/judge-window.mjs';
const args=process.argv.slice(2);let server,controller,pool;
const repositoryRoot=await realpath(fileURLToPath(new URL('../',import.meta.url)));if(await realpath(process.cwd())!==repositoryRoot)throw Error('Run judge from this repository root only');
const scope=['grant-transient','workshop-false-success'],suiteSha256=createHash('sha256').update(JSON.stringify(scenarios.filter(s=>scope.includes(s.id)))).digest('hex');
if(!args.length){
 const provenance=await createProvenance(),accountHistoryBase=await readFile(new URL('../workers/account-history.jsonl',import.meta.url),'utf8');
 console.log(JSON.stringify({mode:'plan-only',modelRequests:0,expiresAt:JUDGE_ACCESS_END,maxRequests:100,dailyRequests:20,sessionRequests:2,maxEnvelopeUsd:.5,sourceCommit:provenance.sourceCommit,runtimeSha256:provenance.runtimeSha256,codeTreeDirty:provenance.codeTreeDirty,suiteSha256,accountHistoryBaseSha256:createHash('sha256').update(accountHistoryBase).digest('hex'),judgeAccess:'Protected RECEIPTLAB_JUDGE_CODE required; never logged or browser-persisted',history:'Source-hash-pinned canonical ledger; one envelope remains reserved across restarts; no concurrent engineering campaign',publicDeployment:false},null,2));
}
else try{
 let plan;
 if(args.length===1&&args[0]==='--config-env')plan=JSON.parse(process.env.RECEIPTLAB_JUDGE_CONFIG_JSON??'null');
 else if(args.length===2&&args[0]==='--config')plan=JSON.parse(await readFile(args[1],'utf8'));
 else throw Error('Explicit source-pinned judge configuration required');
 const p=await createProvenance();
 if(plan.approved!==true||plan.authorizationSource!=='https://github.com/Pavithran-R-A/neb-hackath/pull/2#issuecomment-6235724302'||plan.sourceCommit!==p.sourceCommit||plan.runtimeSha256!==p.runtimeSha256||(p.codeTreeDirty!==false&&p.runtimeMatchesBuild!==true)||plan.suiteSha256!==suiteSha256||plan.model!==process.env.NEBIUS_MODEL)throw Error('Judge source/suite/model/standing authorization mismatch');
 const databaseUrl=process.env.DATABASE_URL,accessCode=process.env.RECEIPTLAB_JUDGE_CODE;
 const accountHistoryBase=await readFile(new URL('../workers/account-history.jsonl',import.meta.url),'utf8');
 const accountHistoryBaseSha256=createHash('sha256').update(accountHistoryBase).digest('hex');
 if(plan.accountHistoryBaseSha256!==accountHistoryBaseSha256)throw Error('Canonical account-history source pin mismatch');
 const reservation={event:'reserved',campaignId:plan.id,maxReservedUsd:plan.spendLimitUsd,purpose:'Bounded hosted judge inference envelope; unknown usage is retained and halts admission',sourceCommit:plan.sourceCommit,suiteSha256:plan.suiteSha256};
 const accountHistory=accountHistoryBase+JSON.stringify(reservation)+'\n';
 const deployedOrigin=process.env.RECEIPTLAB_CANONICAL_ORIGIN??process.env.RENDER_EXTERNAL_URL;
 let canonicalOrigin;try{const u=new URL(deployedOrigin);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash||(!process.env.RECEIPTLAB_CANONICAL_ORIGIN&&!u.hostname.endsWith('.onrender.com')))throw Error();canonicalOrigin=u.origin;}catch{throw Error('An explicit HTTPS Render origin is required');}
 if(!databaseUrl||!canonicalOrigin)throw Error('Protected PostgreSQL judge configuration is incomplete');
 pool=createPostgresPool(databaseUrl);
 const budget=await openPostgresJudgeBudget({pool,namespace:'receiptlab-judge',plan,accessCode,accountHistory});
 controller=createJudgeController({budget,apiKey:process.env.NEBIUS_API_KEY,model:process.env.NEBIUS_MODEL,checkPrices:checkCatalog});
 server=await createWorkbench({publicMode:true,databaseUrl,postgresPool:pool,postgresNamespace:POSTGRES_STATE_NAMESPACE,canonicalOrigin,renderProxy:process.env.RECEIPTLAB_RENDER_PROXY==='true',port:Number(process.env.PORT??3000),judgeOperating:controller,allowedDiagnosticScenarios:scope});
 console.log(JSON.stringify({mode:'bounded-judge',storage:'neon-postgresql',inferenceEnabled:true,sourceCommit:p.sourceCommit,expiresAt:plan.expiresAt,modelRequestsOnStartup:0,budget:await budget.summary()}));
 let ending=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(ending)return;ending=true;await server.close();await controller.close();await pool.end();process.exit(0);});
}catch{if(server)await server.close();await controller?.close();await pool?.end();console.error('Judge startup failed closed; preserve account reservation and retained databases for review. No automatic retry.');process.exitCode=1;}
