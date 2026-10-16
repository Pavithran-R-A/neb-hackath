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
   id,tag:el.tagName.toLowerCase(),type:el.type,
   label:[...(el.labels??[])].map(l=>l.textContent.trim()).join(' ') || (el.tagName==='BUTTON'?el.textContent.trim():''),
   placeholder:el.getAttribute('placeholder')??'',value:el.value,checked:el.checked??false,disabled:el.disabled,
   options:el.tagName==='SELECT'?[...el.options].map(o=>o.value):undefined
  }))
 }));
}
export function controlField(c){
 const hint=`${c.label} ${c.placeholder??''}`.toLowerCase();
 if(/full name|legal name/.test(hint))return 'name';
 if(/email|contact address/.test(hint))return 'email';
 if(/telephone|contact number/.test(hint))return 'phone';
 if(/project title|workshop session/.test(hint))return 'detail';
 return null;
}
export function validateAction(action,controls,task){
 if(!action || typeof action!=='object' || Array.isArray(action))throw new Error('Invalid action');
 if(!['fill','click','check','wait','done','abort'].includes(action.type))throw new Error('Action type denied');
 const keys=action.type==='fill'?['type','target','value']:['click','check'].includes(action.type)?['type','target']:['type'];
 if(Object.keys(action).some(k=>!keys.includes(k)))throw new Error('Unexpected action properties');
 if(['done','abort','wait'].includes(action.type))return action;
 if(!Number.isInteger(action.target))throw new Error('Control target must be an observed integer');
 const c=controls.find(c=>c.id===action.target);if(!c || c.disabled)throw new Error('Unknown or disabled control');
 if(action.type==='click' && (c.tag!=='button' || !/^(Next|Submit application)$/.test(c.label)))throw new Error('Click target denied');
 if(action.type==='check' && (c.type!=='checkbox' || !/fictional application/i.test(c.label) || task.consent!==true))throw new Error('Consent target denied');
 if(action.type==='fill'){
  const field=controlField(c);let allowed=field?[task[field]]:[];
  if(field==='phone')allowed.push(task.phone?.replace(/^(\d{3})(\d{3})(\d{4})$/,'$1-$2-$3'));
  if(!['input','select'].includes(c.tag) || ['checkbox','hidden','file','password'].includes(c.type) || typeof action.value!=='string' || !allowed.includes(action.value))throw new Error('Value is not the task data for this field');
  if(c.tag==='select' && !c.options.includes(action.value))throw new Error('Option unavailable');
 }
 return action;
}
export async function clickAndSettle(page,locator){
 const response=page.waitForResponse(r=>r.request().method()==='POST' && new URL(r.url()).pathname.startsWith('/api/runs/'));
 await locator.click();await response;
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
