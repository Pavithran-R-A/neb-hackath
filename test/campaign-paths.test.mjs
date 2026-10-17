import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {servicePaths} from '../src/runtime/campaign-paths.mjs';
test('public model paths require an imported cumulative ledger and reject symlinked budgets',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'receiptlab-model-state-'));t.after(()=>rm(dir,{recursive:true,force:true}));await assert.rejects(()=>servicePaths({publicMode:true,stateDirectory:dir}),/ledger/);
 await mkdir(join(dir,'budgets/account'),{recursive:true});await writeFile(join(dir,'budgets/account/account.jsonl'),JSON.stringify({event:'initial',initialAccountUsd:59,judgeReserveUsd:50,initialSpentUsd:.01377006})+'\n');const p=await servicePaths({publicMode:true,stateDirectory:dir});assert.equal(p.accountDirectory,join(dir,'budgets/account'));assert.equal(p.budgetDirectory,join(dir,'budgets'));
 await rm(join(dir,'budgets'),{recursive:true});await mkdir(join(dir,'outside'));await symlink(join(dir,'outside'),join(dir,'budgets'));await assert.rejects(()=>servicePaths({publicMode:true,stateDirectory:dir}),/symlink/);
});
