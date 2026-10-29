import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync,lstatSync} from 'node:fs';
import {isAbsolute,join,resolve,relative,sep} from 'node:path';
import {randomBytes} from 'node:crypto';

// Trusted operator configuration, never derived from HTTP/forwarded headers.
export function validatePublicConfiguration({publicMode=false,canonicalOrigin,stateDirectory,databaseUrl,diagnosticPolicy,diagnosticBudgetDirectory}={}){
 if(!publicMode)return;
 let url;try{url=new URL(canonicalOrigin);}catch{throw new Error('Public mode requires an explicit canonical HTTPS origin');}
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||url.origin!==canonicalOrigin)throw new Error('Canonical origin must be an exact HTTPS origin');
 if(stateDirectory&&databaseUrl)throw new Error('Public mode must choose one authoritative persistent store');
 if(databaseUrl){let db;try{db=new URL(databaseUrl);}catch{throw new Error('Public mode DATABASE_URL is invalid');}if(!['postgres:','postgresql:'].includes(db.protocol)||!db.hostname||!db.username||!db.password)throw new Error('Public mode DATABASE_URL must be a credentialed PostgreSQL URI');}
 else if(!stateDirectory||!isAbsolute(stateDirectory))throw new Error('Public mode requires an absolute persistent state directory or DATABASE_URL');
 if(diagnosticPolicy){
  if(databaseUrl&&diagnosticPolicy.postgresDurableBudget===true)return;
  const root=resolve(stateDirectory),budget=diagnosticBudgetDirectory&&resolve(diagnosticBudgetDirectory),child=budget&&relative(root,budget);
  if(!budget||!child||child==='..'||child.startsWith('..'+sep)||isAbsolute(child)||diagnosticPolicy.durableBudgetDirectory!==budget)throw new Error('Public inference requires configured durable budget ledgers under the state directory');
 }
}
const encode=value=>JSON.stringify(value,(_key,v)=>v instanceof Map?{$receiptlabMap:[...v]}:v);
const decode=value=>JSON.parse(value,(_key,v)=>v&&Object.keys(v).length===1&&Array.isArray(v.$receiptlabMap)?new Map(v.$receiptlabMap):v);
export function openDurableState(directory){
 mkdirSync(directory,{recursive:true,mode:0o700});
 if(lstatSync(directory).isSymbolicLink()||!lstatSync(directory).isDirectory())throw new Error('Persistent directory must be a real directory');
 chmodSync(directory,0o700);
 for(const file of ['instance.sqlite','runtime.sqlite']){try{if(lstatSync(join(directory,file)).isSymbolicLink())throw new Error('State database symlink denied');}catch(e){if(e.code!=='ENOENT')throw e;}}
 let lease,db;
 try{
  // An OS-released SQLite file lock survives application crashes without a stale PID lease.
  // Use a separate database so state snapshots can commit/fsync while this lock is held.
  lease=new DatabaseSync(join(directory,'instance.sqlite'));lease.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE; CREATE TABLE IF NOT EXISTS lease (id INTEGER PRIMARY KEY);');
  db=new DatabaseSync(join(directory,'runtime.sqlite'));db.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=EXTRA; CREATE TABLE IF NOT EXISTS runtime (id INTEGER PRIMARY KEY CHECK(id=1), snapshot TEXT NOT NULL);');
  chmodSync(join(directory,'instance.sqlite'),0o600);chmodSync(join(directory,'runtime.sqlite'),0o600);
  const saved=db.prepare('SELECT snapshot FROM runtime WHERE id=1').get();
  const state=saved?decode(saved.snapshot):{version:1,key:randomBytes(32).toString('hex'),records:new Map(),sessions:new Map()};
  if(state.version!==1||!/^[a-f0-9]{64}$/.test(state.key)||!(state.records instanceof Map)||!(state.sessions instanceof Map))throw new Error('Persistent runtime state is invalid');
  // In-flight actions are never silently replayed following a crash. Used approvals stay used.
  for(const s of state.sessions.values())for(const r of s.runs.values()){if(r.diagnosing||r.recovering)r.interrupted=true;r.diagnosing=false;r.recovering=false;}
  let failed=false,closed=false;
  const save=()=>{if(failed||closed)throw new Error('Persistent runtime unavailable');try{db.prepare('INSERT INTO runtime(id,snapshot) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot').run(encode(state));}catch(error){failed=true;throw error;}};
  save();
  return {state,save,assertHealthy(){if(failed||closed)throw new Error('Persistent runtime unavailable');},close(){if(closed)return;closed=true;db.close();lease.close();}};
 }catch(error){try{db?.close();}finally{lease?.close();}if(error.code==='ERR_SQLITE_ERROR'&&/locked/.test(error.message))throw new Error('Persistent runtime locked by another active instance');throw error;}
}
