import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {claimEvidenceFile} from '../src/runtime/exclusive-evidence.mjs';

test('campaign evidence path is exclusive and retained content cannot be overwritten by a rerun',async t=>{
 const d=await mkdtemp(join(tmpdir(),'receiptlab-evidence-'));t.after(()=>rm(d,{recursive:true,force:true}));const path=join(d,'outcome.json');
 const claim=await claimEvidenceFile(path);await claim.write('first\n');await assert.rejects(claimEvidenceFile(path),/EEXIST/);await claim.write('final\n');await claim.close();
 assert.equal(await readFile(path,'utf8'),'final\n');await assert.rejects(claimEvidenceFile(path),/EEXIST/);assert.equal(await readFile(path,'utf8'),'final\n');
});

test('paid campaign entrypoint refuses an unrelated working directory before creating evidence',async t=>{
 for(const [name,args] of [['judge-safety-campaign.mjs',['--approval','missing.json']],['workbench-judge.mjs',['--config','missing.json']]]){
  const d=await mkdtemp(join(tmpdir(),'receiptlab-cwd-'));t.after(()=>rm(d,{recursive:true,force:true}));const script=resolve('scripts',name);
  const result=spawnSync(process.execPath,[script,...args],{cwd:d,encoding:'utf8'});
  assert.equal(result.status,1,`${name} exit`);assert.match(result.stderr,/repository root only/,name);assert.deepEqual(await readdir(d),[],name);
 }
});
