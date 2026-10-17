// Stop admission synchronously, then wait for already-started policy work. No retry.
export function drainablePolicy(policy){
 const pending=new Set();let closing=false;
 return {
  async diagnose(...args){
   if(closing)throw new Error('Diagnostic service shutting down');
   const work=Promise.resolve().then(()=>policy.diagnose(...args));pending.add(work);
   try{return await work;}finally{pending.delete(work);}
  },
  async drain(){closing=true;await Promise.allSettled([...pending]);},
 };
}
