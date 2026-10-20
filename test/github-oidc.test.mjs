import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign} from 'node:crypto';
import {verifyGitHubOidc} from '../workers/github-oidc.mjs';
import {createRuntime} from '../scripts/workers-runtime.mjs';
import {readFile} from 'node:fs/promises';
import {runExperiment} from '../scripts/cloudflare-experiment-client.mjs';

const {privateKey, publicKey} = generateKeyPairSync('rsa', {modulusLength: 2048});
const jwk = {...publicKey.export({format: 'jwk'}), kid: 'test-key', alg: 'RS256', use: 'sig'};
const now = 1_900_000_000;
const expected = {
  audience: 'receiptlab-cloudflare-experiment',
  repository: 'Pavithran-R-A/neb-hackath',
  repositoryId: '1422019854',
  ownerId: '92867708',
  ref: 'refs/pull/2/merge',
  headRef: 'feat/phase1-verified-completion',
  baseRef: 'main',
  workflowPath: 'Pavithran-R-A/neb-hackath/.github/workflows/cloudflare-experiment.yml',
  now,
  fetchImpl: async url => {
    assert.equal(url, 'https://token.actions.githubusercontent.com/.well-known/jwks');
    return Response.json({keys: [jwk]});
  },
};

function token(overrides = {}, key = privateKey, issuedAt = now) {
  const header = {alg: 'RS256', kid: 'test-key', typ: 'JWT'};
  const claims = {
    iss: 'https://token.actions.githubusercontent.com',
    aud: expected.audience,
    sub: `repo:Pavithran-R-A@${expected.ownerId}/neb-hackath@${expected.repositoryId}:pull_request`,
    repository: expected.repository,
    repository_id: expected.repositoryId,
    ref: expected.ref,
    head_ref: expected.headRef,
    base_ref: expected.baseRef,
    workflow_ref: `${expected.workflowPath}@refs/pull/2/merge`,
    event_name: 'pull_request',
    iat: issuedAt - 5,
    nbf: issuedAt - 5,
    exp: issuedAt + 240,
    ...overrides,
  };
  const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const input = `${enc(header)}.${enc(claims)}`;
  return `${input}.${sign('RSA-SHA256', Buffer.from(input), key).toString('base64url')}`;
}

test('accepts only a correctly signed, short-lived token for this repo, branch and workflow', async () => {
  assert.deepEqual(await verifyGitHubOidc(token(), expected), {repository: expected.repository, ref: expected.ref});
});

test('rejects invalid signature, wrong audience/repository/branch/workflow, and expired or future tokens', async () => {
  const {privateKey: otherKey} = generateKeyPairSync('rsa', {modulusLength: 2048});
  const invalid = [
    token({aud: 'another-audience'}),
    token({repository: 'someone-else/project'}),
    token({repository_id: '1'}),
    token({sub: `repo:${expected.repository}:pull_request`}),
    token({sub: `repo:Pavithran-R-A@999/neb-hackath@${expected.repositoryId}:pull_request`}),
    token({ref: 'refs/pull/3/merge'}),
    token({head_ref: 'main'}),
    token({base_ref: 'release'}),
    token({workflow_ref: `${expected.repository}/.github/workflows/ci.yml@refs/pull/2/merge`}),
    token({exp: now - 1}),
    token({nbf: now + 61}),
    token({iat: now + 61}),
    token({exp: now + 1200}),
    token({}, otherKey),
  ];
  for (const candidate of invalid) await assert.rejects(verifyGitHubOidc(candidate, expected));
});

test('rejects malformed, oversized, missing and multi-audience tokens', async () => {
  for (const candidate of ['', 'not-a-jwt', 'a.b.c', 'x'.repeat(8193)]) {
    await assert.rejects(verifyGitHubOidc(candidate, expected));
  }
  await assert.rejects(verifyGitHubOidc(token({aud: [expected.audience, 'extra']}), expected));
});

