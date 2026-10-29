import { checkCatalog } from '../src/catalog.mjs';
import { preflight } from '../src/preflight.mjs';
try{
 if(process.argv.length>2)throw new Error('Catalog command accepts no inference flags');
 const catalog=await checkCatalog();
 const readiness=await preflight({inputUsdPerMillion:catalog.inputUsdPerMillion,outputUsdPerMillion:catalog.outputUsdPerMillion});
 console.log(JSON.stringify({catalog,readiness},null,2));
}catch(error){console.error(/^(Catalog|Configured model)/.test(error.message)?error.message:'Catalog check failed');process.exitCode=1;}
