import {createWorkbench} from '../src/workbench/server.mjs';
import {POSTGRES_STATE_NAMESPACE} from '../src/runtime/postgres-state.mjs';
// This entrypoint never enables inference. A separately reviewed bounded runner must
// supply a durable policy; merely setting a provider credential does not activate it.
const server=await createWorkbench({
 port:Number(process.env.PORT??3000),publicMode:true,
 canonicalOrigin:process.env.RECEIPTLAB_CANONICAL_ORIGIN,
 stateDirectory:process.env.RECEIPTLAB_STATE_DIRECTORY,
 databaseUrl:process.env.DATABASE_URL,
 postgresNamespace:POSTGRES_STATE_NAMESPACE,
 renderProxy:process.env.RECEIPTLAB_RENDER_PROXY==='true'
});
console.log(JSON.stringify({status:'ReceiptLab started',storage:process.env.DATABASE_URL?'postgresql':'sqlite',liveInferenceEnabled:false,publicInferenceEndpoint:false}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
