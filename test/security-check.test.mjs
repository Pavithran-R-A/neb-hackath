import test from 'node:test';
import assert from 'node:assert/strict';
import {scanText} from '../src/source-safety.mjs';
test('source checks flag secret material without returning its value',()=>{
 const token='synthetic-private-value-for-test';
 const result=scanText('Authorization: '+token,[token]);
 assert.equal(result.secretMatch,true);assert.ok(!JSON.stringify(result).includes(token));
 assert.equal(scanText('plain source',[]).secretMatch,false);
 assert.equal(scanText('-----BEGIN '+'PRIVATE KEY-----',[]).privateKeyMarker,true);
});
