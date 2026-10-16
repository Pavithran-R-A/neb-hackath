import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAction, allowedBrowserUrl } from '../src/agents/browser.mjs';
const task={name:'Avery Example',email:'avery@example.invalid',phone:'5550101234',detail:'Morning session',consent:true};
const controls=[{id:0,tag:'input',type:'text',label:'Full name'},{id:1,tag:'button',type:'submit',label:'Next'},{id:2,tag:'input',type:'checkbox',label:'I consent to this fictional application'},{id:3,tag:'input',type:'text',label:'Telephone'}];
test('guard denies invented data, arbitrary selectors, navigation, JS and unknown controls',()=>{
 for(const action of [{type:'goto',url:'https://example.com'},{type:'evaluate',value:'1'},{type:'fill',target:'#name',value:task.name},{type:'click',target:99},{type:'fill',target:0,value:'Invented Person'},{type:'fill',target:0,value:task.email},{type:'check',target:0}])assert.throws(()=>validateAction(action,controls,task));
 assert.doesNotThrow(()=>validateAction({type:'fill',target:0,value:task.name},controls,task));
 assert.doesNotThrow(()=>validateAction({type:'fill',target:3,value:'555-010-1234'},controls,task));
 assert.doesNotThrow(()=>validateAction({type:'click',target:1},controls,task));
 assert.doesNotThrow(()=>validateAction({type:'check',target:2},controls,task));
});
test('URL guard permits only the exact synthetic run and assets, never evaluator endpoints',()=>{
 const run='abc-123',origin='http://127.0.0.1:12345';
 for(const path of ['/form/'+run,'/api/runs/'+run,'/client.js','/style.css'])assert.equal(allowedBrowserUrl(origin+path,origin,run),true);
 for(const url of ['https://example.com','http://127.0.0.1:54321/form/'+run,origin+'/api/runs/other',origin+'/verify',origin+'/health',origin+'/form/'+run+'?evil=1'])assert.equal(allowedBrowserUrl(url,origin,run),false);
});
test('settling a failed click handles a later response-wait rejection',async()=>{
 const { spawnSync }=await import('node:child_process');
 const script=`import {clickAndSettle} from './src/agents/browser.mjs';
 const page={waitForResponse:()=>new Promise((_,reject)=>setTimeout(()=>reject(new Error('response timeout')),20))};
 await clickAndSettle(page,{click:async()=>{throw new Error('click failed');}}).catch(()=>{});
 await new Promise(resolve=>setTimeout(resolve,50));`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:process.cwd(),encoding:'utf8'});
 assert.equal(child.status,0,child.stderr);
});
