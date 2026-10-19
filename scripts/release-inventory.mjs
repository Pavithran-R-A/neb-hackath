import {readFile,lstat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
const digest=createHash('sha256').update(await readFile('package-lock.json')).digest('hex');
const roots=Object.keys(lock.packages[''].devDependencies??{});
const rows=[];
for(const [path,p] of Object.entries(lock.packages).filter(([k])=>k.startsWith('node_modules/')).sort(([a],[b])=>a.localeCompare(b))){
 const local=join(path,'');let installed=false,notices='not found locally';
 try{const s=await lstat(local);installed=s.isDirectory();if(installed){const entries=await import('node:fs/promises').then(fs=>fs.readdir(local));const selected=entries.filter(n=>/^(license|notice|copying|third.party)/i.test(n)).slice(0,5);notices=selected.join(', ')||notices;}}catch{}
 const rel=path.slice('node_modules/'.length),version=p.version??'unknown',relationship=roots.includes(rel)?'direct':'transitive',optional=p.optional?'optional':'required',license=(p.license??'not declared').replaceAll('|','\\|');
 rows.push(`| \`${path}\` | ${version} | ${relationship}; ${optional} | ${license} | ${installed?'yes':'no'} | ${notices} |`);
}
const runtimeStart='## Runtime, browser and media tools';const old=await readFile('docs/release/third-party-inventory.md','utf8');const runtime=old.slice(old.indexOf(runtimeStart));
if(!runtime.startsWith(runtimeStart))throw Error('Existing runtime inventory section required');
const output=`# Third-party inventory — evidence for owner review\n\nThis is an inventory of observed metadata and notices, not legal advice, clearance, a repository license grant, or a claim that distribution obligations have been discharged. No repository LICENSE is created. The [MIT proposal](license-proposal.md) still requires owner approval of rights holder, contributions, assets and eligibility. Regenerate this inventory with \`node scripts/release-inventory.mjs\` if the lockfile or binaries change.\n\n## npm lockfile (all direct and transitive entries)\n\nObserved \`package-lock.json\` SHA256: \`${digest}\`. Lockfile version ${lock.lockfileVersion}; ${rows.length} package entries. Direct declarations: ${roots.map(n=>`\`${n}@${lock.packages['node_modules/'+n]?.version}\``).join(', ')}. \`installed=no\` optional variants are lock entries, not a claim those foreign-platform binaries ran. License fields are copied from lock metadata; inspect actual license/notice and package source before distribution.\n\n| Lock path / identity | Exact version | Relationship | Declared license | Local directory | Local top-level notice files |\n| --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n${runtime}`;
await writeFile('docs/release/third-party-inventory.md',output);
