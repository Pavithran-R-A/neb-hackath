import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {scanText} from '../src/source-safety.mjs';
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const secrets=['NEBIUS_API_KEY','GH_TOKEN','GITHUB_TOKEN'].map(name=>process.env[name]).filter(Boolean),findings=[];
for(const file of files){
 const buffer=await readFile(file);if(buffer.includes(0))continue;
 const result=scanText(buffer.toString('utf8'),secrets);
 if(result.secretMatch||result.privateKeyMarker)findings.push({file,...result});
}
console.log(JSON.stringify({check:'Tracked source exact protected-value/private-key scan; not comprehensive certification',filesChecked:files.length,findings},null,2));
if(findings.length)process.exitCode=1;
