import { createApp } from '../src/app/server.mjs';
import { scenarios } from '../src/scenarios.mjs';
const app=await createApp({port:Number(process.env.PORT??3000)});
console.log('Synthetic application testbed, listening on loopback only. No live inference.');
for(const scenario of scenarios){const run=app.createRun(scenario);console.log(`${scenario.id}: ${run.url}`);}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();process.exit(0);});
