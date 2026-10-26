import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('Render judge entry point accepts only explicit plan sources and fails closed without a network call',()=>{
 const plan=spawnSync(process.execPath,['scripts/workbench-judge.mjs'],{encoding:'utf8'});assert.equal(plan.status,0,plan.stderr);assert.match(plan.stdout,/"modelRequests": 0/);const pins=JSON.parse(plan.stdout);assert.match(pins.runtimeSha256,/^[a-f0-9]{64}$/);assert.match(pins.accountHistoryBaseSha256,/^[a-f0-9]{64}$/);assert.equal(pins.publicDeployment,false);
 const configured=spawnSync(process.execPath,['scripts/workbench-judge.mjs','--config-env'],{encoding:'utf8',env:{...process.env,RECEIPTLAB_JUDGE_CONFIG_JSON:'{}'}});
 assert.equal(configured.status,1);assert.match(configured.stderr,/startup failed closed/);assert.doesNotMatch(configured.stdout+configured.stderr,/SIMULATED-ONLY|Bearer\s|api\.tokenfactory/i);
});
