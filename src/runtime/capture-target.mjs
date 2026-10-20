// Test-only certificate pin exception is limited to a private loopback origin.
export function captureTarget(args){
 if(![2,4].includes(args.length)||args[0]!=='--origin')throw new Error('Explicit loopback origin required');const u=new URL(args[1]);
 if(u.hostname!=='127.0.0.1'||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw new Error('Exact loopback origin required');
 if(u.protocol==='http:'&&args.length===2)return {origin:u.origin};
 if(u.protocol==='https:'&&args.length===4&&args[2]==='--tls-spki'&&/^[A-Za-z0-9+/]{43}=$/.test(args[3]))return {origin:u.origin,spkiPin:args[3]};
 throw new Error('Private HTTPS capture requires an explicit valid certificate SPKI pin');
}
