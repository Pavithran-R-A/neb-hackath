const audience = 'receiptlab-cloudflare-experiment';
async function issueToken() {
  const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  url.searchParams.set('audience', audience);
  const response = await fetch(url, {headers: {authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`}, redirect: 'error', signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error(`GitHub OIDC token request failed (${response.status})`);
  const body = await response.json();
  if (typeof body.value !== 'string' || body.value.length < 100 || body.value.length > 8192) throw new Error('GitHub OIDC token response invalid');
  return body.value;
}

export async function runExperiment({origin: originValue, bearer, fetchImpl = fetch}) {
const origin = new URL(originValue);
if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.workers.dev') || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Experiment URL must be an HTTPS workers.dev origin');
if (typeof bearer !== 'string' || bearer.length < 100 || bearer.length > 8192) throw new Error('GitHub OIDC bearer token is invalid');
let requestCount = 0;
async function call(path, {method = 'GET', body, cookie} = {}) {
  requestCount++;
  if (requestCount > 40) throw new Error('Experiment request cap exceeded');
  const headers = {authorization: `Bearer ${bearer}`};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) {
    headers.origin = origin.origin;
    headers['content-type'] = 'application/json';
  }
  const response = await fetchImpl(new URL(path, origin), {method, headers, ...(body === undefined ? {} : {body: JSON.stringify(body)}), redirect: 'manual', signal: AbortSignal.timeout(15000)});
  if (response.status >= 300 && response.status < 400) throw new Error('Experiment endpoint redirected unexpectedly');
  let data;
  try { data = await response.json(); } catch { throw new Error(`Experiment response was not JSON (${response.status})`); }
  return {response, data};
}

async function openSession() {
  const {response, data} = await call('/api/session', {method: 'POST', body: {}});
  if (response.status !== 201 || data.session !== true) throw new Error('Synthetic session creation failed');
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  if (!cookie?.startsWith('receiptlab=')) throw new Error('Session cookie missing');
  return cookie;
}

async function createRun(cookie, scenarioId) {
  const {response, data} = await call('/api/runs', {method: 'POST', cookie, body: {scenarioId}});
  if (response.status !== 201 || typeof data.id !== 'string' || !data.task) throw new Error(`Scenario ${scenarioId} creation failed`);
  return data;
}

async function submitSteps(cookie, run, expectError) {
  for (let step = 0; step < 3; step++) {
    const {response, data} = await call(`/api/runs/${run.id}/step`, {method: 'POST', cookie, body: {step, values: run.task}});
    if (step === 2 && expectError) {
      if (response.status !== 503 || data.error !== 'temporary_failure') throw new Error('Expected synthetic transient failure was not observed');
    } else if (response.status !== 200) throw new Error(`Synthetic step ${step} failed (${response.status})`);
  }
}

const positiveCookie = await openSession();
const positive = await createRun(positiveCookie, 'grant-transient');
await submitSteps(positiveCookie, positive, true);
const before = await call(`/api/runs/${positive.id}/verify`, {cookie: positiveCookie});
if (before.response.status !== 200 || before.data.completed !== false) throw new Error('Verifier did not report the interrupted application as incomplete');
const diagnosis = await call(`/api/runs/${positive.id}/diagnose`, {method: 'POST', cookie: positiveCookie, body: {mode: 'deterministic'}});
if (diagnosis.response.status !== 200 || diagnosis.data.recoveryExecutable !== true || diagnosis.data.suggestion.recovery.action !== 'retry') throw new Error('Safe synthetic recovery was not supported by the local diagnostic baseline');
const approval = await call(`/api/runs/${positive.id}/approve`, {method: 'POST', cookie: positiveCookie, body: {diagnosisId: diagnosis.data.id, traceDigest: diagnosis.data.traceDigest, approved: true}});
if (approval.response.status !== 201) throw new Error('Explicit approval was not issued');
const recovered = await call(`/api/runs/${positive.id}/recover`, {method: 'POST', cookie: positiveCookie, body: {diagnosisId: diagnosis.data.id, traceDigest: diagnosis.data.traceDigest, approvalId: approval.data.id}});
if (recovered.response.status !== 200 || recovered.data.verification?.completed !== true) throw new Error('Independent signed receipt did not prove the approved recovery');
const replay = await call(`/api/runs/${positive.id}/recover`, {method: 'POST', cookie: positiveCookie, body: {diagnosisId: diagnosis.data.id, traceDigest: diagnosis.data.traceDigest, approvalId: approval.data.id}});
if (replay.response.status !== 409) throw new Error('Consumed approval was not rejected on replay');

const negativeCookie = await openSession();
const foreignRead = await call(`/api/runs/${positive.id}`, {cookie: negativeCookie});
if (foreignRead.response.status !== 404) throw new Error('A separate session could read another session\'s run');
const negative = await createRun(negativeCookie, 'workshop-false-success');
await submitSteps(negativeCookie, negative, false);
const falseSuccess = await call(`/api/runs/${negative.id}/verify`, {cookie: negativeCookie});
if (falseSuccess.response.status !== 200 || falseSuccess.data.completed !== false) throw new Error('Verifier accepted a misleading success claim');
const abstention = await call(`/api/runs/${negative.id}/diagnose`, {method: 'POST', cookie: negativeCookie, body: {mode: 'deterministic'}});
if (abstention.response.status !== 200 || abstention.data.recoveryExecutable !== false || abstention.data.suggestion.recovery.action !== 'stop') throw new Error('Misleading-success scenario did not abstain');
const denied = await call(`/api/runs/${negative.id}/approve`, {method: 'POST', cookie: negativeCookie, body: {diagnosisId: abstention.data.id, traceDigest: abstention.data.traceDigest, approved: true}});
if (denied.response.status !== 409) throw new Error('Misleading-success recovery approval was not rejected');

return {
  result: 'PASS',
  client: 'GitHub Actions OIDC',
  inferenceRequests: 0,
  positiveRecovery: 'approved once; independently verified signed receipt',
  approvalReplay: 'rejected',
  misleadingSuccess: 'completion rejected; diagnosis abstained; approval rejected',
  requests: requestCount,
};
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  if (!process.env.RECEIPTLAB_EXPERIMENT_URL || !process.env.ACTIONS_ID_TOKEN_REQUEST_URL || !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) throw new Error('Experiment URL or GitHub Actions OIDC is unavailable');
  const result = await runExperiment({origin: process.env.RECEIPTLAB_EXPERIMENT_URL, bearer: await issueToken()});
  console.log(JSON.stringify(result));
}
