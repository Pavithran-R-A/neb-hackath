const encoder=new TextEncoder();
export const canonical=p=>JSON.stringify({flow:p.flow,name:p.name?.trim(),email:p.email?.trim().toLowerCase(),phone:p.phone?.replace(/\D/g,''),detail:p.detail?.trim(),consent:p.consent===true});
const hex=b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('');
export const sha=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const key=secret=>crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
const message=r=>encoder.encode(JSON.stringify([r.runId,r.flow,r.digest,r.sequence]));
export async function receipt(runId,payload,secret){const r={runId,flow:payload.flow,digest:await sha(canonical(payload)),sequence:1};return {...r,signature:hex(await crypto.subtle.sign('HMAC',await key(secret),message(r)))};}
export async function verify(state,secret){const r=state.receipt;if(!r||state.status!=='completed'||state.completionCount!==1)return {completed:false,reason:'No unique committed server submission'};
 if(r.runId!==state.id||r.flow!==state.task.flow||r.sequence!==1||r.digest!==await sha(canonical(state.task))||r.digest!==await sha(canonical(state.payload)))return {completed:false,reason:'Receipt/task/state mismatch'};
 if(!/^[0-9a-f]{64}$/.test(r.signature)||!await crypto.subtle.verify('HMAC',await key(secret),Uint8Array.from(r.signature.match(/../g),x=>parseInt(x,16)),message(r)))return {completed:false,reason:'Invalid receipt signature'};
 return {completed:true,reason:'Server submission and signed task receipt verified',receiptId:r.runId+':1',digest:r.digest};}
