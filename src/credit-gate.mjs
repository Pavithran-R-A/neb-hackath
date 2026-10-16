// Manual billing evidence is an owner attestation, not an independently verified provider balance.
// Raw financial amounts stay in the local input and are omitted from public execution reports.
export function validateCreditEvidence(evidence,{spendLimitUsd,now=Date.now()}={}){
 const deny=()=>{throw new Error('Credit-only billing condition is unverified, stale or insufficient; no inference permitted');};
 if(!evidence||!['owner-confirmed-billing-ui','read-only-billing-api'].includes(evidence.source))return deny();
 const checkedAt=Date.parse(evidence.checkedAt);
 if(!Number.isFinite(now)||!Number.isFinite(checkedAt)||checkedAt>now+30000||now-checkedAt>15*60000)return deny();
 if(!Number.isFinite(spendLimitUsd)||spendLimitUsd<=0||!Number.isFinite(evidence.availableCreditUsd)||evidence.availableCreditUsd<=spendLimitUsd)return deny();
 if(evidence.automaticChargingDisabled!==true||evidence.automaticTopupsDisabled!==true)return deny();
 if(evidence.expiresAt!==null){const expiry=Date.parse(evidence.expiresAt);if(!Number.isFinite(expiry)||expiry<=now+60000)return deny();}
 return {creditOnlyVerified:true,source:evidence.source,checkedAt:new Date(checkedAt).toISOString(),coversAuthorizedLimit:true,automaticChargingDisabled:true,automaticTopupsDisabled:true};
}
