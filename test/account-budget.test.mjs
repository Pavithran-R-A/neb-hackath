import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {reserveAccountBudget} from '../src/account-budget.mjs';
test('cumulative account ledger preserves reserve, denies reuse and locks replicas',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'neb-account-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const args={directory:dir,campaignId:'test-1',maxReservedUsd:.05,purpose:'unit fixture',sourceCommit:'a'.repeat(40),suiteSha256:'b'.repeat(64)};
 const first=await reserveAccountBudget(args);await assert.rejects(()=>reserveAccountBudget({...args,campaignId:'test-2'}),/locked/);
 await first.settle({knownCostUsd:.001,usageComplete:true,requests:1});
 await assert.rejects(()=>reserveAccountBudget(args),/consumed/);
 const next=await reserveAccountBudget({...args,campaignId:'test-2'});assert.ok(next.summary().engineeringCommittedUsd>=.001);await next.settle({knownCostUsd:null,usageComplete:false,requests:1});
 const after=await reserveAccountBudget({...args,campaignId:'test-3'});assert.ok(after.summary().engineeringCommittedUsd>=.051);await after.settle({knownCostUsd:0,usageComplete:true,requests:0});
 await assert.rejects(()=>reserveAccountBudget({...args,campaignId:'too-big',maxReservedUsd:9.01}),/reserve/);
});
