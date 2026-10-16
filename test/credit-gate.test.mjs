import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCreditEvidence } from '../src/credit-gate.mjs';
const now=Date.parse('2026-10-16T17:00:00Z');
const evidence={source:'owner-confirmed-billing-ui',checkedAt:new Date(now).toISOString(),availableCreditUsd:10,expiresAt:null,automaticChargingDisabled:true,automaticTopupsDisabled:true};
test('current owner-confirmed credit-only evidence covers the full authorized limit',()=>{
 const result=validateCreditEvidence(evidence,{spendLimitUsd:.5,now});
 assert.equal(result.creditOnlyVerified,true);assert.equal(result.source,evidence.source);
 assert.equal('availableCreditUsd' in result,false);
});
test('unknown, stale, exhausted, expiring or payment-enabled billing evidence stops before inference',()=>{
 for(const e of [null,{}, {...evidence,availableCreditUsd:.5},{...evidence,availableCreditUsd:.1},{...evidence,automaticChargingDisabled:false},{...evidence,automaticTopupsDisabled:undefined},{...evidence,expiresAt:undefined},{...evidence,expiresAt:new Date(now+30000).toISOString()},{...evidence,checkedAt:new Date(now-16*60000).toISOString()},{...evidence,checkedAt:'invalid'},{...evidence,source:'historical-screenshot'}])assert.throws(()=>validateCreditEvidence(e,{spendLimitUsd:.5,now}),/Credit-only/);
});
