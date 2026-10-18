import { validateAction } from './actions.mjs';
export { controlField, validateAction } from './actions.mjs';
import { chromium } from 'playwright';

export const launchBrowser = () => chromium.launch({headless:true});
export function allowedBrowserUrl(raw,origin,runId){
 try{const u=new URL(raw);return u.origin===origin && !u.search && !u.hash && !u.username && !u.password && [`/form/${runId}`,`/api/runs/${runId}`,'/client.js','/style.css'].includes(u.pathname);}catch{return false;}
}
export async function createBrowserSession(browser,run){
 const origin=new URL(run.url).origin;const blocked=[];
 const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});
 await context.route('**/*',route=>{
  const req=route.request();
  if(allowedBrowserUrl(req.url(),origin,run.id) && ['GET','POST'].includes(req.method()))return route.continue();
  blocked.push({kind:'network',reason:'URL or method outside app allowlist'});return route.abort('blockedbyclient');
 });
 await context.routeWebSocket('**/*',ws=>{blocked.push({kind:'websocket',reason:'WebSocket denied'});ws.close();});
 context.on('page',p=>{p.on('popup',popup=>popup.close());p.on('dialog',dialog=>dialog.dismiss());});
 const page=await context.newPage();page.setDefaultTimeout(1500);
 try{await page.goto(run.url);await page.locator('form').waitFor();}catch(e){await context.close();throw e;}
 return {page,context,blocked};
}
export async function observe(page){
 return page.evaluate(()=>({
  text:document.querySelector('main').innerText.slice(0,6000),
  controls:[...document.querySelectorAll('main input,main select,main button')].map((el,id)=>({
   id,tag:el.tagName.toLowerCase(),type:el.type,name:el.getAttribute('name')??'',field:el.getAttribute('data-task-field')??'',
   label:[...(el.labels??[])].map(l=>l.textContent.trim()).join(' ') || (el.tagName==='BUTTON'?el.textContent.trim():''),
   placeholder:el.getAttribute('placeholder')??'',value:el.value,checked:el.checked??false,disabled:el.disabled,
   options:el.tagName==='SELECT'?[...el.options].map(o=>o.value):undefined
  }))
 }));
}
export async function clickAndSettle(page,locator){
 const form=new URL(page.url()),match=/^(\/forms)?\/form\/([\w-]+)$/.exec(form.pathname);
 if(!match||!['http:','https:'].includes(form.protocol)||form.search||form.hash||form.username||form.password)throw new Error('Expected a run-bound synthetic form URL');
 const endpoint=form.origin+(match[1]??'')+'/api/runs/'+match[2];
 await Promise.all([
  page.waitForResponse(r=>r.request().method()==='POST' && r.url()===endpoint),
  locator.click()
 ]);
 await page.waitForFunction(()=>!document.querySelector('main button')?.disabled);
}
export async function executeAction(page,action,controls,task){
 validateAction(action,controls,task);
 if(action.type==='wait'){await page.waitForTimeout(150);return;}
 if(['done','abort'].includes(action.type))return;
 const locator=page.locator('main input,main select,main button').nth(action.target);
 if(action.type==='fill'){
  if(controls[action.target].tag==='select')await locator.selectOption(action.value);else await locator.fill(action.value);
 }
 if(action.type==='check')await locator.check();
 if(action.type==='click')await clickAndSettle(page,locator);
}
