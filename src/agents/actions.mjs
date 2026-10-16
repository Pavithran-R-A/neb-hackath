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

export function validateBatch(decision, controls, task) {
 const actions=decision?.actions;
 if(!Array.isArray(actions)||actions.length<1||actions.length>6||Object.keys(decision).some(k=>k!=='actions'))throw new Error('Invalid batch');
 actions.forEach((action,index)=>{
  validateAction(action,controls,task);
  if(['click','done','abort','wait'].includes(action.type)&&index!==actions.length-1)throw new Error('Terminal action must be last');
 });
 return actions;
}
