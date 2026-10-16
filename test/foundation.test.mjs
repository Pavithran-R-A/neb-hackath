import test from 'node:test';
import assert from 'node:assert/strict';

test('the initial cloud-only test harness runs', () => {
  assert.equal(typeof process.version, 'string');
  assert.match(process.version, /^v\\d+/);
});

test('no remote API credentials are required to run foundation tests', () => {
  assert.equal(1 + 1, 2);
});
