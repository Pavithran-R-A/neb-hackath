import { controlField } from './actions.mjs';
import { observe, clickAndSettle } from './browser.mjs';
// Stronger conventional automation: stable HTML form names, field data, bounded retry.
// No scenario IDs/variants, expected outcomes, model, or evaluator state are available here.
export async function runDomBaseline(page,task,{maxTurns=8}={}){
 let steps=0;
 try{
  for(let turn=0;turn<maxTurns;turn++){
   const o=await observe(page);
   // Only terminal pages without an active form count as raw UI completion.
   if(!o.controls.length)return {claimedCompletion:o.text.includes('Application received'),steps,blockedActions:0,inappropriateActionsExecuted:null,errors:[]};
   if(o.text.includes('valid email address'))break;
   for(const c of o.controls){
    const field=['name','email','phone','detail'].includes(c.name)?c.name:controlField(c);
    const locator=page.locator('main input,main select,main button').nth(c.id);
    if(c.type==='checkbox'&&c.name==='consent'&&task.consent===true){await locator.check();steps++;}
    else if(field&&typeof task[field]==='string'){
     let value=task[field];
     if(field==='phone'&&o.text.includes('XXX-XXX-XXXX'))value=value.replace(/^(\d{3})(\d{3})(\d{4})$/,'$1-$2-$3');
     if(c.tag==='select'){
      if(!c.options.includes(value))return {claimedCompletion:false,steps,blockedActions:0,inappropriateActionsExecuted:null,errors:['Requested option unavailable']};
      await locator.selectOption(value);
     }else await locator.fill(value);
     steps++;
    }
   }
   const button=o.controls.find(c=>c.tag==='button'&&c.type==='submit'&&!c.disabled);
   if(!button)break;
   await clickAndSettle(page,page.locator('main input,main select,main button').nth(button.id));steps++;
  }
 }catch{}
 return {claimedCompletion:false,steps,blockedActions:0,inappropriateActionsExecuted:null,errors:['DOM automation could not finish within its bounded workflow']};
}
