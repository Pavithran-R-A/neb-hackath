import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
// Official Miniflare5 migration adapter, with an explicit complete ESM manifest.
export function createRuntime(options){
 const {scriptPath,modulesRules,fetchMock,d1Persist,...rest}=options;
 const paths=[scriptPath,...readdirSync('workers').filter(p=>p.endsWith('.mjs')&&'workers/'+p!==scriptPath).map(p=>'workers/'+p),'src/scenarios.mjs'];
 return new Miniflare(convertV4MiniflareOptions({...rest,...(d1Persist?{resourcePersistencePath:d1Persist}:{}),modules:paths.map(path=>({type:'ESModule',path})),outboundService:request=>fetchMock?fetchMock.fetch(request):Promise.reject(Error('Unexpected network access denied in local fixture'))}));
}
// Every mocked request goes through workerd's real outbound fetch service. All
// unlisted requests are denied; this helper never forwards to the real network.
export function createProviderMock(){
 const handlers=[];return {disableNetConnect(){},get(origin){return {intercept({path,method}){return {reply(status,body){const h={origin,path,method,status,body,left:1};handlers.push(h);return {times(n){h.left=n;return this}}}}}}},async fetch(request){const url=new URL(request.url),h=handlers.find(h=>h.left>0&&h.origin===url.origin&&h.path===url.pathname&&h.method===request.method);assert.ok(h,'Unexpected outbound request denied');h.left--;return new Response(typeof h.body==='string'?h.body:JSON.stringify(h.body),{status:h.status,headers:{'content-type':'application/json'}})},assertNoPendingInterceptors(){assert.equal(handlers.reduce((sum,h)=>sum+h.left,0),0)}};
}
