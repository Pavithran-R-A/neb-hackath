// Read-only catalog metadata; no inference endpoint is called and no model/key value is returned.
export async function checkCatalog({apiKey=process.env.NEBIUS_API_KEY,model=process.env.NEBIUS_MODEL,fetchImpl=fetch}={}){
 if(!apiKey||typeof model!=='string'||!/^nvidia\/[^\s]*nemotron[^\s]*$/i.test(model))throw new Error('Catalog credential/model prerequisites missing');
 let response;
 try{response=await fetchImpl('https://api.tokenfactory.nebius.com/v1/models?verbose=true',{method:'GET',headers:{Authorization:`Bearer ${apiKey}`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(30000)});}catch{throw new Error('Catalog transport failed');}
 if(response.status!==200){try{await response.body?.cancel();}catch{}throw new Error(`Catalog HTTP ${response.status}`);}
 let data;try{data=await response.json();}catch{throw new Error('Catalog JSON invalid');}
 const found=Array.isArray(data?.data)?data.data.filter(m=>m?.id===model):[];
 if(found.length!==1)throw new Error('Configured model absent or ambiguous in current catalog');
 const p=found[0].pricing;
 if(!p||typeof p.prompt!=='string'||typeof p.completion!=='string'||![p.prompt,p.completion].every(v=>v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>0))throw new Error('Catalog token prices missing/invalid');
 for(const name of ['request','image','price_per_video_second','price_per_minute'])if(p[name]!=null&&Number(p[name])!==0)throw new Error('Catalog contains unsupported non-token charges');
 const inputUsdPerMillion=Number((Number(p.prompt)*1e6).toPrecision(12)),outputUsdPerMillion=Number((Number(p.completion)*1e6).toPrecision(12));
 return {checkedAt:new Date().toISOString(),source:'https://api.tokenfactory.nebius.com/v1/models?verbose=true',configuredModelFound:true,inputUsdPerMillion,outputUsdPerMillion,currency:'USD',rateBasis:'catalog per-token prompt/completion rates multiplied by 1,000,000; current account catalog, not a billing statement',inferenceRequests:0};
}
