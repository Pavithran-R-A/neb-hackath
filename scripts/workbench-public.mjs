import {createWorkbench} from '../src/workbench/server.mjs';
// This entrypoint never enables inference. A separately reviewed bounded runner must
// supply a durable policy; merely setting a provider credential does not activate it.
const server=await createWorkbench({
 port:Number(process.env.PORT??3000),publicMode:true,
 canonicalOrigin:process.env.RECEIPTLAB_CANONICAL_ORIGIN,
 stateDirectory:process.env.RECEIPTLAB_STATE_DIRECTORY
});
console.log('ReceiptLab persistent runtime started behind its configured HTTPS gateway; live inference disabled.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