test('Worker rejects unauthenticated HTTPS requests before serving any route', async t => {
  const runtime = createRuntime({
    modules: true,
    scriptPath: 'workers/index.mjs',
    modulesRules: [{type: 'ESModule', include: ['**/*.mjs']}],
    compatibilityDate: '2026-08-06',
    d1Databases: ['DB'],
    fetchMock: {async fetch(request) {
      assert.equal(request.url, 'https://token.actions.githubusercontent.com/.well-known/jwks');
      return Response.json({keys: [jwk]});
    }},
    bindings: {
      RECEIPT_KEY: 'synthetic-oidc-test-receipt-key-at-least-32-characters',
      INFERENCE_ENABLED: 'false',
      EXPERIMENT_AUTH_REQUIRED: 'true',
      GITHUB_OIDC_AUDIENCE: expected.audience,
      GITHUB_REPOSITORY: expected.repository,
      GITHUB_REPOSITORY_ID: expected.repositoryId,
      GITHUB_OWNER_ID: expected.ownerId,
      GITHUB_REF: expected.ref,
      GITHUB_HEAD_REF: expected.headRef,
      GITHUB_BASE_REF: expected.baseRef,
      GITHUB_WORKFLOW_PATH: expected.workflowPath,
    },
  });
  t.after(() => runtime.dispose());
  await (await runtime.getD1Database('DB')).exec(await readFile(new URL('../workers/schema.sql', import.meta.url), 'utf8'));
  const unauthorized = await runtime.dispatchFetch('https://experiment.example.workers.dev/');
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).error, 'GitHub Actions identity required');
  const expired = await runtime.dispatchFetch('https://experiment.example.workers.dev/', {headers: {authorization: `Bearer ${token({exp: now - 1})}`}});
  assert.equal(expired.status, 401);
  const authorized = await runtime.dispatchFetch('https://experiment.example.workers.dev/', {headers: {authorization: `Bearer ${token({}, privateKey, Math.floor(Date.now() / 1000))}`}});
  assert.equal(authorized.status, 200);
  assert.match(authorized.headers.get('content-security-policy'), /default-src 'none'/);
});

test('bounded external-client journey proves persistence, receipt, replay guard and false-success rejection', async t => {
  const runtime = createRuntime({
    modules: true,
    scriptPath: 'workers/index.mjs',
    modulesRules: [{type: 'ESModule', include: ['**/*.mjs']}],
    compatibilityDate: '2026-08-06',
    d1Databases: ['DB'],
    fetchMock: {async fetch() { return Response.json({keys: [jwk]}); }},
    bindings: {
      RECEIPT_KEY: 'synthetic-oidc-test-receipt-key-at-least-32-characters',
      INFERENCE_ENABLED: 'false',
      EXPERIMENT_AUTH_REQUIRED: 'true',
      GITHUB_OIDC_AUDIENCE: expected.audience,
      GITHUB_REPOSITORY: expected.repository,
      GITHUB_REPOSITORY_ID: expected.repositoryId,
      GITHUB_OWNER_ID: expected.ownerId,
      GITHUB_REF: expected.ref,
      GITHUB_HEAD_REF: expected.headRef,
      GITHUB_BASE_REF: expected.baseRef,
      GITHUB_WORKFLOW_PATH: expected.workflowPath,
    },
  });
  t.after(() => runtime.dispose());
  await (await runtime.getD1Database('DB')).exec(await readFile(new URL('../workers/schema.sql', import.meta.url), 'utf8'));
  const result = await runExperiment({
    origin: 'https://experiment.example.workers.dev',
    bearer: token({}, privateKey, Math.floor(Date.now() / 1000)),
    fetchImpl: (url, init) => runtime.dispatchFetch(url.href, init),
  });
  assert.equal(result.result, 'PASS');
  assert.match(result.positiveRecovery, /signed receipt/);
  assert.equal(result.approvalReplay, 'rejected');
  assert.equal(result.misleadingSuccess, 'completion rejected; diagnosis abstained; approval rejected');
  assert.equal(result.inferenceRequests, 0);
  assert.ok(result.requests <= 40);
});
