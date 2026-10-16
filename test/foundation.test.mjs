import test from 'node:test';
import assert from 'node:assert/strict';

test('the initial cloud-only test harness runs', () => {
  assert.equal(typeof process.version, 'string');
  assert.match(process.version, /^v[0-9]+/);
});

test('the foundation smoke test does not need live API access', () => {
  assert.equal(1 + 1, 2);
});
