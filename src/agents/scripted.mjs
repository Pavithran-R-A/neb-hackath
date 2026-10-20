import { controlField } from './browser.mjs';
// Deterministic engineering control, NOT NVIDIA inference or a learned agent.
export function createScriptedPolicy(){
 return {kind:'scripted-control',async decide({task,observation,history}){
  if(observation.text.includes('Application received'))return {actions:[{type:'done'}]};
  if(observation.text.includes('valid email address'))return {actions:[{type:'abort'}]};
  const actions=[];
  for(const c of observation.controls){
   const field=controlField(c);
   if(field){
    let value=task[field];if(field==='phone' && observation.text.includes('XXX-XXX-XXXX'))value=value.replace(/^(\d{3})(\d{3})(\d{4})$/,'$1-$2-$3');
    actions.push({type:'fill',target:c.id,value});
   }
   if(c.type==='checkbox')actions.push({type:'check',target:c.id});
  }
  const button=observation.controls.find(c=>c.tag==='button');
  if(button)actions.push({type:'click',target:button.id});
  return {actions:actions.length?actions:[{type:'abort'}]};
 }};
}
