import test from 'node:test';import assert from 'node:assert/strict';import {captureTarget} from '../src/runtime/capture-target.mjs';
test('capture target permits only exact loopback and pins a private TLS certificate explicitly',()=>{
 assert.equal(captureTarget(['--origin','http://127.0.0.1:3181']).origin,'http://127.0.0.1:3181');const pin='a'.repeat(43)+'=';assert.deepEqual(captureTarget(['--origin','https://127.0.0.1:9443','--tls-spki',pin]),{origin:'https://127.0.0.1:9443',spkiPin:pin});
 for(const args of [['--origin','https://127.0.0.1:9443'],['--origin','http://127.0.0.1:3181','--tls-spki',pin],['--origin','https://attacker.invalid','--tls-spki',pin],['--origin','http://127.0.0.1:3181/path']])assert.throws(()=>captureTarget(args));
});
