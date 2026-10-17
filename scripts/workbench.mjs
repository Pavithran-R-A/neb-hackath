import {createWorkbench} from '../src/workbench/server.mjs';
const server=await createWorkbench({port:Number(process.env.PORT??3000)});
console.log('ReceiptLab is listening on loopback only. Synthetic manual workbench; live inference disabled.');
console.log('Health check: GET /health. Session state expires or is cleared on restart.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
