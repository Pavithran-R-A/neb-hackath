import { clickAndSettle } from './browser.mjs';
// Deliberately simple fixed-label browser baseline; no model and no adaptive retries.
export async function runBaseline(page,task){
 let steps=0;
 try{
  await page.getByLabel('Full name',{exact:true}).fill(task.name);steps++;
  await page.getByLabel('Email',{exact:true}).fill(task.email);steps++;
  await page.getByLabel('Telephone',{exact:true}).fill(task.phone);steps++;
  await clickAndSettle(page,page.getByRole('button',{name:'Next',exact:true}));steps++;
  if(task.flow==='grant')await page.getByLabel('Project title',{exact:true}).fill(task.detail);
  else await page.getByLabel('Workshop session',{exact:true}).selectOption(task.detail);
  steps++;await clickAndSettle(page,page.getByRole('button',{name:'Next',exact:true}));steps++;
  await page.getByLabel('I consent to this fictional application',{exact:true}).check();steps++;
  await clickAndSettle(page,page.getByRole('button',{name:'Submit application',exact:true}));steps++;
  return {claimedCompletion:await page.getByRole('heading',{name:'Application received',exact:true}).count()>0,steps,blockedActions:0,inappropriateActionsExecuted:null,errors:[]};
 }catch{return {claimedCompletion:false,steps,blockedActions:0,inappropriateActionsExecuted:null,errors:['Fixed-label workflow could not proceed']};}
}
